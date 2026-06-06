# Enterprise Identity Layer

## Purpose

The Enterprise Identity Layer prepares CareDroid for tenant-managed identity federation. It defines a canonical Identity Provider Registry so product, implementation, and security teams can see which enterprise login options are supported today, planned for rollout, or unavailable.

## Registry API

- Backend endpoint: `GET /api/auth/identity-providers`
- Frontend surface: Settings → Enterprise Identity
- Registry statuses: `supported`, `planned`, `unavailable`

The registry is read-only. It does not store customer secrets or activate SSO by itself.

## Provider Registry

| Provider | Protocol | Status | Notes |
| --- | --- | --- | --- |
| Enterprise SSO | Policy layer | Planned | Umbrella routing and tenant-domain discovery layer for organization-managed login. |
| SAML 2.0 | SAML | Planned | Placeholder endpoint exists at `/api/auth/saml`; metadata exchange and assertion validation are planned. |
| OpenID Connect | OIDC | Planned | Placeholder endpoint exists at `/api/auth/oidc`; issuer discovery, callback handling, and JWKS validation are planned. |
| Azure AD / Microsoft Entra ID | OIDC | Planned | Prepared as an OIDC preset with tenant ID and group-claims mapping. |
| Okta | OIDC or SAML | Planned | Prepared for Okta tenant-specific SSO configuration. |
| Google Workspace | OAuth2 | Supported when configured | Uses the existing Google OAuth route at `/api/auth/google`; Workspace domain enforcement is planned as tenant policy. |

## Status Definitions

- `supported`: a provider has a usable backend entry path in the current environment.
- `planned`: the provider is modeled in the registry and has an implementation path, but tenant configuration or protocol validation is not complete.
- `unavailable`: the provider is intentionally not offered in the current product surface.

## Tenant Configuration Model

Future tenant identity configuration should live with tenant administration settings and include:

- Provider ID from the registry.
- Tenant or domain identifiers.
- SAML metadata URL or XML.
- OIDC issuer, client ID, and callback configuration.
- Group-to-role mappings.
- Just-in-time provisioning policy.
- Break-glass local administrator policy.

## Rollout Sequence

1. Keep the registry available to admins and implementation teams.
2. Add tenant-level identity configuration storage.
3. Implement OIDC issuer discovery and callback validation.
4. Add SAML metadata ingestion and assertion validation.
5. Add provider presets for Azure AD, Okta, and Google Workspace domain policy.
6. Add role and permission mapping for enterprise groups.

This keeps identity readiness visible now while avoiding hard-coded customer SSO behavior before secure tenant configuration exists.
