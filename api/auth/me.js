import { readSession } from '../_lib/session.js';

export default async function handler(req, res) {
  const session = await readSession(req);
  if (!session || !session.username) {
    return res.status(401).json({ error: 'Not signed in.' });
  }
  return res.status(200).json(session);
}
