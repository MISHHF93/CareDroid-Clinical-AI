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
    const verification = read('components/verification/PatientVerificationExperience.jsx');

    expect(reception).toContain('DuplicatePatientBanner');
    expect(reception).toContain('openVerificationFromDuplicate');
    expect(reception).toContain('handleProvisionalIntake');
    expect(reception).toContain('completeProvisionalIntake');
    expect(reception).toContain('findDuplicateCandidatesFromQuery');
    expect(smartIntake).toContain('PatientVerificationExperience');
    expect(smartIntake).toContain('mergeDuplicateCandidates');
    expect(smartIntake).toContain('findDuplicateCandidates');
    expect(quickIntake).toContain('DuplicateReviewAlert');
    expect(verification).toContain('DuplicateCandidatePanel');
    expect(verification).toContain('IdentityFieldReview');
    expect(verification).toContain('ProvisionalIdentityPanel');
    expect(verification).toContain('OcrCapturePanel');
  });

  it('wires encounter automation after intake', () => {
    const handoff = read('services/receptionHandoff.ts');
    const intakeEncounter = read('services/intakeEncounter.ts');
    const settings = read('pages/emergency/EmergencySettings.jsx');

    expect(handoff).toContain('completeIntakeHandoff');
    expect(handoff).toContain('ensureEncounterAfterIntake');
    expect(handoff).toContain('getArrivalReasonFromPatient');
    expect(intakeEncounter).toContain('buildEncounterLinkageMetadata');
    const chain = read('services/intakeEncounterChain.ts');
    expect(chain).toContain('readIntakeEncounterChain');
    expect(settings).toContain('Auto-create encounter after intake');
  });

  it('wires queue assignment automation', () => {
    const handoff = read('services/receptionHandoff.ts');
    const queueAssignment = read('services/queueAssignment.ts');
    const patientCard = read('components/PatientCard.tsx');
    const whiteboard = read('pages/emergency/index.tsx');
    const smartIntake = read('pages/emergency/SmartIntake.jsx');

    expect(handoff).toContain('enterTriageQueue');
    expect(handoff).toContain('completeIntakeHandoff');
    expect(queueAssignment).toContain('enterWaitingQueue');
    expect(queueAssignment).toContain('matchesWhiteboardQueueFilter');
    expect(queueAssignment).toContain('advancePatientJourneyState');
    expect(queueAssignment).toContain('getLiveQueueDashboard');
    expect(patientCard).toContain('advancePatientJourneyState');
    expect(whiteboard).toContain('completeIntakeHandoff');
    expect(smartIntake).toContain('applyIntakeArrivalContext');
    expect(whiteboard).toContain('matchesWhiteboardQueueFilter');
    expect(whiteboard).toContain('enterEmsRegistrationQueue');
  });

  it('keeps smart intake promotion paths', () => {
    const permissions = read('config/emergencyRolePermissions.js');
    const reception = read('pages/emergency/ReceptionWorkspace.jsx');
    const header = read('components/Header.tsx');
    const smartIntake = read('pages/emergency/SmartIntake.jsx');
    const queueModel = read('components/reception/receptionQueueModel.js');

    expect(permissions).toContain('getReceptionEmbeddedIntakePath');
    expect(reception).toContain('RECEPTION_COPY');
    expect(reception).toContain('registerWalkIn');
    expect(reception).toContain('checkIdentity');
    expect(reception).toContain('ArrivalDashboard');
    expect(reception).toContain('ReceptionOperationalStrip');
    expect(queueModel).toContain('selectArrivalDashboardMetrics');
    expect(queueModel).toContain('selectReceptionOperationalStripMetrics');
    expect(reception).toContain('open-reception-smart-intake');
    expect(smartIntake).toContain('embedded');
    expect(reception).toContain('autostart');
    expect(reception).toContain('open-reception-prepare');
    expect(reception).toContain('open-reception-quick-create');
    expect(header).toContain('open-reception-intake');
    expect(header).toContain('PatientSearchResults');
    expect(header).toContain('patientSearchActions');
    expect(smartIntake).toContain('PatientVerificationExperience');
    expect(smartIntake).toContain('verificationWorkflow');
    expect(smartIntake).toContain('SmartIntakeApi.verifyField');
    expect(smartIntake).toContain('SmartIntakeApi.linkPatient');
    expect(smartIntake).toContain('handleDocumentUpload');
  });

  it('uses unified patient search matcher', () => {
    const search = read('utils/patientSearch.ts');
    const header = read('components/Header.tsx');
    const commandPalette = read('components/CommandPalette.tsx');
    const queueModel = read('components/reception/receptionQueueModel.js');

    expect(search).toContain('rankPatientsBySearch');
    expect(header).toContain('PatientSearchResults');
    expect(commandPalette).toContain('rankPatientsBySearch');
    expect(queueModel).toContain('filterPatientsBySearch');
  });
});
