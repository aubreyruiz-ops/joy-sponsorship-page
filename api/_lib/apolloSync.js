// Polls Apollo's sent-email search endpoint and marks a CRM template as
// "sent" to a contact when an email with a matching subject line shows up as
// sent to that contact's email address in Apollo.
//
// Apollo has no webhook for "email sent" — this endpoint is the only way to
// detect it, so this is called on a schedule (api/cron/sync-apollo-status.js)
// and on-demand (api/refresh-apollo-status.js). Matching is by subject line
// because Apollo's API doesn't expose an internal "template name" — only the
// subject actually used and the sequence/campaign name.
//
// Docs: https://docs.apollo.io/reference/search-for-outreach-emails

import { sql } from './db.js';

const APOLLO_SEARCH_URL = 'https://api.apollo.io/v1/emailer_messages/search';
const PER_PAGE = 100;
const MAX_PAGES = 10; // safety cap: 1,000 most recent outreach emails

export async function syncApolloSentStatus() {
  if (!process.env.APOLLO_API_KEY) {
    throw new Error('APOLLO_API_KEY env var is not set.');
  }

  const [{ rows: applications }, { rows: templates }] = await Promise.all([
    sql`select id, email from sponsor_applications where apollo_contact_id is not null`,
    sql`select id, subject from email_templates where subject is not null and subject <> ''`,
  ]);

  if (applications.length === 0 || templates.length === 0) {
    return { checked: 0, matched: 0 };
  }

  const applicationIdByEmail = new Map(applications.map((a) => [a.email.toLowerCase(), a.id]));
  const templateIdBySubject = new Map(templates.map((t) => [t.subject.trim().toLowerCase(), t.id]));

  let matched = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(APOLLO_SEARCH_URL);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(PER_PAGE));

    const response = await fetch(url, {
      headers: { 'X-Api-Key': process.env.APOLLO_API_KEY },
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (!response.ok) {
      const message = data?.error || data?.message || text || `Apollo returned ${response.status}`;
      throw new Error(message);
    }

    const messages = data.emailer_messages || [];
    if (messages.length === 0) break;

    for (const msg of messages) {
      if (!msg.completed_at) continue; // not actually sent yet (scheduled/draft/failed)

      const applicationId = applicationIdByEmail.get(String(msg.to_email || '').toLowerCase());
      const templateId = templateIdBySubject.get(String(msg.subject || '').trim().toLowerCase());
      if (!applicationId || !templateId) continue;

      await sql`
        insert into application_template_sends (application_id, template_id, sent_by, sent_at, source)
        values (${applicationId}, ${templateId}, 'apollo-sync', ${msg.completed_at}, 'apollo')
        on conflict (application_id, template_id) do update
          set sent_at = excluded.sent_at, source = 'apollo'
      `;
      matched++;
    }

    if (messages.length < PER_PAGE) break; // last page
  }

  return { checked: applications.length, matched };
}
