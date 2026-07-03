import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SECURITY_CONTRACT } from './securityModel';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

function readRepoFile(relPath: string): string {
  const fullPath = join(repoRoot, relPath.replace(/\//g, '\\'));
  expect(existsSync(fullPath), relPath).toBe(true);
  return readFileSync(fullPath, 'utf8');
}

describe('security permission coverage contract', () => {
  it('routes UI gates through useSecurityAccess', () => {
    const permissionGate = readRepoFile('src/components/PermissionGate.tsx');
    const routeGuard = readRepoFile('src/components/auth/CareDroidRouteGuard.tsx');
    expect(permissionGate).toContain('useSecurityAccess');
    expect(routeGuard).toContain('useSecurityAccess');
  });

  it('delegates UserContext permission checks through the security barrel', () => {
    const userContext = readRepoFile('src/contexts/UserContext.tsx');
    expect(userContext).toContain("from '../config/security'");
    expect(userContext).toContain('checkSecurityPermission');
    expect(userContext).toContain('return checkSecurityPermission(securityContext, permission)');
  });

  it('delegates emergency role permissions through securityAccessService', () => {
    const emergencyHook = readRepoFile('src/hooks/useEmergencyRolePermissions.ts');
    expect(emergencyHook).toContain('checkEmergencyPermission');
    expect(emergencyHook).toContain('checkEmergencyMutation');
    expect(emergencyHook).not.toContain('hasEmergencyActionPermission(');
    expect(emergencyHook).not.toContain('canPerformEmergencyAction(');
  });

  it('audits PHI on canonical patient detail surfaces', () => {
    const patientCard = readRepoFile('src/components/PatientCard.tsx');
    const patientDetail = readRepoFile('src/components/PatientDetailPanel.tsx');
    expect(patientCard).toContain('usePhiViewAudit');
    expect(patientDetail).toContain('usePhiViewAudit');
    expect(patientCard).not.toContain('assertPhiAccess(');
  });

  it('short-circuits protected API calls in apiClient', () => {
    const apiClient = readRepoFile('src/services/apiClient.ts');
    expect(apiClient).toContain('shouldShortCircuitProtectedApi');
    expect(apiClient).toContain('isSecurityPublicApiPath');
  });

  it('registers canonical security sources in SECURITY_CONTRACT', () => {
    expect(SECURITY_CONTRACT.canonicalSources.accessCompilation).toBe('lib/users/canonicalAccess');
    expect(SECURITY_CONTRACT.canonicalSources.auditSync).toBe('/api/audit/sync');
    expect(SECURITY_CONTRACT.canonicalSources.backendPermissions).toBe(
      'backend/modules/auth/enums/permission.enum',
    );
  });

  it('exports consolidated security services from the security barrel', () => {
    const barrel = readRepoFile('src/config/security.ts');
    expect(barrel).toContain('securityAccessService');
    expect(barrel).toContain('phiAccessService');
    expect(barrel).toContain('securityAuditService');
    expect(barrel).toContain('securityApiBoundary');
  });

  it('schedules deferred security audit sync on startup', () => {
    const startup = readRepoFile('src/utils/deferStartupTasks.ts');
    expect(startup).toContain('flushPendingSecurityAudits');
  });
});