# Joy Sponsor Network

Static landing page + multi-step application form for Joy's sponsor network, with a Vercel
serverless function that writes submissions into Postgres.

## What's in here

- `sponsor-network-landing.html` — public marketing page (`/sponsor-network-landing`, and `/` redirects here)
- `sponsor-network-application.html` — the application form (`/sponsor-network-application`)
- `logos/` — sponsor logo assets used in the landing page marquee
- `api/submit-application.js` — serverless function the form POSTs to; validates and inserts into Postgres
- `schema.sql` — creates the `sponsor_applications` table
- `vercel.json` — clean URLs (drops `.html`) and a root redirect to the landing page
- `.env.example` — the one env var this needs (`POSTGRES_URL`)

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
- There's no admin view yet for reading submissions back out of `sponsor_applications` — that's
  a natural next step (a simple authenticated page or API route that queries the table).
- The "Forward this page along" link on the confirmation screen opens a `mailto:` with a
  pre-filled subject/body pointing at the live landing page URL; no further wiring needed there.
- Sponsor logos in `logos/` are the real assets provided; there's no Atomicwork logo file, so
  that one sponsor still renders as a text wordmark on the landing page.
