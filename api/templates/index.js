// Protected: the email-template registry (name, subject, HTML body). The
// subject is also the matching key used by api/_lib/apolloSync.js to detect
// when this template has actually been sent to a contact via Apollo.

import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/requireAuth.js';

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`select * from email_templates order by created_at desc`;
      return res.status(200).json({ templates: rows });
    } catch (err) {
      console.error('templates list error:', err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  }

  if (req.method === 'POST') {
    const name = (req.body?.name || '').trim();
    const subject = (req.body?.subject || '').trim();
    const bodyHtml = (req.body?.body_html || '').trim();
    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'Name, subject, and HTML body are required.' });
    }
    try {
      const { rows } = await sql`
        insert into email_templates (name, subject, body_html, created_by)
        values (${name}, ${subject}, ${bodyHtml}, ${session.username})
        returning *
      `;
      return res.status(201).json({ template: rows[0] });
    } catch (err) {
      console.error('template create error:', err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
