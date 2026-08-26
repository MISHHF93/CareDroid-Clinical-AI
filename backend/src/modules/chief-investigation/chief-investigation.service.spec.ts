/**
 * Real end-to-end proof of the Chief Investigation vertical slice:
 * patient verification -> real NEWS2 computation (via the actual
 * News2Service, not a mock) -> trend detection -> truthful-state synthesis
 * -> PREPARE-only AiActionProposal creation. Only the patient store, the
 * tool-orchestrator's transport, and audit persistence are stubbed — the
 * scoring logic and prepared-action logic under test are real.
 */

import { ChiefInvestigationService } from './chief-investigation.service';
import { News2Service } from '../medical-control-plane/tool-orchestrator/services/news2.service';
import { AiActionProposalService } from '../ai/ai-action-proposal.service';
import type { AuditService } from '../audit/audit.service';
import type { EmergencyPatient } from '../emergency-os/emergency-os.types';

const news2Service = new News2Service();

function makePatientServiceMock(patient: EmergencyPatient | undefined) {
  return { getPatient: jest.fn().mockReturnValue(patient) };
}

function makeToolOrchestratorMock() {
  return {
    executeTool: jest.fn(async (dto: { toolId: string; parameters: Record<string, unknown> }) => {
      if (dto.toolId !== 'news2') throw new Error(`unexpected tool in test: ${dto.toolId}`);
      const result = await news2Service.execute(dto.parameters);
      return { success: true, result };
    }),
  };
}

function makeAuditServiceMock(): AuditService {
  return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

function baseVitals(overrides: Partial<EmergencyPatient['vitals'][number]>, minutesAgo: number) {
  return {
    recordedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    recordedBy: 'test-nurse',
    ...overrides,
  };
}

function makePatient(overrides: Partial<EmergencyPatient>): EmergencyPatient {
  return {
    id: 'patient-1',
    organizationId: 'org-1',
    mrn: 'MRN-1',
    firstName: 'Test',
    lastName: 'Patient',
    dob: '1980-01-01',
    age: 46,
    sex: 'M',
    arrivalTime: new Date(Date.now() - 60 * 60_000).toISOString(),
    chiefComplaint: 'Shortness of breath',
    complaintCategory: 'respiratory',
    state: 'in_treatment' as EmergencyPatient['state'],
    priority: 'urgent' as EmergencyPatient['priority'],
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('ChiefInvestigationService — real end-to-end vertical slice', () => {
  it('returns OUTSIDE_SCOPE and takes no action when the patient cannot be resolved in scope', async () => {
    const service = new ChiefInvestigationService(
      makePatientServiceMock(undefined) as any,
      makeToolOrchestratorMock() as any,
      new AiActionProposalService(),
      makeAuditServiceMock(),
    );

    const result = await service.runDeteriorationInvestigation({
      patientId: 'unknown-patient',
      requestedByUserId: 'user-1',
      organizationId: 'org-1',
    });

    expect(result.overallState).toBe('OUTSIDE_SCOPE');
    expect(result.noClinicalActionTaken).toBe(true);
    expect(result.preparedActions).toHaveLength(0);
    expect(result.steps.find((s) => s.stepId === 'verify_patient')?.status).toBe('failed');
  });

  it('flags INSUFFICIENT_DATA and prepares a repeat-vitals task when the patient has no vitals', async () => {
    const patient = makePatient({ vitals: [] });
    const service = new ChiefInvestigationService(
      makePatientServiceMock(patient) as any,
      makeToolOrchestratorMock() as any,
      new AiActionProposalService(),
      makeAuditServiceMock(),
    );

    const result = await service.runDeteriorationInvestigation({
      patientId: patient.id,
      requestedByUserId: 'user-1',
      organizationId: 'org-1',
    });

    expect(result.overallState).toBe('INSUFFICIENT_DATA');
    expect(result.preparedActions.map((a) => a.actionType)).toContain('create_repeat_vitals_task');
    expect(result.preparedActions.every((a) => a.requiresApproval)).toBe(true);
  });

  it('computes a real high-risk NEWS2 score, detects the deteriorating trend, and requires human review', async () => {
    const patient = makePatient({
      vitals: [
        baseVitals({ rr: 18, spo2: 98, sbp: 120, hr: 80, temp: 37.0 }, 25),
        // Deliberately scores 14 on NEWS2 (RR 3 + SpO2 3 + SBP 3 + HR 3 + Temp 2) — high band, hasRed.
        baseVitals({ rr: 26, spo2: 90, sbp: 85, hr: 135, temp: 39.5 }, 5),
      ],
    });
    const actionProposals = new AiActionProposalService();
    const service = new ChiefInvestigationService(
      makePatientServiceMock(patient) as any,
      makeToolOrchestratorMock() as any,
      actionProposals,
      makeAuditServiceMock(),
    );

    const result = await service.runDeteriorationInvestigation({
      patientId: patient.id,
      requestedByUserId: 'user-1',
      organizationId: 'org-1',
    });

    // Real NEWS2 computation, not a fabricated number.
    const news2Step = result.steps.find((s) => s.stepId === 'calculate_news2');
    expect(news2Step?.status).toBe('completed');
    expect(news2Step?.detail).toContain('14');
    expect(news2Step?.detail).toContain('high');

    expect(result.overallState).toBe('REQUIRES_HUMAN_REVIEW');
    expect(result.autonomyLevelUsed).toBe('LEVEL_2_PREPARE');
    expect(result.noClinicalActionTaken).toBe(true);

    const reviewFinding = result.findings.find((f) => f.state === 'REQUIRES_HUMAN_REVIEW');
    expect(reviewFinding).toBeDefined();
    expect(reviewFinding?.evidence.some((e) => e.includes('14'))).toBe(true);

    // Trend notes reflect real deterioration between the two recordings.
    const trendFindings = result.findings.filter((f) => f.summary.startsWith('Trend observation'));
    expect(trendFindings.length).toBeGreaterThan(0);
    expect(trendFindings.some((f) => f.summary.includes('direction of concern'))).toBe(true);

    // A real, human-approval-required AiActionProposal was created — not just described.
    const prepared = result.preparedActions.find((a) => a.actionType === 'request_urgent_reassessment');
    expect(prepared).toBeDefined();
    expect(prepared?.requiresApproval).toBe(true);
    expect(prepared?.proposalId).toBeDefined();
    const proposal = actionProposals.get(prepared!.proposalId!);
    expect(proposal).toBeDefined();
    expect(proposal?.state).toBe('proposed');
    expect(proposal?.patientId).toBe(patient.id);
  });

  it('reports PARTIALLY_SUPPORTED (never fabricated SUPPORTED) with no prepared actions for stable, fresh vitals below escalation thresholds', async () => {
    const patient = makePatient({
      vitals: [baseVitals({ rr: 16, spo2: 98, sbp: 118, hr: 76, temp: 36.8 }, 2)],
    });
    const service = new ChiefInvestigationService(
      makePatientServiceMock(patient) as any,
      makeToolOrchestratorMock() as any,
      new AiActionProposalService(),
      makeAuditServiceMock(),
    );

    const result = await service.runDeteriorationInvestigation({
      patientId: patient.id,
      requestedByUserId: 'user-1',
      organizationId: 'org-1',
    });

    // The board never captures ACVPU/hypercapnic-scale, so mapLatestVitalsToNews2Parameters
    // always records an assumption when NEWS2 runs — the honest ceiling here is
    // PARTIALLY_SUPPORTED, not a fabricated SUPPORTED. See investigation-plan.lib.ts.
    expect(result.overallState).toBe('PARTIALLY_SUPPORTED');
    expect(result.preparedActions).toHaveLength(0);
    expect(result.findings.some((f) => f.state === 'REQUIRES_HUMAN_REVIEW')).toBe(false);
    const news2Finding = result.findings.find((f) => f.summary.startsWith('NEWS2 calculated successfully'));
    expect(news2Finding?.state).toBe('SUPPORTED');
  });
});
