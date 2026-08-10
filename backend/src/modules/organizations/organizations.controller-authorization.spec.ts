import { TENANT_SCOPE_KEY } from '../tenant-context/tenant-scope.decorator';
import { OrganizationsController } from './organizations.controller';

/**
 * 2026-08-10: getTenantAdministration (GET :organizationId/tenant-admin)
 * returned a full org staff roster (names, specialties, membership roles,
 * roleProfileId), permission overrides, subscription/billing, and no-code
 * configuration to ANY organization member -- gated only by tenant/org
 * membership, unlike its sibling updateTenantAdministration (PATCH, same
 * URL), which already required real backend organization-admin/owner
 * membership via `admin: 'organization'`. Found while investigating a
 * separate, still-open frontend route-access question (HEAL-058 / MB-P0-3):
 * the backend read side of the same "tenant administration" resource had no
 * admin-scope check at all. Fixed by adding the same `admin: 'organization'`
 * policy the PATCH route already carries.
 */
describe('OrganizationsController — tenant-admin read/write require the same admin scope (2026-08-10)', () => {
  it('getTenantAdministration requires organization admin scope, matching its PATCH sibling', () => {
    const handler = OrganizationsController.prototype.getTenantAdministration;
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(TENANT_SCOPE_KEY, handler);
    expect(metadata).toMatchObject({ level: 'organization', admin: 'organization' });
  });

  it('updateTenantAdministration requires organization admin scope', () => {
    const handler = OrganizationsController.prototype.updateTenantAdministration;
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(TENANT_SCOPE_KEY, handler);
    expect(metadata).toMatchObject({ level: 'organization', admin: 'organization' });
  });
});
