-- ============================================================================
-- Oceans Kenya — Row Level Security policies  (audit finding C-1, CRITICAL)
-- ============================================================================
--
-- WHY
--   The browser holds the Supabase anon key (unavoidable for a SPA). In
--   Supabase, RLS *is* the authorization layer. With RLS off, that public key
--   is a full read/write credential to every table — anyone can dump `leads`,
--   `contacts`, `enquiries`, staff attendance and messaging, or rewrite
--   `listings`/`profiles` straight from the browser console.
--
-- STRATEGY (safe by default)
--   The schema is large (90+ tables) and grows with each Readdy export, so this
--   does NOT try to hand-classify every table. Instead:
--     1. A DENY-ALL BASELINE: enable RLS on every table in `public`, and give
--        each a staff-only policy. Anonymous visitors get nothing; the
--        authenticated CRM keeps working. Any table added later is still
--        covered the next time this runs.
--     2. An explicit PUBLIC ALLOW-LIST then opens read access on exactly the
--        content and configuration tables the public website needs.
--     3. `profiles` is handled explicitly, with a trigger blocking role/status
--        self-escalation.
--
--   Public-form writes already go through the crm-ingest edge function
--   (service role, bypasses RLS), so no anonymous INSERT is granted anywhere.
--
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent. Review the
--   PUBLIC ALLOW-LIST arrays below against your data before running, and the
--   REVIEW note for tables whose audience is uncertain.
--
-- ROLE MODEL (public.profiles): user_id -> auth.users.id;
--   role in ('super_admin','admin','editor','agent'); status in ('active','suspended')
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER) — read profiles without RLS recursion
-- ----------------------------------------------------------------------------
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles
  where user_id = auth.uid() and status <> 'suspended' limit 1
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_role() in ('super_admin','admin','editor','agent')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_role() in ('super_admin','admin')
$$;

revoke all on function public.auth_role(), public.is_staff(), public.is_admin() from public;
grant execute on function public.auth_role(), public.is_staff(), public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. DENY-ALL BASELINE
--    Every base table in `public` gets RLS + a staff-only ALL policy. This is
--    the safety net: anything not in the allow-list below ends up staff-only,
--    including tables added by future exports. profiles is skipped here and
--    handled in section 4.
-- ----------------------------------------------------------------------------
-- Tables that must be reachable ONLY by the service role (edge functions),
-- never by any client — not even staff. They get RLS + FORCE but NO policy,
-- so every anon/authenticated query is denied; the service-role key bypasses
-- RLS and keeps the functions working. password_reset_tokens holds reset-token
-- hashes; add other secret/token tables here as they appear.
do $$
declare r record;
  service_only text[] := array['password_reset_tokens'];
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'profiles'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
    execute format('alter table public.%I force row level security;', r.tablename);
    execute format('drop policy if exists %I on public.%I;', 'staff all baseline', r.tablename);
    if not (r.tablename = any(service_only)) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff());',
        'staff all baseline', r.tablename);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. PUBLIC ALLOW-LIST  (adds anonymous SELECT on top of the baseline)
--
--    3a. CONTENT — public may read, staff may write (baseline already grants
--        staff write). blog_posts and agents get filtered reads.
--    3b. CONFIG  — public may read, only admins may write.
--
--    REVIEW: confirm these match your data. Remove any you consider private;
--    add any new public-facing content table a future export introduces.
-- ----------------------------------------------------------------------------

-- 3a. Content tables with an unconditional public read.
do $$
declare t text;
  content_tables text[] := array[
    'listings','all_listings','land_listings','listing_images','unit_types',
    'agents','team_members',
    'neighbourhoods','neighbourhood_images','neighbourhood_faqs',
    'jv_projects','jv_project_images','jv_faqs','jv_opportunities',
    'developments','amenities','amenity_categories',
    'testimonials','homepage_sections'
  ];
begin
  foreach t in array content_tables loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('drop policy if exists %I on public.%I;', t||' public read', t);
      execute format('create policy %I on public.%I for select to anon, authenticated using (true);',
                     t||' public read', t);
    end if;
  end loop;
end $$;

-- blog_posts: public sees published only.
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='blog_posts') then
    execute 'drop policy if exists "blog public read" on public.blog_posts';
    execute 'create policy "blog public read" on public.blog_posts for select to anon, authenticated using (status = ''published'')';
  end if;
end $$;

-- 3b. Configuration/styling tables: public read, admin write.
do $$
declare t text;
  config_tables text[] := array[
    'site_settings','brand_settings','typography_settings','hero_settings',
    'breadcrumb_settings','map_settings','footer_settings','social_links',
    'nav_links','menu_settings','contact_sections','currency_settings',
    'search_filters','property_settings','required_fields','property_page_settings',
    'property_details_layout','property_detail_style','property_cards_style'
  ];
begin
  foreach t in array config_tables loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('drop policy if exists %I on public.%I;', t||' public read', t);
      execute format('drop policy if exists %I on public.%I;', t||' staff all baseline', t);
      execute format('create policy %I on public.%I for select to anon, authenticated using (true);',
                     t||' public read', t);
      execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
                     t||' admin write', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- REVIEW — tables intentionally left STAFF-ONLY by the baseline. Confirm none
-- of these should be publicly readable, and that each should be visible to
-- every staff role (tighten to is_admin() or an ownership column if not):
--   leads, contacts, enquiries, deals, conversations, conversation_messages,
--   activity_logs, analytics_events, notifications, media_library, images,
--   jv_submissions,
--   email_log, email_settings, email_templates, email_template_versions,
--   agent_contacts, agent_database, agent_database_audit,
--   amenity_activity_log, amenity_reviews, amenity_folders, amenity_folder_items,
--   and every og_* table (staff attendance, appointments, messaging, status).
-- The og_* and messaging tables in particular are per-user staff data and may
-- warrant per-row ownership policies rather than blanket staff access.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 4. profiles — explicit
--    own read; staff read all; own update (role/status locked by trigger);
--    admin manage all.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "profiles read own"     on public.profiles;
drop policy if exists "profiles read staff"   on public.profiles;
drop policy if exists "profiles update own"   on public.profiles;
drop policy if exists "profiles admin manage" on public.profiles;

create policy "profiles read own" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles read staff" on public.profiles
  for select to authenticated using (public.is_staff());
create policy "profiles update own" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles admin manage" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'Not permitted to change role or status';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_role_self_escalation on public.profiles;
create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

commit;

-- ============================================================================
-- VERIFY (run after applying)
--   select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;  -- all true
--   set role anon;
--   select count(*) from public.listings;  -- > 0
--   select count(*) from public.leads;      -- 0 (blocked)
--   select count(*) from public.og_messages;-- 0 (blocked)
--   reset role;
-- ============================================================================
