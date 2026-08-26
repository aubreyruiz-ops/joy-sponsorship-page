// Redirects to Google's OAuth consent screen. hd=withjoy.com is only a UI
// hint (pre-fills/filters the account chooser) — the actual domain check
// happens server-side in callback.js, since hd can't be trusted on its own.

import { randomBytes } from 'node:crypto';
import { stateCookie } from '../_lib/session.js';

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).send('Google OAuth is not configured (missing GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI).');
  }

  const state = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    hd: 'withjoy.com',
    prompt: 'select_account',
    state,
  });

  res.setHeader('Set-Cookie', stateCookie(state));
  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  res.end();
}
