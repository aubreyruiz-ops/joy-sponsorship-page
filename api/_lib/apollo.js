// Apollo.io contact sync. Docs: https://apolloio.github.io/apollo-api-docs/
// Uses the "Create a Contact" endpoint, which also updates the existing
// contact when the email already exists in the account.
//
// NOTE: verify this against Apollo's current API docs the first time you use
// a real APOLLO_API_KEY — Apollo has changed auth/request shape across API
// versions before. If a sync fails, the raw Apollo error is surfaced to the
// CRM UI to make that easy to spot and adjust here.

const APOLLO_CONTACTS_URL = 'https://api.apollo.io/v1/contacts';

function splitName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { first_name: '', last_name: '' };
  const parts = trimmed.split(/\s+/);
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

export async function upsertApolloContact({ email, name, company, website }) {
  if (!process.env.APOLLO_API_KEY) {
    throw new Error('APOLLO_API_KEY env var is not set.');
  }
  const { first_name, last_name } = splitName(name);

  const response = await fetch(APOLLO_CONTACTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.APOLLO_API_KEY,
      email,
      first_name,
      last_name,
      organization_name: company || undefined,
      website_url: website || undefined,
    }),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.error || data?.message || text || `Apollo returned ${response.status}`;
    throw new Error(message);
  }

  const contactId = data?.contact?.id;
  if (!contactId) {
    throw new Error('Apollo response did not include a contact id: ' + text);
  }
  return contactId;
}
