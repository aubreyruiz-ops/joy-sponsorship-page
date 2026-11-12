// Vercel serverless function (Node.js runtime).
// Receives the "Plan your event" form from corporate-events-inquiry.html and
// inserts it into the event_inquiries table (see schema.sql). These show up
// on the CRM's "Event inquiries" tab, separate from sponsor applications.

import { sql } from './_lib/db.js';

const clean = (v, max = 2000) => String(v == null ? '' : v).trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const name = clean(body.name, 200);
    const email = clean(body.email, 320);
    const company = clean(body.company, 200);
    const website = clean(body.website, 300);
    const eventType = clean(body.event_type, 200);
    const services = Array.isArray(body.services)
      ? body.services.map((s) => clean(s, 120)).filter(Boolean).slice(0, 20)
      : [];
    const guestCount = clean(body.guest_count, 120);
    const timing = clean(body.timing, 300);
    const location = clean(body.location, 300);
    const notes = clean(body.notes, 4000);
    const consent = body.consent === true;

    if (!name || !email || !company || !eventType || !guestCount) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (services.length === 0) {
      return res.status(400).json({ error: 'Please select at least one service.' });
    }
    if (!consent) {
      return res.status(400).json({ error: 'Consent is required.' });
    }

    await sql`
      INSERT INTO event_inquiries
        (name, email, company, website, event_type, services, guest_count, timing, location, notes, consent)
      VALUES
        (${name}, ${email}, ${company}, ${website}, ${eventType}, ${JSON.stringify(services)}::jsonb,
         ${guestCount}, ${timing}, ${location}, ${notes}, ${consent})
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-event-inquiry error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
