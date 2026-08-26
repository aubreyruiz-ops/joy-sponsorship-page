// Apollo.io contact sync. Docs: https://apolloio.github.io/apollo-api-docs/
// Uses the "Create a Contact" endpoint, which also updates the existing
// contact when the email already exists in the account.
//
// Apollo now requires the API key as an `X-Api-Key` header rather than in
// the JSON body (the body-based `api_key` field is rejected with "API key
// must be passed in the X-Api-Key header").

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
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.APOLLO_API_KEY,
    },
    body: JSON.stringify({
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
