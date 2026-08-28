// Vercel serverless function (Node.js runtime).
// Receives the sponsor application form payload from sponsor-network-application.html
// and inserts it into the Postgres database created via schema.sql.
//
// Requires a Postgres connection string env var — see api/_lib/db.js for
// which ones it checks (STORAGE_POSTGRES_URL for the Supabase integration,
// or POSTGRES_URL for Vercel's own Postgres/Neon storage).

import { sql } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const company = (body.company || '').trim();
    const website = (body.website || '').trim();
    const audience = Array.isArray(body.audience) ? body.audience : [];
    const audienceOther = (body.audience_other || '').trim();
    const budget = (body.budget || '').trim();
    const format = Array.isArray(body.format) ? body.format : [];
    const consent = body.consent === true;
    const event = (body.event || 'general').trim() || 'general';
    const tier = (body.tier || '').trim();

    // Event-specific sponsor forms (e.g. after-hours-london) collect a tier
    // instead of a free-text budget and event format list.
    const isEventForm = event !== 'general';

    // Required-field validation mirrors the required questions on the form.
    if (!name || !email || !company || !website) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (audience.length === 0) {
      return res.status(400).json({ error: 'Please select at least one audience.' });
    }
    if (isEventForm) {
      if (!tier) {
        return res.status(400).json({ error: 'Please select a sponsorship tier.' });
      }
    } else {
      if (!budget) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }
      if (format.length === 0) {
        return res.status(400).json({ error: 'Please select at least one event format.' });
      }
    }
    if (!consent) {
      return res.status(400).json({ error: 'Email consent is required.' });
    }

    await sql`
      INSERT INTO sponsor_applications
        (name, email, company, website, audience, audience_other, budget, event_format, consent, event, tier)
      VALUES
        (${name}, ${email}, ${company}, ${website}, ${JSON.stringify(audience)}::jsonb,
         ${audienceOther}, ${budget}, ${JSON.stringify(format)}::jsonb, ${consent}, ${event}, ${tier})
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-application error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
