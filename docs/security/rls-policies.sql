-- ============================================================================
-- Oceans Kenya — Row Level Security policies  (audit finding C-1, CRITICAL)
-- ============================================================================
--
-- WHY THIS EXISTS
--   The browser holds the Supabase anon key (unavoidable for a SPA). In
--   Supabase, RLS *is* the authorization layer. With RLS off, that public key
--   is a full read/write credential to every table — anyone can dump `leads`,
--   `contacts` and `enquiries` (personal data) or rewrite `listings`/`profiles`
--   straight from the browser console.
--
-- WHAT THIS DOES
--   Enables RLS on every table and adds default-deny policies:
--     * public, unauthenticated visitors may READ only public content and the
--       site-configuration tables the front-end needs to render;
--     * everything sensitive (leads, contacts, enquiries, deals, messages,
--       profiles, media, logs) is readable/writable only by authenticated staff;
--     * all public-form writes already go through the crm-ingest edge function,
--       which uses the service-role key and bypasses RLS, so public roles need
--       no INSERT on those tables.
--
-- HOW TO APPLY
--   Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent: safe to run
--   more than once (drops each policy before recreating it). Review the two
--   ADJUST markers before running.
--
-- ROLE MODEL (from public.profiles)
--   profiles.user_id  -> auth.users.id
--   profiles.role     -> 'super_admin' | 'admin' | 'editor' | 'agent'
--   profiles.status   -> 'active' | 'suspended'
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER)
--
-- These read profiles with the definer's rights, so a policy ON profiles can
-- call them without triggering infinite RLS recursion (the classic Supabase
-- footgun). They are the single source of truth for "who is this caller".
-- ----------------------------------------------------------------------------

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
    and status <> 'suspended'
  limit 1
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() in ('super_admin', 'admin', 'editor', 'agent')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() in ('super_admin', 'admin')
$$;

revoke all on function public.auth_role(), public.is_staff(), public.is_admin() from public;
grant execute on function public.auth_role(), public.is_staff(), public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS on every table
--
-- Enabling RLS with no policy = deny all. The policies below then open up
-- exactly the access each table needs.
-- ----------------------------------------------------------------------------

do $$
declare t text;
  tables text[] := array[
    -- public content
    'listings','listing_images','agents','neighbourhoods','neighbourhood_images',
    'neighbourhood_faqs','neighbourhood_comparisons','blog_posts','jv_projects',
    'jv_project_images','jv_faqs','testimonials','homepage_sections',
    -- public site configuration / styling
    'site_settings','brand_settings','typography_settings','hero_settings',
    'breadcrumb_settings','map_settings','footer_settings','social_links',
    'nav_links','menu_settings','contact_sections','currency_settings',
    'search_filters','property_settings','required_fields','property_page_settings',
    'property_details_layout','property_detail_style','property_cards_style',
    -- staff only (sensitive)
    'leads','contacts','enquiries','deals','conversations','conversation_messages',
    'activity_logs','analytics_events','notifications','profiles','media_library',
    'images','jv_submissions'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security;', t);
      execute format('alter table public.%I force row level security;', t);
    else
      raise notice 'skip: table public.% does not exist', t;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Public-content tables  — anyone may READ, only staff may WRITE
--
-- These are meant to be seen by site visitors. Writes are limited to
-- authenticated staff. Reusable macro expressed by hand per table so each
-- read filter can differ (e.g. published-only).
-- ----------------------------------------------------------------------------

-- listings: public reads. ADJUST(1): if you keep draft/private listings in
-- this table, tighten the USING clause, e.g.
--   using ( status in ('active','sold','rented') and coalesce(private_listing,false) = false )
-- Listings are public content by design, so an open read does not leak
-- sensitive data; the tighten is only to hide unpublished drafts.
drop policy if exists "listings public read"  on public.listings;
drop policy if exists "listings staff write"   on public.listings;
create policy "listings public read" on public.listings
  for select to anon, authenticated using ( true );
create policy "listings staff write" on public.listings
  for all to authenticated using ( public.is_staff() ) with check ( public.is_staff() );

-- Content tables with a plain public-read / staff-write shape.
do $$
declare t text;
  content_tables text[] := array[
    'listing_images','neighbourhoods','neighbourhood_images','neighbourhood_faqs',
    'neighbourhood_comparisons','jv_projects','jv_project_images','jv_faqs',
    'testimonials','homepage_sections'
  ];
begin
  foreach t in array content_tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists %I on public.%I;', t||' public read', t);
      execute format('drop policy if exists %I on public.%I;', t||' staff write', t);
      execute format('create policy %I on public.%I for select to anon, authenticated using ( true );',
                     t||' public read', t);
      execute format('create policy %I on public.%I for all to authenticated using ( public.is_staff() ) with check ( public.is_staff() );',
                     t||' staff write', t);
    end if;
  end loop;
end $$;

-- agents: public sees active agents only; staff manage all.
drop policy if exists "agents public read" on public.agents;
drop policy if exists "agents staff write" on public.agents;
create policy "agents public read" on public.agents
  for select to anon, authenticated using ( coalesce(is_active, true) );
create policy "agents staff write" on public.agents
  for all to authenticated using ( public.is_staff() ) with check ( public.is_staff() );

-- blog_posts: public sees published only; staff manage all.
drop policy if exists "blog public read" on public.blog_posts;
drop policy if exists "blog staff write" on public.blog_posts;
create policy "blog public read" on public.blog_posts
  for select to anon, authenticated using ( status = 'published' );
create policy "blog staff write" on public.blog_posts
  for all to authenticated using ( public.is_staff() ) with check ( public.is_staff() );

-- ----------------------------------------------------------------------------
-- 4. Public-configuration tables — anyone may READ, only ADMINS may WRITE
--
-- The front-end reads these unauthenticated to render branding, typography,
-- nav, currency, etc. They contain no personal data, but only admins should
-- change site configuration.
-- ----------------------------------------------------------------------------

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
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists %I on public.%I;', t||' public read', t);
      execute format('drop policy if exists %I on public.%I;', t||' admin write', t);
      execute format('create policy %I on public.%I for select to anon, authenticated using ( true );',
                     t||' public read', t);
      execute format('create policy %I on public.%I for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );',
                     t||' admin write', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Staff-only tables — NO public access at all
--
-- The sensitive core: prospect and CRM data. Public forms write here only
-- through the crm-ingest edge function (service role, bypasses RLS), so no
-- anon INSERT policy is needed or wanted.
-- ----------------------------------------------------------------------------

do $$
declare t text;
  staff_tables text[] := array[
    'leads','contacts','enquiries','deals','conversations','conversation_messages',
    'activity_logs','analytics_events','notifications','media_library','images',
    'jv_submissions'
  ];
begin
  foreach t in array staff_tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists %I on public.%I;', t||' staff all', t);
      execute format('create policy %I on public.%I for all to authenticated using ( public.is_staff() ) with check ( public.is_staff() );',
                     t||' staff all', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. profiles — the identity table, handled explicitly
--
--   * a user may read their OWN profile (this is what useAuth does at login);
--   * staff may read every profile (Users & Roles, agent pickers);
--   * a user may update their own profile but NEVER their own role/status
--     (enforced by the trigger below — a WITH CHECK alone cannot compare to
--      the previous row);
--   * only admins may insert/delete profiles or change anyone's role.
--
-- Most privileged profile writes already happen server-side in the edge
-- functions (service role), but these policies keep the table safe even if a
-- client tries a direct write.
-- ----------------------------------------------------------------------------

drop policy if exists "profiles read own"     on public.profiles;
drop policy if exists "profiles read staff"   on public.profiles;
drop policy if exists "profiles update own"   on public.profiles;
drop policy if exists "profiles admin manage" on public.profiles;

create policy "profiles read own" on public.profiles
  for select to authenticated using ( user_id = auth.uid() );

create policy "profiles read staff" on public.profiles
  for select to authenticated using ( public.is_staff() );

create policy "profiles update own" on public.profiles
  for update to authenticated
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

create policy "profiles admin manage" on public.profiles
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- Block privilege self-escalation: a non-admin updating their own row may not
-- change role or status. This closes the "UPDATE profiles SET role='super_admin'
-- WHERE user_id = me" attack that a WITH CHECK cannot catch on its own.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;                        -- admins may change roles
  end if;
  if new.role is distinct from old.role
     or new.status is distinct from old.status then
    raise exception 'Not permitted to change role or status';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_role_self_escalation on public.profiles;
create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ----------------------------------------------------------------------------
-- 7. analytics_events — OPTIONAL public insert
--
-- ADJUST(2): only needed if the site records property views from the browser.
-- No such client-side write exists in the current code (Insights only reads
-- this table), so it is left staff-only above. If you add client view
-- tracking, uncomment to allow anonymous INSERT but never SELECT:
--
--   drop policy if exists "analytics anon insert" on public.analytics_events;
--   create policy "analytics anon insert" on public.analytics_events
--     for insert to anon, authenticated with check ( true );
-- ----------------------------------------------------------------------------

commit;

-- ============================================================================
-- VERIFY  (run after applying)
-- ============================================================================
-- Every table should show rowsecurity = true:
--   select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
--
-- Smoke test as anonymous (should return rows for listings, ZERO for leads):
--   set role anon;
--   select count(*) from public.listings;   -- > 0 expected
--   select count(*) from public.leads;       -- 0 expected (blocked)
--   reset role;
-- ============================================================================
