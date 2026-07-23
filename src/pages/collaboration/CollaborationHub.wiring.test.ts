import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hub = readFileSync(join(__dirname, 'CollaborationHub.tsx'), 'utf8');
const api = readFileSync(join(__dirname, '../../services/collaborationApi.ts'), 'utf8');
const catalog = readFileSync(join(__dirname, '../../services/collaborationLocalCatalog.ts'), 'utf8');
const permissions = readFileSync(join(__dirname, '../../lib/users/permissions.ts'), 'utf8');
const roleRoutes = readFileSync(join(__dirname, '../../config/emergencyRolePermissions.ts'), 'utf8');

describe('Collaboration Hub platform wiring', () => {
  it('falls back to local desk seed when live auth is missing', () => {
    expect(hub).toContain('buildLocalCollaborationSeed');
    expect(hub).toContain('hasCollaborationLiveAuth');
    expect(hub).toContain('applyLocalSeed');
    expect(hub).toContain("dataSource === 'local-demo'");
    expect(api).toContain('getStoredAccessToken');
    expect(api).toContain('unauthorizedResult');
  });

  it('defaults registration clerk to Reception channel', () => {
    expect(catalog).toContain("departmentKey: 'reception'");
    expect(catalog).toContain('registration_clerk');
    expect(hub).toContain('pickDefaultCollaborationChannel');
  });

  it('supports deep-link query params from reception', () => {
    expect(hub).toContain("searchParams.get('channel')");
    expect(hub).toContain("searchParams.get('patientId')");
    expect(hub).toContain('createLocalPatientThreadChannel');
  });

  it('registration clerk has collaboration permissions and route', () => {
    expect(permissions).toMatch(/registration_clerk:[\s\S]*COLLABORATION_READ[\s\S]*COLLABORATION_POST/);
    expect(roleRoutes).toMatch(/registrationClerk[\s\S]*ROUTES\.collaboration/);
  });
});
