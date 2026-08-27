// Invoked once a day by Vercel Cron (see vercel.json's "crons" entry).
// Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when
// CRON_SECRET is set — this checks that so the endpoint can't be triggered
// by anyone who guesses the path.

import { syncApolloSentStatus } from '../_lib/apolloSync.js';

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await syncApolloSentStatus();
    console.log('apollo status cron sync:', result);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('apollo status cron sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
