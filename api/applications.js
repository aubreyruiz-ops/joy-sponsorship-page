// Protected: lists sponsor_applications as CRM "contacts", each with the ids
// of the email templates that have been marked sent to them.

import { sql } from './_lib/db.js';
import { requireAuth } from './_lib/requireAuth.js';

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rows } = await sql`
      select
        a.*,
        coalesce(
          (select jsonb_agg(t.template_id) from application_template_sends t where t.application_id = a.id),
          '[]'::jsonb
        ) as sent_template_ids
      from sponsor_applications a
      order by a.created_at desc
    `;
    return res.status(200).json({ applications: rows });
  } catch (err) {
    console.error('applications list error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
