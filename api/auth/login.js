// Simple username/password login for the CRM (no OAuth). The one allowed
// credential pair lives entirely in env vars (CRM_USERNAME / CRM_PASSWORD),
// set in the Vercel dashboard — never in code.

import { createHash, timingSafeEqual } from 'node:crypto';
import { signSession, sessionCookie } from '../_lib/session.js';

function constantTimeEquals(a, b) {
  // Hash both first so we're always comparing equal-length buffers —
  // timingSafeEqual throws on mismatched lengths, which would otherwise
  // leak whether the guess had the right length.
  const hashA = createHash('sha256').update(String(a)).digest();
  const hashB = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(hashA, hashB);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedUsername = process.env.CRM_USERNAME;
  const expectedPassword = process.env.CRM_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    return res.status(500).json({ error: 'CRM login is not configured.' });
  }

  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');

  const usernameOk = constantTimeEquals(username, expectedUsername);
  const passwordOk = constantTimeEquals(password, expectedPassword);

  if (!usernameOk || !passwordOk) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = await signSession({ username: expectedUsername });
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ ok: true });
}
