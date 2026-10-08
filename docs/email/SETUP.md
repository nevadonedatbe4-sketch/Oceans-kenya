# Email & Password-Reset Setup

All of the code is in place. Website forms already send a visitor confirmation
and notify staff, and the password-reset flow is fully built. They don't send
yet because the mail provider and templates aren't configured. This is the
one-time setup to turn it on — all of it is done in the Resend and Supabase
dashboards, not in the repo.

## How it works (already built)

- Every public form posts to the **`crm-ingest`** edge function, which:
  - sends the visitor a confirmation (`enquiry_auto_response` template), now on
    for every submission unless `auto_response_enabled` is set to `"false"`;
  - notifies the assigned agent / office via **`crm-notify`** (`new_lead` or
    `new_message`).
- CRM events (deals, assignments) also route through `crm-notify`.
- Password reset: **ForgotPassword** → `password-reset-request` (emails a
  single-use, hashed, expiring link via the `password_reset` template) →
  **`/reset-password?token=…`** → `password-reset-confirm` sets the new password.
- All mail is sent through **`send-templated-email`**, which renders a row from
  `email_templates` inside the branded shell and sends via **Resend**.

## One-time setup

### 1. Resend
1. Create an account at resend.com.
2. Add your sending domain (e.g. `oceanske.com`) and complete DNS verification
   (SPF, DKIM, and the return-path records Resend lists). Wait until the domain
   shows **Verified** — Resend refuses to send from an unverified domain.
3. Create an API key (Sending access is enough).

### 2. Supabase edge-function secrets
Dashboard → Project Settings → Edge Functions → Secrets (or
`supabase secrets set …`). Set:

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | the key from Resend |
| `RESEND_FROM_DOMAIN` | the verified domain, e.g. `oceanske.com` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already provided to functions
by the platform. The From address becomes
`<sender_local_part>@<RESEND_FROM_DOMAIN>` (default local part `noreply`).

### 3. Seed the templates
Run **`docs/email/seed-email-templates.sql`** in the SQL editor. It inserts all
nine templates (`enquiry_auto_response`, `new_lead`, `new_message`,
`deal_created`, `deal_status_update`, `agent_assignment`, `team_invitation`,
`welcome`, `password_reset`). It is non-destructive — existing rows are kept, so
later edits in Email Management survive a re-run. The `email_settings` block at
the bottom sets the sender identity: all outbound mail is sent from
**`team@oceanske.com`** (`sender_local_part=team` + `RESEND_FROM_DOMAIN`), with
`Reply-To` also `team@oceanske.com`. Edit that block (or Email Management) to
change it.

### 4. Apply RLS (if not done already)
Run **`docs/security/rls-policies.sql`**. It secures every table and, relevant
here, locks `password_reset_tokens` to the service role only.

### 5. Deploy the functions
These run in Supabase, not on Vercel, so a web deploy does not update them:

```bash
supabase functions deploy send-templated-email crm-ingest crm-notify \
  password-reset-request password-reset-confirm invite-user \
  create-admin-user signup-complete
```

## Verify

1. **Diagnostics** — the send function reports config without sending:
   ```bash
   curl -s -X POST "$SUPABASE_URL/functions/v1/send-templated-email" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"test":true,"to":"you@example.com","template_key":"welcome"}'
   ```
   A `TEMPLATE_NOT_FOUND` means step 3 didn't run; a config error means step 2
   is incomplete.
2. **Forms** — submit the public contact form; the visitor should receive the
   acknowledgement and staff the `new_lead` notification.
3. **Password reset** — use *Forgot password* on the admin or agent sign-in
   page; the reset email should arrive and `/reset-password?token=…` should let
   you set a new password.
4. Watch **Email Management → delivery log** (the `email_log` table): every
   attempt is recorded as `queued` then `sent` / `failed` with the reason.

## Notes

- Nothing is hard-coded: sender identity, branding and the template bodies are
  all editable in Email Management (the `email_settings` and `email_templates`
  tables) without code changes.
- A mail failure never blocks the underlying action — a form still creates its
  lead, an account is still created — the email error is logged instead.
- To silence the visitor auto-reply, set `site_settings.auto_response_enabled`
  to `"false"`. Staff notifications are unaffected by that switch.
