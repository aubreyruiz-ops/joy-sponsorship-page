// Shared session helpers used by /api/auth/* and every protected route (via
// requireAuth.js). Sessions are stateless: a signed JWT stored in an httpOnly
// cookie, no server-side session store needed.

import { SignJWT, jwtVerify } from 'jose';
import { serialize, parse } from 'cookie';

const COOKIE_NAME = 'joy_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET env var is not set.');
  }
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export function sessionCookie(token) {
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie() {
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function readSession(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { username: payload.username };
  } catch {
    return null;
  }
}
