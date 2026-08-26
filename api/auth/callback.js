// Exchanges the authorization code for tokens, verifies Google's id_token,
// and enforces the @withjoy.com restriction server-side before issuing our
// own session cookie. This is the one place that actually gates access —
// the hd= hint on the login redirect is not sufficient on its own.

import { jwtVerify, createRemoteJWKSet } from 'jose';
import {
  readStateCookie,
  clearStateCookie,
  signSession,
  sessionCookie,
} from '../_lib/session.js';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const ALLOWED_DOMAIN = 'withjoy.com';

function redirectTo(res, location, cookies) {
  res.writeHead(302, { Location: location, 'Set-Cookie': cookies });
  res.end();
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  const clearState = clearStateCookie();

  if (error) {
    return redirectTo(res, `/sponsor-network-landing?login_error=${encodeURIComponent(String(error))}`, [clearState]);
  }

  const expectedState = readStateCookie(req);
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectTo(res, '/sponsor-network-landing?login_error=invalid_state', [clearState]);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).send('Google OAuth is not configured.');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      return redirectTo(res, '/sponsor-network-landing?login_error=token_exchange_failed', [clearState]);
    }

    const tokens = await tokenRes.json();
    const { payload: claims } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });

    const email = String(claims.email || '').toLowerCase();
    const domainMatches = claims.hd === ALLOWED_DOMAIN || email.endsWith(`@${ALLOWED_DOMAIN}`);

    if (!claims.email_verified || !domainMatches) {
      return redirectTo(res, '/sponsor-network-landing?login_error=domain_not_allowed', [clearState]);
    }

    const sessionToken = await signSession({
      email,
      name: claims.name || email,
      picture: claims.picture || '',
    });

    return redirectTo(res, '/crm', [clearState, sessionCookie(sessionToken)]);
  } catch (err) {
    console.error('auth callback error:', err);
    return redirectTo(res, '/sponsor-network-landing?login_error=unexpected', [clearState]);
  }
}
