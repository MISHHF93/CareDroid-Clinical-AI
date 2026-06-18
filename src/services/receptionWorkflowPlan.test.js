import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('reception architecture plan execution', () => {
  it('wires duplicate prevention across reception surfaces', () => {
    const reception = read('pages/emergency/ReceptionWorkspace.jsx');
    const smartIntake = read('pages/emergency/SmartIntake.jsx');
    const quickIntake = read('components/QuickIntake.tsx');

    expect(reception).toContain('DuplicatePatientBanner');
    expect(reception).toContain('findDuplicateCandidatesFromQuery');
    expect(smartIntake).toContain('mergeDuplicateCandidates');
    expect(smartIntake).toContain('findDuplicateCandidates');
    expect(quickIntake).toContain('findDuplicateCandidates');
  });

  it('wires encounter automation after intake', () => {
    const handoff = read('services/receptionHandoff.ts');
    const intakeEncounter = read('services/intakeEncounter.ts');
    const settings = read('pages/emergency/EmergencySettings.jsx');

    expect(handoff).toContain('ensureEncounterAfterIntake');
    expect(intakeEncounter).toContain('autoCreateEncounter');
    expect(settings).toContain('Auto-create encounter after intake');
  });

  it('wires queue assignment automation', () => {
    const handoff = read('services/receptionHandoff.ts');
    const queueAssignment = read('services/queueAssignment.ts');
    const patientCard = read('components/PatientCard.tsx');
    const whiteboard = read('pages/emergency/index.tsx');

    expect(handoff).toContain('enterTriageQueue');
    expect(queueAssignment).toContain('enterWaitingQueue');
    expect(queueAssignment).toContain('getLiveQueueDashboard');
    expect(patientCard).toContain('enterWaitingQueue');
    expect(whiteboard).toContain('enterTriageQueue');
    expect(whiteboard).toContain('enterEmsRegistrationQueue');
  });

  it('keeps smart intake promotion paths', () => {
    const permissions = read('config/emergencyRolePermissions.js');
    const reception = read('pages/emergency/ReceptionWorkspace.jsx');
    const header = read('components/Header.tsx');
    const smartIntake = read('pages/emergency/SmartIntake.jsx');

    expect(permissions).toContain('getReceptionSmartIntakePath');
    expect(reception).toContain('Start Smart Intake');
    expect(reception).toContain('autostart');
    expect(header).toContain('open-reception-intake');
    expect(smartIntake).toContain('sessionBootstrapped');
  });

  it('uses unified patient search matcher', () => {
    const search = read('utils/patientSearch.ts');
    const header = read('components/Header.tsx');
    const queueModel = read('components/reception/receptionQueueModel.js');

    expect(search).toContain('rankPatientsBySearch');
    expect(header).toContain('rankPatientsBySearch');
    expect(queueModel).toContain('filterPatientsBySearch');
  });
});
