# Joy Sponsor Network

Static landing page + multi-step application form for Joy's sponsor network, with a Vercel
serverless function that writes submissions into Postgres.

## What's in here

- `sponsor-network-landing.html` — public marketing page (`/sponsor-network-landing`, and `/` redirects here)
- `sponsor-network-application.html` — the application form (`/sponsor-network-application`)
- `logos/` — sponsor logo assets used in the landing page marquee
- `api/submit-application.js` — serverless function the form POSTs to; validates and inserts into Postgres
- `crm.html` / `crm-templates.html` / `crm-login.html` — internal CRM (`/crm`, `/crm-templates`, `/crm-login`)
- `api/auth/*` — username/password login/logout/me for the CRM
- `api/applications*`, `api/templates*`, `api/refresh-apollo-status.js` — CRM data endpoints (all require a signed-in CRM session)
- `api/cron/sync-apollo-status.js` — daily Vercel Cron job, see "Apollo sent-status sync" below
- `api/_lib/db.js` — the shared Postgres client every route imports (see below for why it's plain `pg`, not `@vercel/postgres`)
- `api/_lib/apolloSync.js` — polls Apollo for sent emails and matches them to CRM templates/contacts
- `api/_lib/` — also shared session signing, auth guard, and Apollo contact-sync helpers
- `schema.sql` — creates `sponsor_applications` plus the CRM's `email_templates` / `application_template_sends` tables
- `vercel.json` — clean URLs (drops `.html`) and a root redirect to the landing page
- `.env.example` — required env vars (Postgres, CRM login, session secret, Apollo)

## Internal CRM (`/crm`)

Login-gated by a single username/password pair you set yourself (a "Team Login" link sits in the
landing page footer, pointing at `/crm-login`). Lists sponsor applications as contacts with their
full survey answers, lets you push a contact into Apollo on demand ("Sync to Apollo"), and tracks —
via a per-contact multi-select — which `/crm-templates` templates have been sent to them. Sending
itself still happens in Apollo, not here; templates store the actual name/subject/HTML body so you
can copy them into an Apollo email, and the "sent" status can fill in on its own (see below) once
Apollo shows the send.

Setup:
1. Set `CRM_USERNAME` and `CRM_PASSWORD` to whatever credentials you want in the Vercel dashboard's
   Environment Variables (and in `.env.local` for local dev). There's a single shared login — no
   per-person accounts, no signup flow.
2. Set `SESSION_SECRET` to a random string (`openssl rand -base64 32`).
3. Set `APOLLO_API_KEY` from your Apollo.io account (Settings -> Integrations -> API).
4. Re-run `schema.sql` against your database — it's idempotent (`create table if not exists` /
   `add column if not exists`), safe to run again even if `sponsor_applications` already exists.

There's no lockout/rate-limiting on failed login attempts, so pick a real password, not something
guessable — this is a low-effort deterrent, not hardened auth.

### Apollo sent-status sync

Apollo has no webhook for "email sent," so detecting it means polling `GET /emailer_messages/search`
and matching by **subject line**: a template counts as sent to a contact once Apollo shows a
*completed* email to that contact's address whose subject exactly matches the template's subject
(case-insensitive). This means the subject typed into Apollo when actually sending has to match the
CRM template's subject field exactly, or the match won't happen. Only contacts already synced to
Apollo (`apollo_contact_id` set) are checked.

This runs two ways:
- **Daily**, via the Vercel Cron job in `vercel.json` (`api/cron/sync-apollo-status.js`). Vercel's
  Hobby plan caps cron jobs at once per day with up to ~1hr of scheduling slop — see
  [Vercel's cron docs](https://vercel.com/docs/cron-jobs/usage-and-pricing). Upgrade to Pro for
  per-minute scheduling if you need it faster.
- **On demand**, via the "Refresh from Apollo" button on `/crm`, which runs the exact same sync
  immediately (`api/refresh-apollo-status.js`).

Set `CRON_SECRET` (random string) so the cron endpoint can verify requests actually came from Vercel
Cron — Vercel sends it automatically as `Authorization: Bearer $CRON_SECRET` once the env var exists.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New Project** and import that repo. No build settings needed — it's static
   HTML plus serverless functions, Vercel detects both automatically.
3. Attach a database: in the project's **Storage** tab, connect a Postgres database. Both
   providers work, but they set different env vars, and the code checks both:
   - **Supabase** (via the Vercel Storage marketplace integration) sets `STORAGE_POSTGRES_URL`
     (and friends, all `STORAGE_`-prefixed).
   - **Vercel Postgres / Neon** sets a plain `POSTGRES_URL`.

   Either way, `api/_lib/db.js` connects with plain `pg` over standard TCP/SSL — this matters
   because `@vercel/postgres` (the package Vercel's own quickstarts suggest) is built on Neon's
   serverless driver, which only works against Neon-hosted databases; it can't reach a Supabase
   database at all, even with the right env var name.
4. Run `schema.sql` once against that database — easiest is pasting it into the **SQL Editor**
   (Supabase) or **Query** tab (Vercel Storage), or `psql "$STORAGE_POSTGRES_URL" -f schema.sql`
   (or `$POSTGRES_URL`) from a terminal.
5. Deploy. The form at `/sponsor-network-application` will now write real rows into
   `sponsor_applications`.

For local development: `vercel env pull .env.local` to grab the database env vars, then
`npm install` and `vercel dev`.

## Notes for whoever picks this up next (Claude Code)

- The confirmation screen still has a placeholder testimonial quote — swap it in once real
  testimonials come in (`sponsor-network-application.html`, search for "Placeholder quote").
- The "Forward this page along" link on the confirmation screen opens a `mailto:` with a
  pre-filled subject/body pointing at the live landing page URL; no further wiring needed there.
- Sponsor logos in `logos/` are the real assets provided; there's no Atomicwork logo file, so
  that one sponsor still renders as a text wordmark on the landing page.
