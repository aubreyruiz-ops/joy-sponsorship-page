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

-- Internal CRM additions: withjoy.com-only login (auth itself needs no tables —
-- sessions are stateless signed cookies), Apollo sync tracking, and a registry of
-- email-template links with per-contact "sent" tracking.

alter table sponsor_applications add column if not exists apollo_contact_id text;
alter table sponsor_applications add column if not exists apollo_synced_at timestamptz;

create table if not exists email_templates (
  id          bigserial primary key,
  name        text not null,
  url         text,
  subject     text,
  body_html   text,
  created_by  text,
  created_at  timestamptz not null default now()
);
alter table email_templates alter column url drop not null;

create table if not exists application_template_sends (
  application_id  bigint not null references sponsor_applications(id) on delete cascade,
  template_id     bigint not null references email_templates(id) on delete cascade,
  sent_by         text,
  sent_at         timestamptz not null default now(),
  source          text not null default 'manual',
  primary key (application_id, template_id)
);
alter table application_template_sends add column if not exists source text not null default 'manual';
