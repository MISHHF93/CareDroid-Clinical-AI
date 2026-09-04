/**
 * Whether an OAuth credential value is a real, configured value rather than
 * the documentation placeholder that ships in backend/.env.example.
 *
 * `Boolean(clientId)` counted the placeholder
 * `your-google-client-id.apps.googleusercontent.com` as configured, so the
 * identity-provider registry advertised Google sign-in as "supported" and the
 * /api/auth/google route bounced users to Google with that bogus client id
 * (found by the 2026-09-04 backend route sweep: LinkedIn's side answered 500).
 */
const PLACEHOLDER_PATTERNS = [
  /^your[-_]/i,
  /^(changeme|change-me|replace-me|replaceme|todo|tbd|xxx+|placeholder|dummy|example|sample|test)$/i,
  /^<.*>$/,
  /^\$\{.*\}$/,
];

export function isConfiguredCredential(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 8) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Both halves of an OAuth client must be real for the provider to be usable. */
export function isOAuthProviderConfigured(
  provider: { clientId?: unknown; clientSecret?: unknown } | null | undefined,
): boolean {
  return Boolean(
    provider &&
      isConfiguredCredential(provider.clientId) &&
      isConfiguredCredential(provider.clientSecret),
  );
}
