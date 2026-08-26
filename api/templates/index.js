// Protected: the email-template link registry. Templates live wherever the
// team actually writes them (Apollo, Intercom, Google Docs, ...) — this just
// stores a name + link so the CRM can reference them.

import { sql } from '@vercel/postgres';
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
    const url = (req.body?.url || '').trim();
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required.' });
    }
    try {
      const { rows } = await sql`
        insert into email_templates (name, url, created_by)
        values (${name}, ${url}, ${session.username})
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
