// Protected: PUT { templateIds: [1,3,5] } replaces the set of templates
// marked "sent" for this contact. Backs the multi-select dropdown in the CRM
// — no email is actually sent here, this only records that it happened
// elsewhere (Apollo, Intercom, etc).

import { sql } from '@vercel/postgres';
import { requireAuth } from '../../_lib/requireAuth.js';

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const applicationId = Number(req.query.id);
  if (!Number.isInteger(applicationId)) {
    return res.status(400).json({ error: 'Invalid application id.' });
  }

  const templateIds = Array.isArray(req.body?.templateIds)
    ? req.body.templateIds.map(Number).filter(Number.isInteger)
    : [];

  try {
    await sql`delete from application_template_sends where application_id = ${applicationId}`;
    for (const templateId of templateIds) {
      await sql`
        insert into application_template_sends (application_id, template_id, sent_by)
        values (${applicationId}, ${templateId}, ${session.username})
        on conflict (application_id, template_id) do nothing
      `;
    }
    return res.status(200).json({ ok: true, templateIds });
  } catch (err) {
    console.error('sent-templates update error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
