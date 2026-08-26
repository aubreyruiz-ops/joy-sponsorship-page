// Every protected API route calls this first. Returns the session object on
// success, or writes a 401 JSON response and returns null (caller should
// immediately `return` in that case).

import { readSession } from './session.js';

export async function requireAuth(req, res) {
  const session = await readSession(req);
  if (!session || !session.email || !session.email.toLowerCase().endsWith('@withjoy.com')) {
    res.status(401).json({ error: 'Not signed in.' });
    return null;
  }
  return session;
}
