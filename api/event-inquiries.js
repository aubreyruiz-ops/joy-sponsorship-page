// Protected: lists corporate event planning inquiries for the CRM's
// "Event inquiries" tab.

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
    const { rows } = await sql`select * from event_inquiries order by created_at desc`;
    return res.status(200).json({ inquiries: rows });
  } catch (err) {
    console.error('event inquiries list error:', err);
    return res.status(500).json({ error: 'Something went wrong: ' + err.message });
  }
}
