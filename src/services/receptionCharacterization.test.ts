/**
 * Architect Mode Stage B — Reception characterization tests.
 *
 * Locks the golden-path Reception contracts before consolidation:
 * URL pipeline, intake session props, EMS convert failure path,
 * role permission grants, queue registry semantics, and route permission map.
 *
 * Does not change product behavior — only asserts current wired truth.
 */
import { describe, expect, it } from 'vitest';
import {
  buildReceptionIntakeSession,
  convertEmsArrivalForReception,
  RECEPTION_INTAKE_URL_KEYS,
  RECEPTION_PIPELINE_URL_CONTRACT,
} from './receptionIntakeBridge';
import { QUEUE_MOVEMENT_REGISTRY, RECEPTION_QUEUE_TAB } from './queueAssignment';
import {
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  ROLE_PERMISSION_GRANTS,
  ROUTE_PERMISSION_MAP,
} from '../config/emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from '../config/emergencyRoleScreenMatrix';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import { presentEmergencyPermission } from '../config/emergencyActionPresentationModel';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { ErrorCode } from '../contracts/results';

describe('Reception characterization — URL & intake contracts', () => {
  it('documents the reception pipeline URL contract keys used by deep links', () => {
    expect(RECEPTION_PIPELINE_URL_CONTRACT.express).toMatch(/quick intake/i);
    expect(RECEPTION_PIPELINE_URL_CONTRACT.intake).toMatch(/smart intake/i);
    expect(RECEPTION_PIPELINE_URL_CONTRACT['queue=ems']).toMatch(/EMS/i);
    expect(RECEPTION_PIPELINE_URL_CONTRACT['queue=verification']).toMatch(/verification/i);
    expect(RECEPTION_PIPELINE_URL_CONTRACT['queue=pretriage']).toMatch(/triage|handoff/i);
    expect(RECEPTION_PIPELINE_URL_CONTRACT.patientId).toBeTruthy();
    expect(RECEPTION_PIPELINE_URL_CONTRACT.q).toMatch(/search/i);
  });

  it('keeps intake URL keys stable for session reconstruction', () => {
    expect(RECEPTION_INTAKE_URL_KEYS).toEqual(
      expect.arrayContaining(['intake', 'autostart', 'step', 'patientId', 'mode', 'emsArrivalId', 'artifactId']),
    );
  });

  it('builds reception intake session defaults with autostart on', () => {
    const session = buildReceptionIntakeSession();
    expect(session.autostart).toBe(true);
    expect(session.step).toBeNull();
    expect(session.patientId).toBeNull();
  });

  it('passes through explicit intake session options without inventing patient ids', () => {
    const session = buildReceptionIntakeSession({
      autostart: false,
      step: 'verify',
      patientId: 'pt-char-1',
      emsArrivalId: 'ems-char-1',
      mode: 'ems',
    });
    expect(session).toEqual(
      expect.objectContaining({
        autostart: false,
        step: 'verify',
        patientId: 'pt-char-1',
        emsArrivalId: 'ems-char-1',
        mode: 'ems',
      }),
    );
  });
});

describe('Reception characterization — EMS convert chain', () => {
  it('returns NOT_FOUND Result when arrival id is missing from store (no silent success)', () => {
    const result = convertEmsArrivalForReception('arrival-does-not-exist-architect-mode');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.detail).toBe('not_found');
    }
  });
});

describe('Reception characterization — registration_clerk permission contract', () => {
  const clerk = EMERGENCY_ROLE_ID.registrationClerk;
  const grants = ROLE_PERMISSION_GRANTS[clerk];

  it('grants core intake capabilities for registration_clerk', () => {
    expect(grants).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.patientCreate,
        EMERGENCY_PERMISSION_KEYS.patientDemographicsEdit,
        EMERGENCY_PERMISSION_KEYS.encounterCreate,
        EMERGENCY_PERMISSION_KEYS.intakeVerify,
        EMERGENCY_PERMISSION_KEYS.emsConvertArrival,
        EMERGENCY_PERMISSION_KEYS.receptionEscalate,
        EMERGENCY_PERMISSION_KEYS.screenRegistration,
      ]),
    );
  });

  it('does not grant system settings or discharge to registration_clerk', () => {
    expect(grants).not.toContain(EMERGENCY_PERMISSION_KEYS.settingsManage);
    expect(grants).not.toContain(EMERGENCY_PERMISSION_KEYS.patientDischarge);
    expect(grants).not.toContain(EMERGENCY_PERMISSION_KEYS.triageAssignAcuity);
  });

  it('enables patient create presentation for registration_clerk', () => {
    const presented = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.registrationClerk,
      EMERGENCY_ACTIONS.createPatient,
    );
    expect(presented.visible).toBe(true);
    expect(presented.enabled).toBe(true);
  });

  it('blocks patient create for public_display', () => {
    const presented = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.publicDisplay,
      EMERGENCY_ACTIONS.createPatient,
    );
    expect(presented.enabled && presented.visible).toBe(false);
  });

  it('maps emergency reception route to screen.registration permission', () => {
    expect(ROUTE_PERMISSION_MAP[CANONICAL_ROUTES.emergencyReception]).toBe(
      EMERGENCY_PERMISSION_KEYS.screenRegistration,
    );
  });

  it('hasEmergencyPermission agrees with ROLE_PERMISSION_GRANTS for clerk intake', () => {
    expect(hasEmergencyPermission(clerk, EMERGENCY_PERMISSION_KEYS.patientCreate)).toBe(true);
    expect(hasEmergencyPermission(clerk, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(false);
  });
});

describe('Reception characterization — queue movement registry', () => {
  it('registers verification, pretriage, and EMS reception membership rules', () => {
    expect(QUEUE_MOVEMENT_REGISTRY.receptionVerification.id).toBe('verification');
    expect(QUEUE_MOVEMENT_REGISTRY.receptionPretriage.id).toBe('pretriage');
    expect(QUEUE_MOVEMENT_REGISTRY.receptionEms.id).toBe('ems');
    expect(QUEUE_MOVEMENT_REGISTRY.receptionEms.enter).toEqual(
      expect.arrayContaining([expect.stringMatching(/convertEMSArrivalToPatient|enterEmsRegistrationQueue/)]),
    );
  });

  it('exposes reception queue tab identifiers used by workspace URL queue= params', () => {
    // RECEPTION_QUEUE_TAB must stay aligned with pipeline URL contract queue= values
    expect(RECEPTION_QUEUE_TAB).toBeTruthy();
    const tabValues = Object.values(RECEPTION_QUEUE_TAB as Record<string, string>);
    expect(tabValues.length).toBeGreaterThan(0);
  });
});

describe('Reception characterization — error taxonomy readiness', () => {
  it('includes AI and dependency failure codes for accountable degraded paths', () => {
    expect(ErrorCode.AI_UNAVAILABLE).toBe('AI_UNAVAILABLE');
    expect(ErrorCode.AI_SAFETY_REJECTION).toBe('AI_SAFETY_REJECTION');
    expect(ErrorCode.DEPENDENCY_UNAVAILABLE).toBe('DEPENDENCY_UNAVAILABLE');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
  });
});
