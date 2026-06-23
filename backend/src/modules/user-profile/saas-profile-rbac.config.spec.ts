import {
  hasSaasProfilePermission,
  resolveSaasProfileAllowedPacks,
  resolveSaasProfilePermissions,
} from './saas-profile-rbac.config';
import { Permission } from '../auth/enums/permission.enum';

describe('saas-profile-rbac.config', () => {
  it('maps registration clerk to limited PHI permissions', () => {
    const permissions = resolveSaasProfilePermissions('registration-clerk');
    expect(permissions).toEqual(
      expect.arrayContaining([Permission.READ_PHI, Permission.WRITE_PHI]),
    );
    expect(permissions).not.toContain(Permission.USE_AI_CHAT);
    expect(hasSaasProfilePermission('registration-clerk', Permission.READ_PHI)).toBe(true);
    expect(hasSaasProfilePermission('registration-clerk', Permission.CONFIGURE_SYSTEM)).toBe(
      false,
    );
  });

  it('maps reception desk pack policy for registration clerk', () => {
    expect(resolveSaasProfileAllowedPacks('registration-clerk')).toEqual(
      expect.arrayContaining(['core-platform', 'reception-desk']),
    );
  });

  it('normalizes receptionist aliases to registration clerk permissions', () => {
    expect(resolveSaasProfilePermissions('receptionist')).toEqual(
      resolveSaasProfilePermissions('registration-clerk'),
    );
  });
});
