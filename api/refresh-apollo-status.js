// Protected: the CRM's "Refresh from Apollo" button. Runs the same sync as
// the daily cron, on demand, for immediate feedback instead of waiting for
// the once-a-day schedule.

import { requireAuth } from './_lib/requireAuth.js';
import { syncApolloSentStatus } from './_lib/apolloSync.js';

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await syncApolloSentStatus();
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('refresh-apollo-status error:', err);
    return res.status(502).json({ error: 'Apollo status refresh failed: ' + err.message });
  }
}
