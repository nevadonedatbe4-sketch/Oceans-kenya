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

### Delivered — New Development project page (DONE)
- New dedicated route `/development/:slug` + `src/pages/DevelopmentDetail.tsx` — the full inventory
  destination for a development (NOT a modal/preview): hero gallery → project name + from-price +
  location → overview → project highlights → project model (scale, unit types, developer, timeline)
  → location + map → **Available homes in this development** (inventory summary + bedroom/availability
  filters + unit cards) → enquiry.
- `src/hooks/useDevelopmentProject.ts` — resolves the parent project for any unit slug (real
  `listings.development_id` project link, title fallback) and loads every published unit.
- `src/pages/DevelopmentDetail/components/` — `UnitCard` (approved listing-card UI) +
  `InventorySection` (live inventory summary + filters).
- "See more of this development/project →" on both the grid and featured cards now LINKS to the
  project page (never the modal/preview); the property detail page gained "See all homes in this
  development →" back to the project page, so the unit ↔ project relationship works both ways.
- Development cards (grid + featured) gained section dividers, listed-on dates and a Sale/Rent-style
  "Preview" control; unit cards also carry their listing date.

### Remaining — next stages
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
- **`PunchInLocationModal.tsx`** — opened ONLY by pressing **Punch In**:
  *Detecting location…* → *Checking location…* → **Location detected** (label + accuracy +
  source + map preview) → **[Confirm & Punch In]**. A low-accuracy fix (>500 m) warns with a
  **Try again** but stays confirmable.
- **Distinct, recoverable failure states (no generic blob).** Every failure maps to a specific,
  actionable state with its own icon/copy and a **Try again** / **Search manually** path:
  permission blocked, permission required, unsupported browser, insecure context, GPS timeout,
  service temporarily unavailable. A **blocked** state shows the exact steps to re-enable
  location (lock icon → Allow → reload; iOS Settings path) because browsers will not re-prompt
  after a remembered "Block". **Try again re-runs the same detector** (and re-prompts when the
  permission is back to "prompt").
- **Location is REQUIRED — no office stand-in.** The "Punch in anyway / saved office location"
  escape hatch was removed. A punch is only offered with valid coordinates (device fix or a
  manually chosen place); the human-readable label is enrichment only and never a requirement.
  Enforced on the client (`punchIn` returns `LOCATION_REQUIRED`) AND on the server
  (`og-checkin` rejects a coordinate-less `punch_in` with `LOCATION_REQUIRED`; `fallbackOfficeLocation`
  is deleted). An empty suggestion list is treated as *no suggestion*, never *no location*.
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

## 16. Typography Pipeline + Neighbourhood Image Fallback (DONE)

### Root cause 1 — Typography settings had NO frontend consumer
`typography_settings` was written by Management → Typography / Global Design but **no
public code read it**, so every font/size/weight/transform change was a no-op.
- New `src/hooks/useTypography.ts` — reads `typography_settings` and applies the values
  to the root CSS variables the stylesheet actually consumes (same pattern as
  `useBrandTheme`). Wired into `App.tsx` (`ThemedApp`), fails silently to the defaults.
- `src/index.css` — the base layer now consumes the variables instead of hardcoding:
  body (`--font-body`/`--body-*`), `h1,h2` (`--font-display`), `h3–h6` (`--font-heading`),
  buttons (`--button-*`), and new scoped rules for `.site-nav`, `.site-footer`,
  `.site-breadcrumb`, `.card-title` (descendant specificity beats utility classes, no `!important`).
- `tailwind.config.ts` — `font-prata` / `font-roboto` / `font-jost` / `font-title` now map
  to the same variables, so a font-family change cascades across every page.
- `Header` / `Footer` / `PageBreadcrumbTrail` carry the `site-nav` / `site-footer` /
  `site-breadcrumb` hooks; shared listing card titles carry `card-title`.
- Editing any typography control in Management now visibly changes the public site.

### Root cause 2 — "Updated the Langata image, page still empty"
`neighbourhoods.hero_image` was empty even though a real photo existed in
`neighbourhood_images` (uploaded via the admin Gallery tab). The frontend only reads
`hero_image`, so the image never appeared.
- `useNeighbourhoods` + `NeighbourhoodDetail` now fall back to the first gallery image
  when `hero_image` is empty (the table has a public read policy, so anonymous visitors
  resolve it too). Cards/detail use `EntityImage` so nothing renders a broken frame.
- `NeighbourhoodEdit` now promotes the first gallery upload to `hero_image` when none is
  set, so the field the frontend reads stays in sync going forward.

## 17. Editorial Guides on Real Data — "Where to Eat in Nairobi" flagship (ACTIVE)

Goal: blog guides must be genuinely useful and connected to real, verifiable entities —
not generic SEO prose with auto-injected properties. The `amenities` directory is the one
source of truth; the template renders presentation, the database owns content.

### Decision (confirmed with user)
- Clean + enrich the EXISTING `amenities` dining records (one source of truth) rather than
  building a parallel venue table.
- Curated shortlist of ~40-60 key venues enriched with a verified cuisine, an editorial
  "why go" description, occasion tags, price level, source + last-verified date.

### Data model
- `amenities`: added `cuisine`, `best_for` (text[]), `source`, `source_url`, `last_verified`,
  `is_guide_curated`. `blog_posts`: added `article_type` (`editorial` / `dining_guide` /
  `area_guide` / `lifestyle`).
- Hidden 28 scraped "review-snippet" junk dining rows + 6 duplicates (`is_published = false`,
  reversible). 57 venues enriched across Karen, Westlands, Kilimani, Lavington, Kileleshwa,
  Parklands, Gigiri; Talisman / Cultiva / Five Senses inserted (were missing).

### Template (BlogDetail, gated to `article_type = 'dining_guide'`)
- `useGuideVenues` (shared public-visibility rule) + `guideVenues.ts` (occasions, area/occasion
  grouping). Components: `VenueCard`, `DiningQuickGuide`, `VenuesByArea`, `VenuesByOccasion`,
  `GuideMethodNote`, `ContextualProperties`.
- Sections render ONLY when real data exists — no empty sections, no `0`/null/placeholder values.
- Property recommendations are contextual: `ContextualProperties` draws listings only from the
  guide's actual areas (multi-area search), with an editorial heading.

### Rules
- Guide areas resolve from `related_neighbourhoods` independently of a neighbourhood page's
  publish state, so a real area's venues are never silently dropped.
- Everything (title, body, venues, tags, sources) stays editable from the CMS
  (Blog editor `article_type`; Amenity editor "Editorial Guide" card).

### Remaining — next stages
- [ ] Roll the same template to other blogs; add per-guide CMS section ordering/visibility.
- [ ] Enrich the rest of the dining directory (currently ~57 of ~225 curated).

## 18. Micro-Guide Content Engine — "Best of [Area]" at scale (ACTIVE)

Goal: a genuinely scalable content system. One reusable engine turns a tiny,
CMS-editable config on any blog post into a real, data-backed "Best Cafés in
Kilimani" / "Best Restaurants in Nairobi" / "Best Gyms in Lavington" page -
rendered entirely from the SAME curated `amenities` records the directory uses.
No hand-built pages per article, no filler, no unrelated property blocks.

### Content = traffic → intent → conversion (the funnel)
Each micro-guide ends with a **contextual** property section drawn only from the
guide's own areas ("Where to Stay in Kilimani"), plus the related-neighbourhood
and area-guide links - so authority content feeds the listings, not the other
way round.

### The engine
- **`blog_posts` config columns** (CMS-editable, never hardcoded):
  - `guide_area` — the neighbourhood the guide is about (`null` = Nairobi-wide)
  - `guide_categories` — directory categories to draw from (e.g. `dining`, `fitness`)
  - `guide_match` — subcategory keys, `best_for` tags OR verified `cuisine` words
    that qualify a place (e.g. `cafe,coffee` · `gym,fitness_studio` · `italian,pizza,pasta`)
- **`src/lib/microGuides.ts`** — `resolveMicroGuideConfig()` + `filterMicroGuidePlaces()`
  (category + area + term match) + `areasPresentInPlaces()`.
- **`src/hooks/useCuratedPlaces.ts`** — the one live source: every published,
  guide-curated `amenities` record across all categories, via the shared
  `applyPublicAmenityVisibility` rule (drafts / recycled / archived can never
  leak; live realtime refresh as the directory changes).
- **`src/pages/blog/components/MicroGuidePlaces.tsx`** — the picks grid, grouped
  by area for city-wide guides. Reuses `PlaceCard`, `GuideMethodNote`,
  `ContextualProperties`.
- **`BlogDetail`** — `article_type = 'micro_guide'` renders the picks module +
  sources note + contextual property block, with its own hero eyebrow and TOC.

### Rules upheld
- Sections render ONLY when real records exist — never an empty section.
- A property block is drawn only from the guide's own areas.
- Everything stays editable from the CMS (new **Micro-guide** type + config
  panel in the Blog editor); editing a venue updates every guide live.

### Delivered
- Data curated: 16 real cafés flagged/organised (Karen, Kileleshwa, Kilimani,
  Riverside, Westlands, Spring Valley); 2 Gigiri dining records; 26 real gyms /
  fitness studios across Lavington, Westlands, Karen, Kileleshwa and Gigiri.
- 8 micro-guides seeded (each verified to resolve real places):
  Best Restaurants in Nairobi · Best Cafés in Nairobi · Best Restaurants in
  Kilimani · Best Cafés in Kilimani · Best Cafés in Westlands · Where to Eat in
  Karen · Best Gyms & Fitness in Lavington · Best Dining in Gigiri.
- **Coworking guide wired** — "Best Coworking Spaces in Nairobi 2026" converted
  to a live micro-guide (`business` / `coworking`); 20 genuine spaces curated
  (all with images) across 10 areas; junk miscategorised as coworking left uncurated.
- **Editorial batch wired** (the "last batch" list articles switched from plain
  prose to the live engine, each verified to resolve real, image-backed places):
  - **Best Gyms in Nairobi 2026** → `fitness` / `gym,sports_club,fitness_studio,yoga_pilates` — 26 places, 5 areas.
  - **Best Parks in Nairobi 2026** → `recreation` / `park,botanical_garden,garden,conservation_area` — 12 places (all with images), 7 areas.
  - **Best Bars in Nairobi 2026** → `night_life` / `night_club,live_music,bar,lounge` — 24 places (all with images), 11 areas.
- Data curated for bars: 16 genuine bar/lounge/grill records enriched and flagged
  as guide-curated (Alloy, Gipsy Bar, Hero Rooftop, Kiza, Mercury, Sky Bistro,
  Tapas Bar, BND Kileleshwa, Tipsy, The Wine & Bottle, Chocolate City, Kengeles,
  Kettlehouse, Gigiri Social Club, Relax Lounge Muthiga, Triple Two Loresho);
  casinos / clubs left uncurated so they cannot leak into the guide.
- **Cuisine-led guides wired** — the engine (`matchesTerms`) now also matches the verified
  `cuisine` column (free-text like "Italian / Continental", "Brazilian Steakhouse"),
  tokenised on non-alphanumerics, so cuisine shortlists are driven by real data instead of
  guesswork. Curated + tagged the genuine venues and switched five editorial posts to the
  live engine:
  - **Best Italian Restaurants in Nairobi 2026** → `dining` / `italian,pizza,pasta` — 3 places (all with images).
  - **Best Indian Restaurants in Nairobi 2026** → `dining` / `indian,tandoor,curry` — 3 places.
  - **Best Steakhouses in Nairobi 2026** → `dining` / `steakhouse,churrascaria` — 7 places.
  - **Best Seafood Restaurants in Nairobi 2026** → `dining` / `seafood,oyster,coastal` — 6 places.
  - **Best Rooftop Restaurants in Nairobi 2026** → `dining,night_life` / `rooftop` — 3 places.
- **Places console — guide shortlisting** — new bulk **Guide curated** toggle in the Places
  toolbar (`bulkGuideCurated` / `setGuideCurated` in `src/lib/directory.ts`; button + More-menu
  actions in `Amenities.tsx`) so many places can be shortlisted (or removed) at once, plus an
  **"In a guide"** badge on every row that is already `is_guide_curated`, so guide membership
  is visible at a glance.

### Remaining — next stages
- [ ] Curate more cafés to thicken the thinner area guides (Westlands/Kilimani).
- [ ] Thicken the thinner cuisine guides (Italian 3, Indian 3, Rooftop 3) as more venues are listed.
- [ ] Add a "featured venues" up-weight and per-guide section ordering in the CMS.
- [ ] Add these micro-guides to the sitemap + internal-link them from area guides.

## 19. Public Property Detail — Full CRM Parity + Project/Unit Model (DONE)

Goal: the property detail page must render EVERY populated, public-facing CRM field,
and never present a unit as an isolated property when it belongs to a larger project.

### Backend/frontend field audit (the gap that was closed)
- `src/lib/propertyDetailSpecs.ts` (the CRM→detail field mapper) was silently dropping
  populated columns. Added: **Included Items** (JSON-array string on 463 listings),
  **Negotiable**, **Second Price** (+currency), **Property Label**, **Postal Code**,
  **Acreage** (non-land). All render conditionally — empty values never show a row.
- **Floor plans / brochures** were captured in the CRM `documents` jsonb (category
  `floorplans`) but rendered nowhere. New `PropertyDocuments` component shows floor-plan
  image thumbnails (with lightbox) + download rows for non-image files; legacy
  `floor_plans` URL arrays are still honoured. Wired into `LeftColumn`.

### Project ↔ unit relationship
- New `src/hooks/useProjectUnits.ts` — loads every OTHER published unit sharing the
  project title (withdrawn/draft excluded; SOLD kept so inventory reads honestly) and
  derives a project summary (count, available, from-price).
- New `src/pages/PropertyDetail/components/ProjectUnitsSection.tsx` — "Other units in
  this project": compact, dense unit cards (image → unit type → specs → price →
  availability badge → link to the specific unit), each linking via `?from=` for
  context-aware back navigation. Renders nothing for a standalone property.

### Compact cards + responsiveness
- `SimilarProperties` cards redesigned to be compact/dense (aspect-ratio image, tight
  padding, single-line title, inline spec chips, price pinned to the bottom) — no fixed
  pixel heights, consistent grid alignment, no overflow at any breakpoint.
- All new sections are desktop-first with `sm` / `lg` breakpoints and stack cleanly on
  mobile/tablet.

### Notes
- Public visibility continues to flow through the canonical `publicListings` rule;
  owner/private/internal columns are never surfaced.
- `all_listings` remains the public read view (union of listings + land_listings);
  project-unit sibling lookup reads `listings` directly with published + non-live filters.

## 20. Real Project Link, Unit-vs-Project Strip & Site-wide Floor-Plan Badge (DONE)

Goal: make every unit know its project (not just the few that share a title), label what
is unit-specific vs shared, and advertise floor plans on the cards themselves.

### 20.1 Real project link (`listings.development_id`)
- **Column:** `listings.development_id uuid` (the real project key, pointing at `developments.id`).
- **Triggers (DB-enforced, SECURITY DEFINER):**
  - `trg_link_listings_to_development` — on `developments` insert/update of slug/title, stamps
    `development_id` onto any unpublished-link listing whose `slug` or lowercased `title` matches.
  - `trg_resolve_listing_development` — BEFORE insert/update on `listings`, resolves
    `development_id` from `developments` (slug OR lowercased title) when it is null.
  - Index `idx_listings_development_id`.
- **Backfill:** existing rows linked by slug/title → **78 listings now carry a real `development_id`**
  (77 are new developments).
- **`useProjectUnits`** now resolves the current listing's `development_id` and fetches siblings by
  that key (title match is the fallback only), so "Other units in this project" shows for every
  linked development instead of the ~4 titmatched ones.

### 20.2 "This unit vs The project" strip
- New `src/pages/PropertyDetail/components/UnitVsProjectStrip.tsx`, rendered on the detail page for
  new developments. Two columns: **This unit** (type, beds, baths, size, floor, price, ref, status,
  furnishing) and **The project** (total units, floors, available, developer, completion, deposit,
  installments, marketing, stage, location, facilities). Every row is conditioned on real data, and
  the whole strip hides unless there is a project to compare against.
- `PropertyDetail` gained `floorNumber` (from `listings.floor_number`) to feed the unit column.

### 20.3 Site-wide "Floor Plan Available" badge
- New shared detector `listingHasFloorPlan()` in `src/lib/listingMeta.ts` — true when the legacy
  `floor_plans` array is populated, OR the CRM `documents` payload contains a floor-plan entry
  (strict match so "payment plan" / "master plan" docs never trigger it). `documents` added to the
  `useListings` select and mapped into `MappedListing.floorPlan`.
- `PropertyMetaBadges` floor-plan label is now **"Floor Plan Available"**, and the badge row wraps
  (instead of clipping) so the longer label never gets cut off.
- Surfaced on: shared `PropertyCardBody` (Buy / Rent / All Properties / Commercial), `SeoListingCard`,
  the home `PropertyCard` (now maps `floorPlan` from the live row), and the New Development cards via
  a new `Development.hasFloorPlan` flag in `developmentModel` (groupRows → any unit has a plan).

### 20.4 Detail-page quick actions & media-badge parity
- **Development detail quick actions** (`DevelopmentDetail`) gained a **"Video Tour Available"** pill
  shown only when `project.videoUrl` is present — the same soft rounded-full pill style as the existing
  "Floor Plan Available" pill, and the same behaviour as the card's video control (opens the project's
  video in a new tab).
- **Property detail** (`PropertyDetail`) now surfaces the media badges through the SAME shared
  `PropertyMetaBadges` component the property cards use, so card and detail stay visually identical:
  `floorPlan` (driven by a new `ListingDetail.hasFloorPlan` computed via `listingHasFloorPlan()`),
  plus `videoTour` / `virtualTour` when the listing carries `video_url` / `virtual_tour_url`.
  The "Floor Plan Available" badge scrolls to the floor-plan/documents section (`#section-documents`);
  the video / virtual-tour badges open the asset in a new tab.

### 20.5 Land & Joint Venture media-badge parity (global detail consistency)
- The **Land & Joint Venture** detail layout (`PropertyDetail` land/JV branch) previously rendered the
  shared `PropertyMetaBadges` row WITHOUT the media props, so land / JV listings silently lost the
  Video Tour / Virtual Tour / Floor Plan pills even when the CRM record carried those assets.
- Fixed: the land/JV branch now passes `videoTour` / `virtualTour` / `floorPlan` (same shared component,
  same behaviour as the regular property branch) — video / virtual-tour open in a new tab, floor plan
  scrolls to `#section-documents`.
- Added the `PropertyDocuments` section to the land/JV layout so the floor-plan pill has a real
  destination and land/JV attachments render (matching the regular property page).
- **Result:** every property-type detail page (regular property, land, JV opportunity, new development)
  now surfaces the same media pills. The standalone `jv_projects` project page carries no
  video/tour/floor-plan columns in its data model, so there is nothing to surface there yet.

## 21. Project ↔ Unit Entity Separation + Development Card Badge (DONE)

Goal: guarantee the PROJECT page and the UNIT page can never collapse into one, and stop
the "bedroom-range" badge from appearing as a misplaced duplicate on development cards.

### Entity model (how the two entities resolve)
- **PROJECT** — the whole development. Route: `/development/{projectSlug}` → `DevelopmentDetail`.
  **SUPERSEDED by §24** — the separate project page was deleted; every development and unit now
  resolves to its single `/property/{slug}` page.
- **UNIT** — one specific listing. Route: `/property/{unitSlug}` → `PropertyDetail` (restored unit
  page). Always a single listing's own data.
- **Grouping** — `groupRowsByProject` now groups by the real project link (`listings.development_id`)
  first, falling back to the shared normalised title only when a listing has no project link. So a
  project with many different-titled units still groups into ONE project on the index.
- **Link direction** — the project inventory's **"View property"** → `/property/{unit.slug}` (the
  specific unit). The unit page's **"See more of this development"** → `/development/{projectSlug}`
  via the new `useUnitProjectSlug` hook, so every unit in a project returns to the SAME project page
  (never a different unit, never the unit's own slug).

### Card badge
- The unit-type range badge ("1, 2 & 3 bedroom properties") is now shown **only when the project
  genuinely offers more than one unit type** (`hasMultipleUnitTypes`), and on the featured card it is
  placed **under the "See more of this development" link** so it reads as part of the project, not a
  stray duplicate.

### Notes
- Current data is 1:1 (each new-development listing is its own `developments` row with one unit), so
  the two pages show the same underlying record today; the routes and components are already separate
  and diverge automatically once real multi-unit projects exist.
- `developments` is read-only public (`is_published = true`); no schema changes were needed.

## 22. Multi-Unit Project Visibility, Unit-Type Mix Table & 14px Body Minimum (DONE)

Goal: make a real multi-unit project (e.g. **Riverside Apartments**, 5 units) fully visible
end-to-end, show its bedroom mix as one small table, and keep every detail-page body on the
global site's minimum body size.

### Project entity is now the source for the project page
- `buildDevelopment` builds the project from its unit listings; a new `applyProjectRecord()`
  overlays the canonical `developments` entity onto it. `useDevelopmentProject` now fetches that
  record (by `development_id`) and applies it, so a multi-unit project shows its **own name,
  description, gallery, developer, inventory and stage** — not whichever unit sorted first.
- Riverside Apartments is fully populated (5 units: Studio A / 1 Bed A / 1 Bed B / 2 Bed A /
  3 Bed Penthouse + 4 `unit_types` rows), so its project page and 5 unit pages render end-to-end.

### Unit-type mix table (project page)
- `DevelopmentProjectModel` now renders the unit-type table **grouped by bedroom type** via
  `groupUnitTypes` (Studio / 1 / 2 / 3 bed), each row showing a **size range, price range and
  availability** badge. It appears **only when the project has more than one unit type**; a
  single-type project shows no table (the inventory cards already cover it).
- `UnitTypeGroup` gained `minSize` / `maxSize` / `sizeUnit`.

### "Back to {project name}" on every unit page
- `useUnitProjectSlug` → **`useUnitProjectLink`**, returning `{ slug, name }` — the canonical
  project route (cheapest unit slug) **plus the project's real name** from `developments`.
- `PropertyDetail` shows a compact **"Back to {project name}"** link at the very top of each
  unit page (new-development listings), so the parent project is always one click away.

### 14px minimum body size
- `sanitizeRichHtml` now clamps any inline `font-size` below **14px** up to 14px (px + pt), so a
  legacy or manually-sized description can never render smaller than the global body copy.
- The editor's `FONT_SIZES` dropped the sub-14px options (8/9/10 pt) so new content can't be
  created undersized either.

## 23. Unit Page = Single Property Only (DONE)

Goal: the **unit/listing page must present ONE specific property**, never project-level content;
the full project lives only on the dedicated project page.

### Page contract
- **Project page** — `/development/:slug` → `DevelopmentDetail` (UNCHANGED): the whole development,
  reached from a listing via **“See more of this project”.**
- **Unit page** — `/property/:slug` → `PropertyDetail` (single property only): its own gallery,
  price, beds/baths/size, description, features/amenities, specs, agent contact, similar units,
  prev/next. No project sections are rendered on it.

### Changes
- Removed the project-level blocks that had leaked onto the unit page: the “This home is part of
  a development” banner block and the separate top “Back to {project}” button.
- Added a single, compact **“See more of this project →”** link (top of the unit page) that routes
  to the project page via `useUnitProjectLink` (the canonical cheapest-unit slug) — one link, one
  direction, no merged pages. **SUPERSEDED by §24** (removed once the project page itself was deleted).
- Removed the **recently-viewed-developments** rail from the unit page so it shows only this
  property.
- Deleted the now-unused, project-on-unit-page components/hook:
  `ProjectUnitsSection.tsx`, `UnitVsProjectStrip.tsx`, `DevelopmentActions.tsx`,
  `NewDevAvailabilityPanel.tsx`, `useProjectUnits.ts`.

### Outcome
- Project ↔ unit stay two distinct pages/entities for every project and every unit (not a single
  hardcoded example). The unit page is purely the individual listing plus one clear link back up
  to its parent project.

## 24. Removal of the Separate Development/Project Page — One Detail Page per Property (DONE)

Goal: the design had been going in circles because a “project page” and a “unit page” were both
resolving for the same underlying record. Decision: **remove the dedicated development/project page
entirely** and make every listing resolve to its single `/property/{slug}` detail page. The
individual property page is the one canonical detail page.

### Deleted
- **Page:** `src/pages/DevelopmentDetail.tsx`.
- **Its components:** `src/pages/DevelopmentDetail/components/` — `InventorySection.tsx`,
  `UnitCard.tsx`, `ProjectInfoSections.tsx`, `NearbyPlaces.tsx` (all only used by that page).
- **Orphaned hooks/libs:** `src/hooks/useDevelopmentProject.ts` (both `useDevelopmentProject` and
  `useUnitProjectLink`), `src/hooks/useDevelopmentDetail.ts`, `src/lib/developmentInfo.ts`.
- **Route:** removed `{ path: "/development/:slug" }` and the `DevelopmentDetail` lazy import from
  `src/router/config.tsx`.

### Re-pointed to the individual property page (`/property/{slug}`)
- `DevelopmentCard` + `FeaturedDevelopmentCard` — the detail link / “See more” destination and the
  “View property” CTA now go to `/property/{development.slug}` (a real listing slug).
- `DevelopmentModal` — the “View property” CTA now opens `/property/{slug}`.
- `RecentlyViewedDevelopments` rail — each entry links to `/property/{slug}`.
- `PropertyDetail` — removed the now self-referential “See more of this project” link (it pointed at
  the deleted project page, and would otherwise link to its own page).
- `sitemap` edge function — new-development units are emitted under `${SITE}/property/{slug}` and the
  function was redeployed.

### Kept (still shared / used elsewhere)
- `DevelopmentGallery` and `DevelopmentProjectModel` (used by the New Developments index cards and
  the preview modal), `developmentModel.ts`, `developmentUnits.ts`, `useNewDevelopments.ts`.
  The New Developments index and its preview modal are unchanged apart from the route target above.

## 25. Development Page Restored + CRM-Owned Key Information & Utilities (DONE)

Goal: the dedicated development/project page (`/development/:slug` → `DevelopmentDetail`) is back
(the "See more of this development" link on a card points at it, while "View property" keeps going
to the single unit listing), and its **Key information** / **Utilities & more details** blocks are now
real, CRM-entry fields — not values guessed from a leftover listing row.

### CRM fields (the missing piece)
- **Table:** `developments` gained project-level columns: `tenure`, `service_charge` (numeric),
  `council_tax_band`, `ground_rent`, `ground_rent_review`, `lease_length`, `water_supply`,
  `electricity`, `heating`, `sewerage`, `broadband`, `broadband_speed`, `mobile_coverage`,
  `parking_notes`.
- **CRM form:** new **Key Info** step (`DevelopmentKeyInfoStep.tsx`) in `DevelopmentEdit` with
  *Ownership & Key Information* and *Utilities & Services* cards; wired through
  `DevelopmentFormState` (`types.ts`), load (`fetchDevelopment`) and save (`buildDevPayload`).
- A field left blank renders the honest **"Ask agent"** fallback on the public page — never fabricated.

### Public page reads from the CRM DB
- `developmentModel.ts` gained a `DevelopmentProjectInfo` model (`buildProjectInfo` reads the
  `developments` record; `applyProjectRecord` overlays it onto the project built from unit rows),
  exposed on `Development.projectInfo`.
- `developmentInfo.ts` now prefers `projectInfo` for Tenure / Service charge / Council tax band /
  Ground rent / Ground rent review / Lease length and for the standard utility rows (Water,
  Electricity, Heating, Sewerage, Broadband, Broadband speed, Mobile coverage, Parking), falling
  back to the representative unit's columns/custom fields only when the project field is blank.