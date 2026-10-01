function getCreatorAllowedDomains() {
  const domains = (process.env.CREATOR_ALLOWED_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  if (
    domains.length === 0
    || domains.some((domain) => !/^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
  ) {
    throw new Error(
      'Defina CREATOR_ALLOWED_DOMAINS no ambiente do backend, separando os domínios por vírgula.'
    );
  }

  return [...new Set(domains)];
}

function isCreatorEmailAllowed(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  return getCreatorAllowedDomains().some((domain) => normalizedEmail.endsWith(domain));
}

module.exports = { getCreatorAllowedDomains, isCreatorEmailAllowed };
