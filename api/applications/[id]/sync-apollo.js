// Protected: POST pushes this contact into Apollo (create-or-update by
// email) and records the resulting apollo_contact_id/apollo_synced_at.
// On-demand only — never triggered by the public application form.

import { sql } from '@vercel/postgres';
import { requireAuth } from '../../_lib/requireAuth.js';
import { upsertApolloContact } from '../../_lib/apollo.js';

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const applicationId = Number(req.query.id);
  if (!Number.isInteger(applicationId)) {
    return res.status(400).json({ error: 'Invalid application id.' });
  }

  try {
    const { rows } = await sql`select * from sponsor_applications where id = ${applicationId}`;
    const application = rows[0];
    if (!application) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    const apolloContactId = await upsertApolloContact({
      email: application.email,
      name: application.name,
      company: application.company,
      website: application.website,
    });

    const { rows: updated } = await sql`
      update sponsor_applications
      set apollo_contact_id = ${apolloContactId}, apollo_synced_at = now()
      where id = ${applicationId}
      returning apollo_contact_id, apollo_synced_at
    `;

    return res.status(200).json({ ok: true, ...updated[0] });
  } catch (err) {
    console.error('sync-apollo error:', err);
    return res.status(502).json({ error: 'Apollo sync failed: ' + err.message });
  }
}
