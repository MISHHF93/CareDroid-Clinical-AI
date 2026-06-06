# White Label Engine

## Purpose

The White Label Engine lets each hospital brand CareDroid at the tenant level without code changes.
Tenant branding is stored on the organization record and flows into login, shell, and dashboard experiences.

## Branding Fields

Tenant branding supports:

- Organization display name.
- Logo URL.
- Favicon URL.
- Primary color.
- Accent color.
- Theme preference: `system`, `light`, or `dark`.
- Login title.
- Login subtitle.
- Login background image URL.
- Dashboard title.
- Dashboard subtitle.
- Dashboard logo URL.

## Storage

Branding is stored in `organization.branding` and normalized through the organization engine.
Tenant admins can edit it from `/tenant-admin`; updates are saved through:

- `PATCH /api/organizations/:organizationId/tenant-admin`
- `PATCH /api/organizations/:organizationId/settings`

The normalized branding object is also returned by:

- `GET /api/organizations/:organizationId/engine`
- `GET /api/organizations/:organizationId/tenant-admin`

## Public Login Branding

Login screens need branding before a user is authenticated. The read-only public endpoint exposes only white-label metadata:

- `GET /api/white-label/:tenantId`

The frontend resolves tenant branding from:

- `?tenant=...`, `?tenantId=...`, or `?org=...`
- cached tenant branding from the last tenant session
- subdomain fallback when running on a multi-tenant host

No users, subscriptions, permissions, or admin settings are exposed by the public white-label endpoint.

## Frontend Application

`WhiteLabelProvider` applies tenant branding globally:

- Updates `document.title`.
- Installs the tenant favicon.
- Sets tenant CSS variables for primary/accent color.
- Applies login background image.
- Caches tenant branding for the next login screen.

The login shell renders the tenant logo and display name. The auth form uses tenant login title and subtitle.
The sidebar renders the tenant logo/name. The command dashboard uses dashboard title, subtitle, and dashboard logo.

## No-Code Admin Flow

Hospital administrators can open `/tenant-admin`, update branding fields, save, and refresh the tenant context.
No deploy or code edit is required for customer-specific branding changes.
