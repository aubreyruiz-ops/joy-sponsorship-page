import { sql } from '@vercel/postgres';
import { requireAuth } from '../_lib/requireAuth.js';

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  const templateId = Number(req.query.id);
  if (!Number.isInteger(templateId)) {
    return res.status(400).json({ error: 'Invalid template id.' });
  }

  if (req.method === 'PUT') {
    const name = (req.body?.name || '').trim();
    const url = (req.body?.url || '').trim();
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required.' });
    }
    try {
      const { rows } = await sql`
        update email_templates set name = ${name}, url = ${url} where id = ${templateId} returning *
      `;
      if (!rows[0]) return res.status(404).json({ error: 'Template not found.' });
      return res.status(200).json({ template: rows[0] });
    } catch (err) {
      console.error('template update error:', err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`delete from email_templates where id = ${templateId}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('template delete error:', err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
