# Joy Sponsor Network

Static landing page + multi-step application form for Joy's sponsor network, with a Vercel
serverless function that writes submissions into Postgres.

## What's in here

- `sponsor-network-landing.html` — public marketing page (`/sponsor-network-landing`, and `/` redirects here)
- `sponsor-network-application.html` — the application form (`/sponsor-network-application`)
- `logos/` — sponsor logo assets used in the landing page marquee
- `api/submit-application.js` — serverless function the form POSTs to; validates and inserts into Postgres
- `crm.html` / `crm-templates.html` — internal CRM (`/crm`, `/crm-templates`), login-gated to `@withjoy.com`
- `api/auth/*` — Google OAuth login/callback/logout/me for the CRM
- `api/applications*`, `api/templates*` — CRM data endpoints (all require a signed-in `@withjoy.com` session)
- `api/_lib/` — shared session signing, auth guard, and Apollo API helpers
- `schema.sql` — creates `sponsor_applications` plus the CRM's `email_templates` / `application_template_sends` tables
- `vercel.json` — clean URLs (drops `.html`) and a root redirect to the landing page
- `.env.example` — required env vars (Postgres, Google OAuth, session secret, Apollo)

## Internal CRM (`/crm`)

Login-gated to `@withjoy.com` Google accounts (a "Team Login" link sits in the landing page footer).
Lists sponsor applications as contacts with their full survey answers, lets you push a contact into
Apollo on demand ("Sync to Apollo"), and tracks — via a manual multi-select per contact — which
templates from the `/crm-templates` link registry have already been sent. No email is sent by this
system; templates are just links to wherever you actually write/send them (Apollo, Intercom, etc.),
and sending itself stays a manual step there.

Setup:
1. In Google Cloud Console, create an OAuth 2.0 **Web application** client. Add an authorized
   redirect URI for each environment you'll use, e.g. `https://your-domain.com/api/auth/callback`
   and `http://localhost:3000/api/auth/callback` for local dev.
2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` (matching the exact URI
   you added above) in the Vercel dashboard's Environment Variables.
3. Set `SESSION_SECRET` to a random string (`openssl rand -base64 32`).
4. Set `APOLLO_API_KEY` from your Apollo.io account (Settings -> Integrations -> API).
5. Re-run `schema.sql` against your database — it's idempotent (`create table if not exists` /
   `add column if not exists`), safe to run again even if `sponsor_applications` already exists.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New Project** and import that repo. No build settings needed — it's static
   HTML plus one serverless function, Vercel detects both automatically.
3. Attach a database: in the project's **Storage** tab, create a Postgres database (Vercel
   Postgres or the Neon integration both work) and connect it to this project. This sets the
   `POSTGRES_URL` env var for you automatically.
4. Run `schema.sql` once against that database — easiest is pasting it into the **Query** tab
   under Storage, or `psql "$POSTGRES_URL" -f schema.sql` from a terminal.
5. Deploy. The form at `/sponsor-network-application` will now write real rows into
   `sponsor_applications`.

For local development: `vercel env pull .env.local` to grab `POSTGRES_URL`, then `npm install`
and `vercel dev`.

## Notes for whoever picks this up next (Claude Code)

- The confirmation screen still has a placeholder testimonial quote — swap it in once real
  testimonials come in (`sponsor-network-application.html`, search for "Placeholder quote").
- The "Forward this page along" link on the confirmation screen opens a `mailto:` with a
  pre-filled subject/body pointing at the live landing page URL; no further wiring needed there.
- Sponsor logos in `logos/` are the real assets provided; there's no Atomicwork logo file, so
  that one sponsor still renders as a text wordmark on the landing page.
