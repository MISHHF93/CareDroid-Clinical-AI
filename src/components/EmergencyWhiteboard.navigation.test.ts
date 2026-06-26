import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const whiteboardSource = readFileSync(join(__dirname, '../pages/emergency/index.tsx'), 'utf8');
const patientCardSource = readFileSync(join(__dirname, 'PatientCard.tsx'), 'utf8');
const patientDetailPanelSource = readFileSync(join(__dirname, 'PatientDetailPanel.tsx'), 'utf8');

describe('Emergency Whiteboard navigation wiring', () => {
  it('opens and closes patient detail through the primary emergency store', () => {
    expect(patientCardSource).toContain('const handleSelect = useCallback(');
    expect(patientCardSource).toContain('selectPatient(patient.id);');
    expect(patientCardSource).toContain('onClick={readOnlyDisplay ? undefined : handleSelect}');
    expect(patientCardSource).toContain("role={readOnlyDisplay ? 'article' : 'button'}");
    expect(patientCardSource).toContain("event.key === 'Enter' || event.key === ' '");
    expect(patientDetailPanelSource).toContain('onClick={() => selectPatient(null)}');
    expect(patientDetailPanelSource).toContain('aria-label="Close patient detail"');
  });

  it('keeps stale selected-patient state from rendering a blank overlay', () => {
    expect(patientDetailPanelSource).toContain('const selectedPatient = useMemo(');
    expect(patientDetailPanelSource).toContain('patients.find((patient) => patient.id === selectedPatientId) || null');
    expect(patientDetailPanelSource).toContain('if (!selectedPatient) return null;');
  });

  it('wires filter chips, queue shortcuts, and view toggles to live whiteboard state', () => {
    expect(whiteboardSource).toContain('const [activeFilter, setActiveFilter]');
    expect(whiteboardSource).toContain('setQueueFilter(null);');
    expect(whiteboardSource).toContain('<QueueIntelligencePanel');
    expect(whiteboardSource).toContain('matchesWhiteboardQueueFilter(patient, activeQueueFilter, pendingReferralPatientIds)');
    expect(whiteboardSource).toContain('useWhiteboardDisplayMode');
    expect(whiteboardSource).toContain('operational awareness only');
    expect(whiteboardSource).toContain('<WhiteboardView');
    expect(whiteboardSource).toContain('patients={boardPatients}');
    expect(whiteboardSource).toContain('<WhoNextPanel');
  });

  it('promotes Whiteboard-first workflow launch points without duplicating workflow logic', () => {
    expect(whiteboardSource).toContain('Critical actions from the board');
    expect(whiteboardSource).toContain('queue breaches');
    expect(whiteboardSource).toContain('boarding risk');
    expect(whiteboardSource).toContain('active alerts');
    expect(whiteboardSource).toContain('openReassessmentTasks');
    expect(whiteboardSource).toContain('convertEmsArrivalForReception');
    expect(whiteboardSource).toContain('openReferralWorkflow');
    expect(whiteboardSource).toContain('openQueueReview');
    expect(whiteboardSource).toContain('Showing the {activeQueueFilter} queue on the Whiteboard.');
    expect(whiteboardSource).toContain('EmsAttentionStrip');
    expect(whiteboardSource).toContain('summarizeEmsAwareness');
    expect(whiteboardSource).toContain('EMS ETA');
    expect(whiteboardSource).toContain('EMS Offload');
    expect(whiteboardSource).toContain('ReferralAttentionStrip');
    expect(whiteboardSource).toContain('ReassessmentAttentionStrip');
    expect(whiteboardSource).toContain('summarizeReferralAwareness');
    expect(whiteboardSource).toContain('Referrals Pending');
    expect(whiteboardSource).toContain('Referrals Delayed');
    expect(whiteboardSource).toContain('patientMatchesReassessmentAttention');
    expect(whiteboardSource).toContain("'Reassess'");
    expect(whiteboardSource).toContain('focusReassessmentOnBoard');
    expect(whiteboardSource).toContain('workflowProfile={patientCardWorkflowProfile}');
    expect(whiteboardSource).toContain('resolvePatientCardWorkflowProfile');
    expect(patientCardSource).toContain('workflowProfile?: PatientCardWorkflowProfile');
    expect(patientCardSource).toContain('readOnlyDisplay?: boolean');
    expect(patientCardSource).toContain('toggleCopilot');
    expect(patientCardSource).toContain('Referral pending');
    expect(patientCardSource).toContain('Transfer pending');
    expect(patientCardSource).toContain('Capacity pressure');
    expect(patientCardSource).toContain("document.dispatchEvent(new Event('open-reassessment-drawer'))");
    expect(patientCardSource).toContain("document.dispatchEvent(new Event('open-patient-discharge'))");
    expect(patientCardSource).toContain('advancePatientToBoarding');
  });

  it('promotes reception-first workflow launch points on the whiteboard', () => {
    expect(whiteboardSource).toContain('Open Reception');
    expect(whiteboardSource).toContain('isRegistrationClerk');
    expect(whiteboardSource).toContain('ChargeNurseOperationalStrip');
    expect(whiteboardSource).toContain('shouldShowChargeNurseOperationalStrip');
    expect(whiteboardSource).toContain('handleOperationalStripMetricSelect');
    expect(whiteboardSource).toContain('useWhiteboardDisplayMode');
    expect(whiteboardSource).toContain('display.refreshIntervalMs');
  });

  it('shows non-blank loading and empty states for filtered views', () => {
    expect(whiteboardSource).toContain('<SkeletonLoader');
    expect(whiteboardSource).toContain('<OperationalEmptyState');
    expect(whiteboardSource).toContain('EMPTY_STATE_COPY.whiteboard');
    expect(whiteboardSource).toContain('Clear filters');
  });
});
