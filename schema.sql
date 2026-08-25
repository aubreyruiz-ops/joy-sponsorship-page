-- Sponsor Network application form storage.
-- Run this once against your Postgres database (Vercel Postgres / Neon)
-- before the /api/submit-application function will work.
--
-- Via the Vercel dashboard: Storage -> your Postgres DB -> Query, paste this in and run.
-- Or from a terminal with the Postgres CLI: psql "$POSTGRES_URL" -f schema.sql

create table if not exists sponsor_applications (
  id              bigserial primary key,
  name            text not null,
  email           text not null,
  company         text not null,
  website         text not null,
  audience        jsonb not null default '[]'::jsonb,
  audience_other  text default '',
  budget          text not null,
  event_format    jsonb not null default '[]'::jsonb,
  consent         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_sponsor_applications_email on sponsor_applications (email);
create index if not exists idx_sponsor_applications_created_at on sponsor_applications (created_at desc);
