import { clearSessionCookie } from '../_lib/session.js';

export default function handler(req, res) {
  res.writeHead(302, { Location: '/sponsor-network-landing', 'Set-Cookie': clearSessionCookie() });
  res.end();
}
