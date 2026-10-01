# Land, JV & Capital — CRM Restructure

## 1. Project Description
Split the currently-bundled Land / JV workflows so that **Land** becomes a first-class
listing category with its **own dedicated CRM intake and workflow** (mirroring how
**New Developments** already operates), and rename **JV Desk → JV & Capital Desk** as an
independent section. General Property and New Developments remain unchanged.

## 2. Page / Route Structure
- `/admin/land-listings` — Dedicated Land CRM list (new)
- `/admin/land-listings/new` — New Land CRM record (new)
- `/admin/land-listings/edit/:id` — Edit Land CRM record (new)
- `/admin/joint-ventures` — JV & Capital Desk (existing; renamed label)
- `/admin/developments` — New Developments (unchanged)
- `/admin/listings` — General Property CRM (unchanged)

## 3. Core Features
- [x] Dedicated `land_listings` data model (Ph 1)
- [x] Existing land records migrated (copied) from `listings` (Ph 1)
- [x] Land CRM list page + dedicated Land form (Ph 1)
- [x] Land routes + independent admin nav tab (Ph 1)
- [x] Rename JV Desk → JV & Capital Desk label (Ph 1)
- [ ] Frontend land submission → Land CRM (Ph 2)
- [ ] Public site reads land from `land_listings` (Ph 2)
- [ ] Remove duplicate land intake from general CRM + drop legacy `listings` land rows (Ph 3)

## 4. Data Model Design
### Table: land_listings
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| title / slug | text | listing identity |
| land_type | text | vacant_plot / agricultural / development / commercial / residential / industrial / acreage |
| location / neighbourhood / state_region / city / country / address | text | location |
| latitude / longitude | numeric | geolocation |
| plot_size / plot_size_unit / acreage / plot_dimensions | text/numeric | plot metrics |
| tenure / title_info | text | title & deed |
| asking_price / currency / price_per_unit | numeric/text | pricing |
| road_access / utilities / topography / existing_structures | text | site & infrastructure |
| zoning / permitted_use / development_potential | text | permits & potential |
| agricultural_potential / commercial_potential / residential_potential | boolean | potential flags |
| jv_available / partnership_requirements | boolean/text | JV availability |
| owner_name / owner_phone / owner_email / seller_type | text | owner/seller |
| main_image / images | text / text[] | media |
| documents | jsonb | supporting documents |
| status | text | draft / pending / under_review / approved / published / archived / rejected |
| is_published / is_pending / is_featured | boolean | visibility |
| agent_id | uuid | assignee |
| seo_title / seo_description / seo_image | text | SEO |
| notes | text | free notes |
| created_at / updated_at | timestamptz | audit |

## 5. Backend / Third-party Integration
- Supabase (SaaS): table + storage buckets (`land-listings` images, `property-documents`).

## 6. Development Phase Plan
### Phase 1 (DONE): Land backend + admin
- `land_listings` table, migrate existing `listings` land rows (copied; originals preserved)
- Land CRM list + dedicated Land form + routes + nav tab
- Rename JV Desk label → JV & Capital Desk
- Deliverable: admins manage Land via own CRM; new land records stored separately.

### Phase 2 (DONE): Independent JV Opportunity system
- `jv_opportunities` table (own data model, separate from jv_submissions / jv_projects)
- Standalone `JVOpportunityEdit` Add/Edit form
- `JVOpportunities` list page
- Routes + admin sidebar nav entry

### Phase 2b (DONE): JV Land Listing — consolidated JV Desk bluebridge
- Grew `jv_opportunities` into the full **JV Land Listing** blueprint with JV-commercial + land + continuity columns
- Form rebuilt as a self-contained, collapsible submission: overview/publishing & internal, land & property details + access/infra, **Land Use & Development Potential**, ownership, **JV Structure & Land Contribution**, **Capital & Consideration (multi-currency)**, development intent/timeline, **Development-Period Payments**, **Agent Commission**, **Continuity & Source**
- JV Desk (`/admin/joint-ventures`) now treats **JV Land Listings** as its primary inventory; merged the old JV Opportunities view into the desk as a tab; rectangular navy/white button system + font 500/600
- Removed the standalone JV Opportunities sidebar item (kept routes reachable)
- Deliverable: the JV Desk is clean, JV Land Listings carry full commercial structure with internal-vs-public separation.

### Phase 3: Frontend land submission + public wiring
- Frontend land submission writes to `land_listings`
- Public land pages/cards read from `land_listings`

### Phase 4: Cleanup
- Remove duplicate land intake from general CRM
- Drop legacy `listings` land rows after confirming new pipeline
- Final end-to-end flow verification

## 7. Places Directory — Import & Recycle Bin (DONE)
### Import Places (full rebuild, not a patch)
- Deleted the old implementation entirely (`src/lib/amenityImport.ts`, `AmenitiesImportModal.tsx`).
- New self-contained pipeline in `src/lib/importPlaces/`: `parse` (CSV + native multi-sheet Excel,
  resolved reader, no CSV flattening) → `columns` (tolerant auto-detection + mapping) →
  `rows` (validation, area/category matching, duplicate detection vs. existing + within file) →
  `export`.
- New staged UI in `src/pages/crm/components/ImportPlaces/`: Upload (drag & drop) → Map → Preview
  (per-row status + duplicate review: skip / import anyway) → Confirm → Progress → Results
  (with failed-row download). Nothing is written until explicit confirmation; inserts are batched
  with per-row fallback so one bad row can't sink a batch.
- Imported records keep source tracking in `attributes` (`import_source`, `import_file`, `imported_at`).

### Recycle Bin upgrades
- Paginated bin with an accurate total count (fixes misleading "0").
- "Select all" spans every page; Restore + Delete-forever always available on a selection.
- "Empty Bin" purges everything at once.
- Auto-purge: items deleted more than 30 days ago are permanently removed when the bin opens.
- Fixed a hard-delete in `NeighbourhoodLifeTab` that bypassed the bin; deleted rows are now
  excluded from that tab's queries.

## 8. CRM Email System, Templates & Account Security (ACTIVE)

Goal: make every CRM email traceable and branded, and harden account recovery across devices.

### Delivered
- **Accurate login errors + email normalisation** — sign-in no longer reports a wrong password
  for unverified/disabled/rate-limited/server failures (`src/hooks/useAuth.tsx`).
- **Admin password & session management** — `admin-manage-password` edge function + Security
  panel in Agents → Users (set password, email reset link, sign out all devices) with a strict
  role permission matrix and audit logging.
- **Cross-CRM realtime trust pass** — `deals`, `conversations`, `conversation_messages` added to
  the realtime publication; shared `useRealtimeRefresh` hook (debounced realtime + refresh-on-focus);
  inline error + Retry states on Deals, Leads and Inbox.
- **Realtime extended** — `listings` + `agents` also on the realtime publication; **Pipeline View**
  and **Dashboard** now subscribe too (Dashboard uses a silent refresh so skeletons never flash).
- **Central Email Management + Oceans template system**:
  - Tables `email_templates`, `email_template_versions`, `email_settings` (admin-scoped RLS).
  - 20 seeded Oceans templates across account / leads / deals / messages / team / system / marketing
    (incl. `enquiry_auto_response`).
  - `send-templated-email` edge function: renders template + `{{variables}}`, wraps in the Oceans
    shell, sends via Resend (`RESEND_API_KEY` / `RESEND_FROM_DOMAIN`), logs every attempt to `email_log`.
  - CRM page `/admin/management/email` — template list, editor, live desktop/mobile preview,
    variable palette, sender overrides, version history + restore, test send, delivery log,
    and central sender/branding settings.
- **Flows routed through the template engine** — `password-reset-request` (template `password_reset`)
  and the enquiry auto-response in `crm-ingest` (template `enquiry_auto_response`) now send via
  `send-templated-email`, so Email Management edits, branding and the delivery log apply end-to-end.
- **CRM notification router** — new `crm-notify` edge function routes the remaining notification
  events through the engine: `new_lead` (assigned agent, else the admin team), `deal_created`,
  `deal_status` and `lead_assigned` (template `agent_assignment`). Wired from `crm-ingest` (new
  leads) and the Deals / Pipeline View / Leads front-end actions via a fire-and-forget
  `notifyCrm()` helper that can never break a saved action.
- **Account lifecycle emails + resend verification** — `set-agent-status` now emails
  `account_activation` on approve and `account_suspension` on suspend, and supports a new
  `resend_verification` action that issues a fresh code (stored on `profiles.verification_code` /
  `verification_expires_at`) and sends the `account_verification` template. A **Resend** button was
  added to the admin Agents tab **and the Agent Approvals page**, so both admin screens behave identically.
- **Resend delivery tracking (webhooks)** — new public `resend-webhook` edge function receives Resend
  events, verifies the Svix signature when `RESEND_WEBHOOK_SECRET` is set, matches the event to the
  `email_log` row by provider message id, and upgrades its status from `sent` to `delivered` /
  `bounced` / `complained` / `delayed` (plus `opened` / `clicked` engagement, kept in metadata so it
  never hides a clean delivery). Adds `delivered_at`, `bounced_at` and `last_event` to `email_log`.
  The Delivery Log tab now shows the webhook endpoint with copy + setup steps and renders the new states.
- **New-deal email enriched** — the `deal_created` template is now a genuinely distinct, richer new-deal
  email (greeting, deal detail card with reference / property / value / assigned agent, and an "Open the
  deal" CTA). The engine injects `{{crm_url}}` / `{{site_url}}` derived from the sending domain, so the
  CTA points at the CRM pipeline with no hardcoded domain. A pre-enrichment snapshot was saved to
  `email_template_versions` so it can be restored.
- **Remaining system emails routed through the engine** — the last three unwired catalog templates are
  now sent via `send-templated-email` (branded, logged, editable):
  - `welcome` — fired from `signup-complete` after a self-signup account is created.
  - `team_invitation` — fired from `invite-user` (agent / user invites) and `create-admin-user`
    (admin invites), with the accept CTA pointing at the correct portal login.
  - `new_message` — a new event on the `crm-notify` router, fired from `crm-ingest`: a first-time
    enquirer triggers `new_lead`, a returning enquirer (existing contact writing in again) triggers
    `new_message`, so the assigned agent (or the admin team) gets exactly one email per submission.
  All three are fire-and-forget, so a mail failure can never break the saved action or account.

### Remaining
- Inbound email (replies → CRM inbox) needs a webhook-capable provider; Supabase functions cannot
  open IMAP/SMTP sockets directly.

## 9. Public Property Detail — Type-Aware, Live CRM Data (ACTIVE)

Goal: the public property detail page is a faithful, live presentation of the CRM record for
each specific listing — not a generic template. CRM form → DB → query → detail model → page.

### Architecture
- `src/lib/propertyDetail/types.ts` — shared, type-agnostic detail model
  (`PropertyDetailModel`: headline / summary / heroStats / sections / quickFacts).
- `src/lib/propertyDetail/land.ts` — maps a `land_listings` record → model, reusing the SAME
  option lists the Land CRM uses (`landConstants`) so public labels can never drift from the CRM.
- `src/pages/PropertyDetail/components/DetailSections.tsx` — generic renderer. A section renders
  ONLY when its underlying CRM field actually carries a value.
- `PropertyDetail.tsx` (land branch) now pulls the real `land_listings` row by slug, because the
  flattened `all_listings` view does not carry land-specific columns (zoning, tenure, utilities,
  payment terms, terrain, …).

### Rules enforced
- Only populated fields render — never fabricate `0`, `No`, `Freehold`, amenities or zoning.
- Workflow statuses (draft / pending / under_review / approved / published / featured) never
  surface publicly.

### Delivered — Phase 1: Land
- [x] Shared mapping layer + generic section renderer
- [x] Land detail reads the live `land_listings` record
- [x] Type-specific Land sections: Land Overview, Size & Dimensions, Title & Tenure, Location,
      Infrastructure & Utilities, Planning & Zoning, Land Characteristics, Pricing, Payment Terms
- [x] Dynamic hero stat strip + Quick Facts driven by the record (with graceful fallbacks)

### Remaining — next phases
- [ ] JV opportunity detail — its own information model (commercial structure: landowner /
      developer contribution, capital & consideration, revenue/profit share, development intent)
- [ ] New development detail — project scale, unit types, developer, construction status & timeline
- [ ] Residential / commercial detail — fold the existing `propertyDetailSpecs` into the shared model
- [ ] Backfill sparse/migrated land records (some carry size & features only inside the description)

## 10. Global Property-Type Framework — Foundation (ACTIVE)

Goal: ONE BRAND + MULTIPLE PROPERTY EXPERIENCES. The platform shares a single
visual language, but each property type (Residential / Commercial / Land /
Joint Venture / New Development) carries its own information model for search
fields, card facts, detail sections, spec tables and CTAs — driven by the live CRM.

### Delivered — Foundation stage
- **`src/lib/propertyType.ts`** — the single source of truth for:
  - `resolvePropertyTypeKey()` — classifies a record into exactly one type
    (Development and Joint Venture win over the generic land/commercial bucket).
  - `buildCardFacts()` — the compact facts that belong on a card per type
    (Residential → beds/baths/parking · Commercial → sqm/floors/parking ·
    Land → acres/tenure/use/road access · JV → acres/deal/project ·
    Development → units/beds range/stage/completion). Only real values render.
  - `PROPERTY_TYPE_META` — public identity (label, heading, blurb, icon, route)
    so a page can state its purpose immediately instead of "Properties".
- **`src/lib/propertySpecs.ts`** is now a thin façade over the framework, so every
  existing card across the site became type-aware with no per-card rewrite.
- **Video Tour badge (global)** — `PropertyMetaBadges` now:
  - always keeps the media badge (Video / Virtual Tour / Floor Plan) when the
    asset exists (it can no longer be pushed off the 3-badge limit by status badges);
  - makes it clickable (opens the listing's actual video), with mobile + desktop support.
  - wired to live `video_url` / `virtual_tour_url` / `floor_plans` on All Properties,
    Commercial, the JV land feed and New Developments.
- **Read More / Show Less** — new `src/components/feature/ReadMore.tsx`, applied to
  long-form section paragraphs on the detail page. Structured facts/specs are never
  hidden behind it.
- **Footer** — restored to the original full layout (spacious brand band, always-visible
  link columns, newsletter and bottom bar). The ONLY folded element is the long SEO /
  coverage copy, tucked behind an "About our coverage" toggle, so the footer reads as the
  end of the page without hiding navigation. (No contact/link info is ever collapsed.)

### Remaining — next stages
- [ ] JV unified specification table prominence + JV-specific search
- [ ] Live CRM data-flow test per type (CRM → DB → query → card → detail → search → mobile)

## 11. Type-Aware Search Schemas + New Development Project Model (ACTIVE)

Goal: give each property type its own search field set on the SHARED search bar, and
build a genuine project model for New Developments.

### Delivered — this stage
- **Type-aware search on the shared bar** — `PropertySearchBar` gained a generic
  `extraFields` API, rendering a wrapping second row that keeps the same visual
  language while letting each page declare its OWN schema (only real values offered).
  - **New Development** (`/new-developments`): Unit type (Studio → 5+ Beds),
    Developer (from real `developer_name`), Completion (years from `completion_date`),
    plus Development type, Area and build Status.
  - **Land / JV** (`/joint-ventures`): Land use (`land_type`), Road access
    (`road_access`), Title type, Guide price — with land-native options built from
    the live feed only.
- **New Development project model** — new `DevelopmentProjectModel` component:
  - **Project Scale** (total units, available, reserved, sold, floors — real CRM values)
  - **Unit Types table** (unit type · size · price · availability badge from `status`)
  - **Developer profile** (name + phone/email contact where captured)
  - **Construction Timeline** (listed on, current stage, expected/actual completion from
    `completion_date`) — no fabricated dates.
  Wired into the development detail modal (replacing the old flat unit list).
- **`useNewDevelopments`** now selects `completion_date`, `developer_phone`,
  `developer_email`, `floors`, `units_reserved` and each unit's `status`, exposing them
  on the `Development` model.
- **Click-through** — development gallery images and card titles now link to the real
  property detail page (`/property/{slug}`), not only the modal.
- **Page identity** — `/new-developments` reads "New Developments & Projects" with a
  "New Development Projects" browse section; `/joint-ventures` carries an explicit
  "Land & Joint Venture Search" band and "Joint Venture Opportunities" / "Land & Plots"
  section identity so no page is dominated by the generic word "Properties".

### Remaining — next stages
- [ ] New Development detail page (as opposed to the modal) rendering the project model
- [ ] Live CRM data-flow test per type (search → card → detail → mobile)

### Delivered — JV Opportunity Search + Feed (DONE)
- **Live `jv_opportunities` feed** on `/joint-ventures` — new `fetchJvOpportunities()`
  reads published deal records (land size, deal type, contribution, capital, project
  type, stage, summary) straight from the CRM; cards link to the linked land listing's
  public detail page via a `land_listing_id → slug` map (build from the live feed).
- **JV search schema on the shared bar** — a dedicated JV search panel using the same
  `PropertySearchBar` `extraFields` API, with JV-native fields: **Deal type**, **Contribution**,
  **Capital requirement**, **Project stage**. Every dropdown option is built from values
  that exist in the live feed only (label maps reused from `jvOpportunityConstants`), and
  all four filters genuinely narrow the results.
- **`JvOpportunityCard`** — type-aware JV card leading with deal facts (land size · deal type
  JV · project type · capital required · stage), never beds/baths. Reuses the linked land
  listing's hero image when available.
- Relabelled the curated `jv_projects` band to "Development Projects" so the two sections
  no longer share an identical "Joint Venture Opportunities" identity.

## 12. Agent Data Access — Ownership-Scoped CRM (SECURITY, ACTIVE)

Goal: an authenticated agent must only ever receive records they are authorised to see.
Unauthorised records must never reach the client — not merely be hidden in the UI.

### The leak (found by audit)
- The agent route `/agent/developments` rendered the **admin** `<Developments />`
  component, whose query has **no `agent_id` filter** and paginated the whole
  `developments` table. Under RLS an agent got `agent_own` **OR** `public_read
  (is_published = true)`, so every published development in the database reached the
  agent client — plus admin-only actions (publish/feature/delete/Source & Contact).
- `jv_opportunities` RLS was wide open: its select/insert/update/delete policies were
  literally `true`, so any logged-in account could read/edit/delete every JV record.
- `jv_projects` / `jv_project_images` allowed **any authenticated user** full access
  (`auth.role() = 'authenticated'`).
- `all_listings` is a VIEW with no `security_invoker`, so it executed with the owner's
  privileges and bypassed base-table RLS — a systemic "see the whole database" hole.

### Delivered
- **Agent New Developments is now OWN-ONLY**:
  - New `src/hooks/useAgentDevelopments.ts` — scoped at the QUERY level
    (`.eq('agent_id', agentId)`), identity derived from the profile, never the client.
  - New `src/pages/agent/AgentDevelopments.tsx` — own-only list, create/edit/publish/
    feature/delete for the agent's OWN projects only; admin-only actions removed.
  - `/agent/developments` now points at `AgentDevelopments`; `developments/new` &
    `developments/edit/:id` reuse the shared form.
  - `DevelopmentEdit` scoped for agents: ownership guard on open, `agent_id`/`agent_ids`
    forced to the authenticated agent on save, cross-agent assignment panel hidden.
- **Shared edit forms guarded against direct-URL access**: `ListingEdit` and
  `LandListingEdit` now deny an agent opening a record they are not assigned to (blocks
  the owner/source/internal data exposure on another agent's published record), and both
  auto-assign the agent as owner on create (Land CRM `agent_id` previously used the auth
  user id, not the agent id — fixed).
- **Database RLS tightened (via ALTER POLICY, no destructive drops)**:
  - `jv_opportunities`: select = admin **OR** published **OR** own agent/owner/co-list;
    insert/update/delete = admin **OR** owner agent.
  - `jv_projects`: authenticated write policy now admin **OR** owner; public read stays
    `is_published = true` (agents therefore only get published projects).
  - `jv_project_images`: write policy now admin **OR** project owner.
  - `all_listings` view: `security_invoker = true` so base-table RLS (published/own)
    is enforced instead of being bypassed.
- **Agent JV Desk hardened**: "Land Listings" now selects real column names (no aliases)
  and maps locally, with correct empty-vs-error handling — a legitimately empty result set
  resolves to a clean empty state, never a generic "Failed to load land listings" error.
  (PostgrestError is not `instanceof Error`, so a scoped query previously surfaced the
  fallback string.)

### Verified access model
- **Public data** — only `is_published = true` rows (via `*_public_read` and the view).
- **Agent-owned data** — `agent_id = the authenticated agent`, enforced at query AND RLS.
- **Admin/super-admin** — unchanged full access via `is_admin()`.
- Counts on the agent dashboard and JV/land lists are derived from the same scoped queries,
  so they always match what the agent is authorised to see.

### Remaining
- Co-listing / organisation-team sharing rules are honoured where an `agent_ids[]` array
  exists (listings, land, developments, JV); a future dedicated org/team model can extend
  the same pattern without another access-logic rewrite.

## 13. Global Calendar / Diary / Appointment System — Rebuild (ACTIVE)

Goal: ONE canonical scheduling system shared by Agents and Admins — not two competing
appointment systems. Existing routes are kept (`/agent/calendar`, `/admin/team-calendar`);
both are rebuilt on the shared engine.

### Architecture (single canonical model)
- **One record:** `og_appointments` is the canonical appointment for agents AND admins.
  Agent calendar (`OGroupCalendar`) and Admin team calendar (`AdminTeamCalendar`) both read
  and write it. Supporting tables: `og_appointment_attendees`, `og_availability`,
  `og_time_off`, `og_event_types`.
- **Shared types/labels:** `src/pages/agent/ogroup/calendarTypes.ts` is imported by both
  portals, so nothing diverges (kinds, statuses, colours, intentions, outcomes, tasks,
  reminders, durations).

### Security model (DB-enforced, not client-side)
- `og_appt_select` = `is_admin() OR is_super_admin() OR og_is_appointment_participant(id)`
  where participant = `created_by = me OR assigned_user_id = me OR I'm an attendee`.
  An agent can never receive another agent's appointment.
- `og_appt_insert` tightened to `og_is_staff() AND (admin OR created_by = auth.uid())`.
- New tables reuse the same participant rule so tasks/notes/reminders inherit isolation.

### Phase 1 (DONE) — Foundation
- Extended `og_appointments` with canonical fields: `timezone`, `contact_ids[]`,
  `client_phone`, `client_email`, `intention`, `outcome`, `viewing_instructions`,
  `cancellation_reason`, `cancelled_at`, `cancelled_by`, `confirmed_at`, `completed_at`,
  `recurrence_rule`, `recurrence_parent_id` + performance indexes.
- New tables: `og_appointment_activity` (audit + diary stream), `og_appointment_tasks`,
  `og_appointment_reminders` — all RLS-protected via the participant rule.
- Status model canonicalised: `scheduled / confirmed / rescheduled / completed / cancelled / no_show`.
- **Bug fixed:** `og_availability.weekday` is an INTEGER (0=Mon…6=Sun) but the agent code
  stored weekday *names* — saving working hours would silently fail. Frontend now uses the
  numeric convention consistently.
- Shared data layer added: `appointmentActivity.ts` (audit/notes + `useAppointmentActivity`),
  `useAppointmentTasks.ts`, `useAppointmentReminders.ts`. Create/update/status changes now
  write audit entries (create, edit vs reschedule distinguished with old→new times).

### Phase 2 (DONE) — Unified creation flow
- `components/AppointmentForm.tsx` — ONE form used by BOTH the agent and admin calendars
  (previous one-off modals deleted; no competing forms remain).
- Type selector (Viewing / Market Appraisal / General) with type-aware fields.
- Live property search (`PropertyPicker` → real `listings`) with link/unlink to the record.
- Applicant search + add (`ContactPicker` → real `contacts`), **de-duplicated on email/phone**
  via `createContactDeduped`; multiple applicants supported, each removable.
- Multiple internal staff attendees across both portals.
- Date + start/end with **duration shortcuts** (15m…2h) and live duration readout.
- **Multiple reminders** per appointment (`og_appointment_reminders`).
- **Conflict detection** with an inline scheduling-conflict panel (Keep anyway / change time /
  assign another agent).
- Admin gains assignment to any agent; the assigned agent is notified.
- New `appointmentLookups.ts` (property + contact search, dedupe) and shared types.

### Phase 3 (DONE) — Detail drawer + lifecycle
- `components/AppointmentDetailDrawer.tsx` — full right-side drawer replacing the old
  side card on both calendars (full-screen on mobile).
- Quick actions: Edit / Reschedule, Confirm, Complete, No-show, Duplicate, Cancel.
- **Cancel-with-reason** (`cancellation_reason`) with Restore; cancelled rows kept in history.
- **Outcome recording** for viewings.
- **Tasks** section (`useAppointmentTasks`): add / complete / delete with priority.
- **Diary & activity stream** (`useAppointmentActivity`): audit + notes, live-updating.
- Open-property link (slug resolved from the linked listing) and Call / Email contact actions.

### Recurring appointments (DONE)
- `recurrence.ts` — canonical engine: presets (daily/weekly/monthly/custom), interval,
  weekday selection, and end condition (never / on date / after N).
- Recurring creates expand into a parent + child occurrences (`recurrence_rule`,
  `recurrence_parent_id`).
- Editing a recurring appointment offers **This / This and future / Entire series** scope:
  *this* detaches one occurrence into a standalone appointment; *future* drops this + later
  occurrences and rebuilds a fresh series; *series* shifts and updates every occurrence.

### Phase 4 (DONE) — Views, filters, search, drag & drop
- **Views:** `day / 3-day / week / month / agenda` via a view selector, plus a
  **My calendar / Team** scope toggle. Shared render layer in
  `components/CalendarViews.tsx` (`MonthView`, `MultiDayView` for week + 3-day,
  `DayView` with hourly slots, `AgendaView`) used by BOTH calendars so the grid,
  drag targets and empty states are identical.
- **Real filter panel** (`components/CalendarFilterPanel.tsx`): agent, type, status,
  property, applicant, location, recurring-only, show-cancelled. Every control is pushed
  into the Supabase query through `appointmentQuery.ts` (`applyAppointmentFilters`) — no
  visual-only filters. My-calendar scope pins the query to the caller's user id.
- **Server-side search** — a debounced header search that queries `og_appointments`
  directly (`serverSearch`) across title / client / property / phone / email / location;
  results open the appointment (and jump the calendar to its date).
- **Conflict-checked drag & drop** — cards are draggable between days (multi-day/month)
  and onto hour slots (day view). A drop preserves duration, runs the **server-side**
  conflict check first, and either reschedules (logging + notifying) or reverts with a toast.
- **Server-side, authoritative conflict detection** — `findConflicts` is now an async,
  DB-bounded query (agent ∪ property ∪ applicant double-booking) used by the form's live
  banner AND enforced on save, so a filter can never hide a conflicting appointment.
  "Keep anyway" now genuinely bypasses the guard (previously it could not).

### Phase 5 (DONE) — Notifications, timelines, permissions, isolation
- **Notifications** (`appointmentNotify.ts`, reusing the existing `notifications` table +
  `pushNotification`): create → "New appointment assigned/created"; change →
  "Appointment updated"; reschedule → old→new time; cancel → reason; reassign →
  "Appointment reassigned". Recipients = assignee + attendees, minus the actor. Wired on
  BOTH calendars.
- **Connected CRM timelines** — new staff-scoped table `og_crm_activities`
  (property / contact / agent) + `crmActivities.ts`. Scheduling, completing, cancelling,
  reassigning and outcome-recording now write to the linked property, applicant and agent
  timelines (`mirrorAppointmentToTimelines`), so an appointment is never an isolated object.
  (Used a dedicated staff-scoped table because `activity_logs` reads are admin-only.)
- **Last contacted + channel** — `contacts.last_contact_channel` added; the drawer shows
  "Last contacted" (timestamp + channel) for the applicant and lets the agent log a touch via
  **Phone / Email / WhatsApp / Meeting** (`recordContactTouch`), which stamps the contact and
  appends to the applicant timeline. Call/Email links log the matching channel automatically.
  History is never overwritten. Also fixed: contacts were being written with `agent_id = user id`
  instead of the real `agents.id`, which agent RLS rejected — now resolved correctly.

### Isolation verification — Agent A / Agent B / Admin (DONE)
Enforced at the DATABASE layer (not the frontend), verified against the live policies:
- **Agent A vs Agent B:** `og_appt_select` = admin OR `og_is_appointment_participant(id)`
  (created_by / assigned_user_id / attendee). Agent A receives only appointments they are
  part of; Agent B's are invisible. Tasks/notes/reminders/activity inherit the same rule.
- **Cross-agent WRITE hole closed:** `og_appt_update` previously used `USING (og_is_staff())`,
  so any staff could target ANY appointment row. Tightened to
  `USING (admin OR participant) WITH CHECK (admin OR participant)` via `ALTER POLICY`.
- **Self-escalation hole closed:** `og_att_insert` previously allowed any staff to insert an
  attendee row (which grants read access). Now requires `admin OR og_is_appointment_participant`.
- **Contacts:** admin OR `contacts_agent_own` (agent's own `agents.id`) — cross-agent contacts
  are invisible; de-dupe search only sees authorised rows.
- **Timelines:** `og_crm_activities` is `og_is_staff()`-scoped (agency staff), never public.
- **Notifications:** `notifications_own` (recipient = auth.uid()) only; a user can never read
  another user's notifications.
- **Admin:** full read/write via `is_admin() / is_super_admin()` across all the above.
- No frontend `if (role === …)` is relied on as a boundary — RLS is the boundary.

### Phase 6 (DONE) — Company vs My Calendar, private appointments, Schedule, navigation, edit/reschedule + email confirmations
- **Constraint reconciliation (CRITICAL bug fixed).** `og_appointments` inserts were being
  REJECTED (`og_appointments_status_check`): the app sends `status='scheduled'` but the DB only
  allowed `requested/confirmed/rescheduled/completed/cancelled/no_show`. The constraint was migrated
  (drop + re-add, constraint stays active) to the canonical vocabulary
  (`scheduled/confirmed/completed/cancelled/no_show/rescheduled`). Two further latent landmines were
  fixed the same way: `og_appointments_kind_check` (now `viewing/appraisal/general`) and
  `og_appointments_location_type_check` (now the union of the UI + legacy values). No frontend workaround.
- **Property picker** — manual/off-system property entry + linked-listing thumbnail preview.
- **My Calendar vs Company Calendar** — a real split. `og_calendar_access` (admin-write, self-read)
  holds a per-user "can manage company calendar" flag (admin toggled via `CalendarAccessModal`).
  Company view loads through a `SECURITY DEFINER` RPC `og_company_calendar(start,end)` that returns
  participant + authorised-manager rows and masks private appointments for non-participants **in the DB**.
- **Private appointments** — `og_appointments.is_private`; still blocks availability, others see "Busy — Private".
- **Schedule mode** — `CompanyScheduleGrid` (staff × hour, Booked/Private/Free; click a free cell to
  pre-assign). **Created-by vs Assigned-to** surfaced in the drawer.
- **Navigation** — the agent portal main nav now nests a single **Calendar** group in *Team & Time*
  (**My Calendar** `/agent/calendar`, **My Appointments** `/agent/appointments`, **Schedule**
  `/agent/calendar?tab=availability`). The **Company Calendar** link is shown ONLY to users who hold the
  company-calendar grant (`og_can_manage_company_calendar`); everyone else never sees it, and a direct
  `?scope=company` navigation renders an explicit **Access restricted** panel.
- **Ownership-scoped appointment creation.** An agent's `+ Quick Set Appointment` / New appointment defaults
  the assigned agent to **Me** and does not present the org-wide agent list (only granted users can reassign).
  The property picker ranks **My Listings** first ("Your listing" badge) and the contact picker ranks
  **My Contacts** first ("My contact" badge); the wider authorised pool appears under "Other properties" /
  "Shared contacts". My Appointments labels each row **Created by you** vs **Assigned by {name}** with an
  All / Created by me / Assigned to me filter.
- **Edit + Reschedule everywhere** — same editor from the calendar, the drawer, the agenda three-dot
  menu (View/Edit/Reschedule/Cancel) and the CRM appointments list; Reschedule is a distinct quick action.
- **Email confirmations (applicant + agent).** New `send-appointment-confirmation` edge function sends
  both sides using the organisation's own branding (`email_settings` + `site_settings`), recipient logic
  = one message per applicant (never shared To) + the assigned agent, missing emails are skipped (never
  fatal). Every attempt is recorded in the new `og_appointment_emails` audit table (sent/failed/skipped +
  error) and shown in the drawer with a Retry action. **DB creation and email are separate concerns:**
  confirmation is sent only AFTER the appointment commits; a delivery failure shows a notice and never
  rolls back or blocks the appointment. Emails are triggered on create / reschedule / cancel / reassign,
  but NOT on internal-only edits (notes, tasks, tags).

### Phase 7 (DONE) — "Appointment Setter" formalised as a first-class, grant-based designation
- **Decision.** "Appointment Setter" is NOT a fourth `profiles.role` (roles stay agent / admin /
  super_admin) — it is the per-user capability in `og_calendar_access.can_manage_company_calendar`,
  the same grant `og_can_manage_company_calendar()` enforces. This makes the capability explicit,
  manageable and enforced end-to-end without any auth/portal rewrite.
- **Enforcement (RLS).** The grant is now wired into the appointment subsystem so a designated setter
  can actually ACT, not just look. `og_can_manage_company_calendar()` was added to `og_appointments`
  (select/insert/update/delete), `og_availability` (select) and the supporting tables
  `og_appointment_attendees`, `og_appointment_activity`, `og_appointment_tasks`,
  `og_appointment_reminders`, `og_appointment_emails` — all via `ALTER POLICY` (no destructive drops).
  Net effect: an appointment setter manages the Company Calendar, creates & assigns appointments for
  any agent, sees every agent's availability, and reschedules/cancels anyone's appointments, while
  every other table stays limited to their own records.
- **Management UI.** New `src/hooks/useAppointmentSetters.ts` (read/grant/revoke). Agents → Users shows
  an **Appointment Setter** badge on designated accounts plus a one-click designate/revoke action; the
  Roles & Permissions tab gained an **Appointment Setter** capability card (current count + a "Manage
  appointment setters" action); `CalendarAccessModal` and the Team Calendar button were relabelled to
  appointment-setter wording.

## 14. Punch Clock — Auth/Attendance Separation + Robust Punch-In Location (DONE)

Goal: signing in and punching in are TWO completely separate actions, and no user is
ever blocked from a valid punch-in just because a location *suggestion* was empty.

### Sign-in vs punch-in (the rule)
- **Signing in ≠ punching in.** Authentication controls account access; Punch In controls
  attendance. Nothing automatic may create attendance.
- **Audit result:** there was no auto-punch code — `useAttendance` only ever *reads*
  (`status` polling every 60s + on tab-visible), `punchIn()` is called ONLY by the button,
  and presence (`oceansPresence`) never touches attendance. This contract is now explicit
  and documented in both `useAttendance.ts` and `og-checkin/index.ts`.
- **Session restoration (deliberate, per decision):** a valid session is restored on
  refresh/reopen (you stay signed in) — but restoration NEVER punches in, NEVER requests
  location, NEVER starts a timesheet and NEVER creates an attendance record.
- **Manual sign-in polish:** the Admin and Agent gateways now show **"Signing in…"** and
  give the authentication/session state **~1s to initialise** before handing over to the
  dashboard (a restored session still flows straight through). The auto-hop effect is
  guarded so it can't fire mid-sign-in.
- **Independent states UI:** the punch clock now renders an explicit
  **Account** (Signed in / out) · **Attendance** (Not punched in / Punched in / On break) ·
  **Timesheet** (Not started / Active) strip, so "signed in" can never read as "shift started".
  (New `components/AttendanceStatusStrip.tsx`.)

### Punch-in location pipeline (rebuilt, not patched)
- **New `attendanceLocation.ts`** — the single location resolver:
  1. browser/device geolocation (with a hard watchdog so a stuck GPS can't hang the flow);
  2. reverse geocode the coordinates → **Google Geocoding (only if a key exists)** →
     **Nominatim / OpenStreetMap (keyless)** → nearest known area (≤60 km only) → raw coords;
  3. manual search / selection (Nominatim search + the built-in area registry) with a
     "use what I typed" option.
- **New `PunchInLocationModal.tsx`** — opened ONLY by pressing **Punch In**:
  *Detecting location…* → **Location detected** (label + accuracy + source + map preview) →
  **[Confirm & Punch In]**; on failure it shows *"We couldn't automatically detect your
  location."* with **[Allow location access]** and **[Search manually]** instead of a blocking
  error. An empty suggestion list is treated as *no suggestion*, never *no location*.
- **No more premature failure** — the old hard-fail (`"Location is required to punch in.
  Please allow location access."`) is gone. Punch-in only blocks if there is genuinely no
  usable location after device + geocoder + manual have all been attempted.
- **Punch-out never prompts** — it only attaches coordinates when the permission is ALREADY
  granted, so ending a shift can't surprise anyone with a location dialog.
- **Consistent storage** — new columns store the resolved address and the source:
  `og_attendance_sessions.clock_in_location_label`, `clock_out_location_label`,
  `location_source`, and `og_attendance_events.location_label`; coordinates/accuracy/timestamp
  were already stored. Source values: `browser_geolocation` / `google_geocoding` / `nominatim`
  / `area_registry` / `manual` / `unavailable`. `og-checkin` records exactly what the client
  resolved (never fabricated), associated with the authenticated user's attendance record.
- **`location_method` is a CHECK-constrained enum** (`og_attendance_sessions_location_method_check`)
  and must ONLY ever receive a value from the table's allowed set — `'gps'` when coordinates exist,
  `'none'` when they don't (`toLocationMethod()` in `og-checkin`). The granular origin belongs in
  `location_source`, NEVER in `location_method`; writing the origin there violates the constraint
  and fails the entire punch.
- **Auto punch-out does NOT touch `location_method`.** The max-shift auto-close is tagged via a
  note prefix (`AUTO_CLOSE_NOTE_PREFIX` = `"Auto punched out:"`), because `location_method` describes
  HOW clock-in coordinates were obtained and can never carry a punch-out reason. The UI detects an
  automatic close from `note` (`isAutoClosed()` in `attendanceUtils.ts`, the "Auto 12h" badge in
  `OGroupCheckIn.tsx`) — never from `location_method`.
- **Verified allowed set (live):** `og_attendance_sessions_location_method_check` =
  `location_method IN ('gps','manual','none')`. The punch-in insert emits `'gps'`/`'none'`; nothing
  else in the codebase writes this column (one canonical write path: the `og-checkin` edge function).
- **Org-wide remote switch:** `og_attendance_settings` (`id=1`, `allow_remote`) — when ON (the default,
  and the seeded row) the geofence never flags a punch, so Kololo / Nairobi / fully-remote teams punch
  in from anywhere. `remoteWorkAllowed()` in `og-checkin` defaults to `true` even if the row is absent.

## 15. Mall Round-Up Article — Area-Guide Cross-Links + Interactive Mall Map (DONE)

Goal: make the "Best Shopping Malls in Nairobi in 2026" article a mall-discovery hub that
feeds the neighbourhood cluster, and give mall-focused readers a live, mapped path to homes.

### Cross-links (guides → article)
- New canonical link in `src/lib/areaGuides.ts`: `MALL_SHOPPING_BLOG` (`/blog/best-shopping-malls-nairobi-2026`)
  plus `getMallBlogLink(areaSlug)` gated to the mall-heavy guides — **westlands, kilimani, karen**.
- `buildGuideDef` appends the link to each qualifying guide's `related` list (so it also appears
  in "Explore More in {area}"), and `AreaGuidePage` renders a dedicated **"Recommended reading"**
  callout immediately after the guide's *Shopping & Malls* section.

### Interactive mall map + nearby listings (article → guides/listings)
- New `src/lib/nairobiMalls.ts` — curated registry of the 10 featured malls with rank,
  neighbourhood, coordinates, imagery, editorial blurb, highlights and the area-guide deep link.
- New `src/hooks/useMallListings.ts` — one broad, canonical fetch (via `applyPublicVisibility`)
  of published sale + rent listings that carry coordinates; distances computed client-side
  (single query, no refetch storm).
- New `src/pages/blog/components/MallMap.tsx` — Leaflet map (same stack as `CommuteMap`):
  numbered mall pins (selected mall highlighted), nearby-home price pins that link to the
  property page, and fit-bounds/fly-to behaviour.
- New `src/pages/blog/components/MallMapExplorer.tsx` — the article-end section: imagery-led
  mall selector strip, the interactive map with legend, a selected-mall card (image, blurb,
  highlights, area-guide link) and a **For sale / For rent** toggled "Nearby homes" panel
  (listings within 5 km, sorted by distance, each linking to the property plus a browse fallback).
- `BlogDetail` renders `<MallMapExplorer />` at the end of the article body, gated to the
  `best-shopping-malls-nairobi-2026` slug so no other post is affected.