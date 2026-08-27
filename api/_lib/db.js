// Postgres client shared by every API route. Uses plain `pg` (not
// @vercel/postgres) because @vercel/postgres is built on Neon's serverless
// driver, which only talks to Neon-hosted databases (or a custom WebSocket
// proxy) — it can't reach a plain Postgres host like Supabase. `pg` connects
// over standard TCP/SSL, which works with any provider.
//
// This project's database is provisioned via the Vercel + Supabase
// integration, which prefixes its env vars with STORAGE_ (STORAGE_POSTGRES_URL,
// STORAGE_POSTGRES_PRISMA_URL, ...) rather than the plain POSTGRES_URL that
// Vercel's own Postgres/Neon storage uses. We check both so this keeps
// working if the project ever switches storage providers.

import pg from 'pg';

// pg returns bigint/bigserial columns (OID 20) as JS strings by default, to
// avoid precision loss on values bigger than Number.MAX_SAFE_INTEGER. Every
// id/foreign-key column in this schema is bigserial/bigint, and the CRM
// frontend compares those ids with === after Number(...) conversions —
// mixing "3" and 3 makes those comparisons silently fail (couldn't find a
// template to edit, delete appearing to do nothing, checkboxes not
// reflecting saved state). Our ids are nowhere near unsafe-integer range, so
// parsing them as numbers here is safe and fixes that whole class of bug in
// one place instead of patching every comparison site.
pg.types.setTypeParser(20, (val) => parseInt(val, 10));

const connectionString =
  process.env.STORAGE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error(
    'No Postgres connection string found. Set STORAGE_POSTGRES_URL (Supabase integration) or POSTGRES_URL.'
  );
}

// Supabase's connection string includes `sslmode=require`. pg-connection-string
// now treats that as full certificate verification and derives its own ssl
// config from it, which wins over an `ssl` option passed alongside
// `connectionString` — so `ssl: { rejectUnauthorized: false }` below gets
// silently overridden and the connection fails with "self-signed certificate
// in certificate chain" (Supabase's CA isn't in Node's default trust store).
// Stripping sslmode from the query string (leaving the rest of the URL,
// including the user/password, untouched) lets our explicit ssl option apply.
function withoutSslMode(connStr) {
  const [base, query] = connStr.split('?');
  if (!query) return connStr;
  const params = new URLSearchParams(query);
  params.delete('sslmode');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

const pool = new pg.Pool({
  connectionString: withoutSslMode(connectionString),
  ssl: { rejectUnauthorized: false },
});

// Tagged-template helper matching @vercel/postgres's `sql` API, so call
// sites (`await sql\`select * from t where id = ${id}\``) don't need to
// change: sql`text${a}more${b}` -> query("text$1more$2", [a, b]).
export async function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + strings[i + 1];
  }
  return pool.query(text, values);
}
