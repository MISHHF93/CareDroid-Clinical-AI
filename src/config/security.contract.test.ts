import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMERGENCY_PLATFORM_CONTRACT } from './emergencyPlatform.config';
import { EMERGENCY_PERMISSION_KEYS } from './emergencyPermissionRegistry';
import { Permission as FrontendPermission } from './backendPermissionCatalog';
import { CAREDROID_PERMISSIONS } from '../lib/users/permissions';
import { BACKEND_PERMISSION_KEYS, SECURITY_CONTRACT } from './securityModel';
import {
  expandPermissionAliases,
  listBridgeCoverage,
  normalizePermission,
  permissionRequiresPhiRead,
} from './securityPermissionBridge';
import {
  canAccessPhi,
  canMutateEmergency,
  checkPermission,
  isProtectedApiPath,
  isPublicApiPath,
} from '../services/securityAccessService';
import {
  validatePatientIdentifier,
  validatePhiMutationRequest,
} from '../services/securityApiBoundary';
import {
  compileCareDroidAccessProfile,
  normalizeCareDroidProfile,
} from '../lib/users/canonicalAccess';
import { getDefaultDemoUser } from '../lib/users/demoUsers';
import {
  BLOCKED_AUTONOMOUS_OI_ACTIONS,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
} from '../../lib/operational-intelligence/constants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPermissionEnumPath = join(
  __dirname,
  '../../backend/src/modules/auth/enums/permission.enum.ts',
);

function readBackendPermissionKeys(): string[] {
  const source = readFileSync(backendPermissionEnumPath, 'utf8');
  const matches = source.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*=\s*'([A-Z][A-Z0-9_]+)'/gm);
  return [...matches].map((match) => match[2]);
}

describe('security contract', () => {
  it('registers security engine in the emergency platform contract', () => {
    expect(EMERGENCY_PLATFORM_CONTRACT.securityEngine).toBe('caredroid-security');
    expect(SECURITY_CONTRACT.engineId).toBe('caredroid-security');
  });

  it('maps emergency, caredroid, and backend permission vocabularies', () => {
    const normalized = normalizePermission(EMERGENCY_PERMISSION_KEYS.patientCreate);
    expect(normalized.emergency).toBe(EMERGENCY_PERMISSION_KEYS.patientCreate);
    expect(normalized.caredroid).toContain(CAREDROID_PERMISSIONS.PATIENT_CREATE);
    expect(normalized.backend).toContain(BACKEND_PERMISSION_KEYS.WRITE_PHI);

    const backendNormalized = normalizePermission(BACKEND_PERMISSION_KEYS.READ_PHI);
    expect(backendNormalized.backend).toEqual([BACKEND_PERMISSION_KEYS.READ_PHI]);

    const caredroidNormalized = normalizePermission(CAREDROID_PERMISSIONS.PATIENT_READ);
    expect(caredroidNormalized.caredroid).toEqual([CAREDROID_PERMISSIONS.PATIENT_READ]);
    expect(caredroidNormalized.backend).toContain(BACKEND_PERMISSION_KEYS.READ_PHI);
  });

  it('expands permission aliases across vocabularies', () => {
    const aliases = expandPermissionAliases(EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly);
    expect(aliases).toContain(EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly);
    expect(aliases).toContain(CAREDROID_PERMISSIONS.PATIENT_READ);
    expect(aliases).toContain(BACKEND_PERMISSION_KEYS.READ_PHI);
    expect(permissionRequiresPhiRead(EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly)).toBe(
      true,
    );
  });

  it('protects emergency API paths while keeping auth routes public', () => {
    expect(isPublicApiPath('/api/auth/dev-session')).toBe(true);
    expect(isPublicApiPath('/api/config/system')).toBe(true);
    expect(isPublicApiPath('/api/emergency/whiteboard')).toBe(false);
    expect(isProtectedApiPath('/api/emergency/whiteboard')).toBe(true);
    expect(isProtectedApiPath('/api/audit/phi-access')).toBe(true);
  });

  it('authorizes PHI view for clinical demo roles via compiled profile', () => {
    const demoProfile = compileCareDroidAccessProfile(
      normalizeCareDroidProfile(getDefaultDemoUser()),
    );
    const context = { compiledProfile: demoProfile, emergencyRole: 'physician' };
    expect(checkPermission(context, BACKEND_PERMISSION_KEYS.READ_PHI)).toBe(true);
    expect(canAccessPhi(context, 'view')).toBe(true);
  });

  it('covers emergency permission bridge mappings', () => {
    const coverage = listBridgeCoverage();
    expect(coverage.emergencyKeys).toBeGreaterThan(20);
    expect(coverage.caredroidKeys).toBeGreaterThan(20);
    expect(coverage.backendKeys).toBeGreaterThan(10);
  });

  it('denies PHI access to student backend role', () => {
    const studentContext = { emergencyRole: 'student' };
    expect(checkPermission(studentContext, BACKEND_PERMISSION_KEYS.READ_PHI)).toBe(false);
    expect(checkPermission(studentContext, BACKEND_PERMISSION_KEYS.WRITE_PHI)).toBe(false);
    expect(canAccessPhi(studentContext, 'view')).toBe(false);
    expect(canAccessPhi(studentContext, 'update')).toBe(false);
  });

  it('aligns canMutateEmergency with canPerformEmergencyAction semantics', () => {
    const readOnlyContext = {
      compiledProfile: compileCareDroidAccessProfile(
        normalizeCareDroidProfile(getDefaultDemoUser()),
      ),
      emergencyRole: 'physician',
      readOnly: true,
    };
    expect(canMutateEmergency(readOnlyContext, EMERGENCY_PERMISSION_KEYS.patientCreate)).toBe(
      false,
    );
  });

  it('mirrors backend Permission enum keys in frontend catalog', () => {
    const backendKeys = readBackendPermissionKeys();
    const frontendKeys = Object.values(FrontendPermission);
    for (const key of backendKeys) {
      expect(frontendKeys, `missing frontend mirror for ${key}`).toContain(key);
    }
  });

  it('blocks autonomous clinical actions in shared operational intelligence constants', () => {
    expect(BLOCKED_AUTONOMOUS_OI_ACTIONS).toContain('diagnose');
    expect(BLOCKED_AUTONOMOUS_OI_ACTIONS).toContain('prescribe');
    expect(BLOCKED_AUTONOMOUS_OI_ACTIONS).toContain('discharge');
    expect(BLOCKED_AUTONOMOUS_OI_ACTIONS).toContain('auto_triage');
    expect(OPERATIONAL_INTELLIGENCE_DISCLAIMERS.clinical).toMatch(/human review required/i);
    expect(OPERATIONAL_INTELLIGENCE_DISCLAIMERS.operational).toMatch(/advisory/i);
  });

  it('routes backend operational intelligence disclaimers through shared lib constants', () => {
    const backendSource = readFileSync(
      join(
        __dirname,
        '../../backend/src/modules/emergency-os/emergency-os.operational-intelligence.service.ts',
      ),
      'utf8',
    );
    expect(backendSource).toContain('OPERATIONAL_INTELLIGENCE_DISCLAIMERS');
    expect(backendSource).not.toMatch(/const CLINICAL_DISCLAIMER\s*=/);
    expect(backendSource).not.toMatch(/const OPERATIONAL_DISCLAIMER\s*=/);
  });

  it('validates PHI API boundary inputs', () => {
    expect(validatePatientIdentifier('').valid).toBe(false);
    expect(validatePatientIdentifier('patient-123').valid).toBe(true);

    const demoProfile = compileCareDroidAccessProfile(
      normalizeCareDroidProfile(getDefaultDemoUser()),
    );
    const authorized = validatePhiMutationRequest({
      patientId: 'patient-123',
      action: 'view',
      context: { compiledProfile: demoProfile, emergencyRole: 'physician' },
    });
    expect(authorized.valid).toBe(true);

    const denied = validatePhiMutationRequest({
      patientId: 'patient-123',
      action: 'view',
      context: { emergencyRole: 'student' },
    });
    expect(denied.valid).toBe(false);
  });
});
