import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';
import { PatientDocumentArtifactService } from './patient-document-artifact.service';

/**
 * Regression coverage for the 2026-08-08 truthfulness fix: every artifact
 * this service produces comes from a plain regex/keyword match (the
 * labeled() helper, or a literal /troponin/i.test()/chest-pain test) --
 * zero LLM or model call anywhere in extractArtifactsFromText(). Before this
 * fix, safety.isAiDerived defaulted to true (`input.isAiDerived ?? true`)
 * and CHIEF_COMPLAINT/ALLERGY/MEDICATION/LAB_RESULT/COPILOT_TOOL_RECOMMENDATION
 * artifacts carried provenance.extractedBy: 'CareDroid Copilot' and
 * modelVersion: 'document-extractor-v1' by default -- every real Smart
 * Intake document extraction this service has ever produced was labeled
 * AI-derived, regardless of the caller or the extraction mechanism, which
 * is architecturally always deterministic regex matching.
 */
describe('PatientDocumentArtifactService truthfulness', () => {
  let service: PatientDocumentArtifactService;
  let patientService: EmergencyPatientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        PatientDocumentArtifactService,
      ],
    }).compile();

    service = module.get(PatientDocumentArtifactService);
    patientService = module.get(EmergencyPatientService);
  });

  it('never labels regex-extracted clinical artifacts as AI-derived, regardless of caller input', () => {
    const patient = patientService.createPatient({
      mrn: 'ED-DOC-ARTIFACT-1',
      firstName: 'Doc',
      lastName: 'Artifact',
      chiefComplaint: 'Regression test',
      complaintCategory: 'Other',
    });

    const result = service.extract(patient.id, {
      patientId: patient.id,
      documentType: 'Referral Note',
      sourceType: 'referral_note',
      rawText: [
        'Chief complaint: Chest pain',
        'Allergies: Penicillin - rash',
        'Medications: Warfarin 5mg daily',
        'Troponin ordered, result pending',
      ].join('\n'),
    } as any);

    const artifacts = result.data.artifacts;
    expect(artifacts.length).toBeGreaterThan(0);
    expect(
      artifacts.some(
        (artifact) =>
          artifact.artifactType === 'CHIEF_COMPLAINT' &&
          artifact.label.toLowerCase().includes('chest'),
      ),
    ).toBe(true);
    expect(artifacts.some((artifact) => artifact.artifactType === 'ALLERGY')).toBe(true);
    expect(artifacts.some((artifact) => artifact.artifactType === 'MEDICATION')).toBe(true);
    expect(artifacts.some((artifact) => artifact.artifactType === 'LAB_RESULT')).toBe(true);
    expect(
      artifacts.some((artifact) => artifact.artifactType === 'COPILOT_TOOL_RECOMMENDATION'),
    ).toBe(true);

    for (const artifact of artifacts) {
      expect(artifact.safety.isAiDerived).toBe(false);
      expect(artifact.provenance.responseSource).toBe('DETERMINISTIC_RULE');
      expect(artifact.provenance.extractedBy).not.toMatch(/copilot/i);
    }
  });

  it('cannot be overridden by caller-supplied isAiDerived/extractedBy/modelVersion -- those fields no longer exist on the input contract', () => {
    const patient = patientService.createPatient({
      mrn: 'ED-DOC-ARTIFACT-2',
      firstName: 'Doc',
      lastName: 'Override',
      chiefComplaint: 'Regression test',
      complaintCategory: 'Other',
    });

    // A caller attempting the pre-fix override shape (e.g. a stale client)
    // has its extra fields silently ignored by TypeScript's structural
    // typing at compile time -- this test proves the runtime behavior is
    // unaffected even if such a payload reaches the service directly.
    const result = service.extract(patient.id, {
      patientId: patient.id,
      documentType: 'Referral Note',
      sourceType: 'referral_note',
      rawText: 'Chief complaint: Chest pain',
      isAiDerived: true,
      extractedBy: 'Some LLM Provider',
      modelVersion: 'gpt-4',
    } as any);

    const chiefComplaint = result.data.artifacts.find(
      (artifact) => artifact.artifactType === 'CHIEF_COMPLAINT',
    );
    expect(chiefComplaint?.safety.isAiDerived).toBe(false);
    expect(chiefComplaint?.provenance.responseSource).toBe('DETERMINISTIC_RULE');
    expect(chiefComplaint?.provenance.extractedBy).toBe('regex-field-extractor');
  });

  it('still requires human review for suggested clinical facts -- requiresHumanReview is independent of isAiDerived', () => {
    const patient = patientService.createPatient({
      mrn: 'ED-DOC-ARTIFACT-3',
      firstName: 'Doc',
      lastName: 'Review',
      chiefComplaint: 'Regression test',
      complaintCategory: 'Other',
    });

    const result = service.extract(patient.id, {
      patientId: patient.id,
      documentType: 'Referral Note',
      sourceType: 'referral_note',
      rawText: 'Allergies: Penicillin - rash',
    } as any);

    const allergy = result.data.artifacts.find((artifact) => artifact.artifactType === 'ALLERGY');
    expect(allergy?.reviewStatus).toBe('pending_human_review');
    expect(allergy?.safety.requiresHumanReview).toBe(true);
    expect(allergy?.safety.isAiDerived).toBe(false);
  });
});

describe('PatientDocumentArtifactService organization tenant scoping (BOLA audit)', () => {
  // This Map-backed store was keyed only by patientId, with zero
  // organization concept anywhere -- getEnvelope()/review() had no
  // existence check at all, and extract()'s own check used an unscoped
  // patient list. Any clinician in any org with READ_PHI/WRITE_PHI could
  // read or write extracted PHI (chief complaint, allergies, medications,
  // lab mentions) for a patient in a different hospital by
  // guessing/observing the patientId.
  let service: PatientDocumentArtifactService;
  let patientService: EmergencyPatientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        PatientDocumentArtifactService,
      ],
    }).compile();

    service = module.get(PatientDocumentArtifactService);
    patientService = module.get(EmergencyPatientService);
  });

  it('extract() refuses a patientId belonging to a different organization, and succeeds for the owning org', () => {
    const patient = patientService.createPatient(
      {
        firstName: 'Org',
        lastName: 'B',
        chiefComplaint: 'Test',
        complaintCategory: 'Other',
      } as any,
      'org-b',
    );

    const crossOrg = service.extract(
      patient.id,
      {
        patientId: patient.id,
        documentType: 'Referral Note',
        sourceType: 'referral_note',
        rawText: 'Chief complaint: Chest pain',
      } as any,
      'org-a',
    );
    expect(crossOrg.status).toBe('error');
    expect(crossOrg.data.artifacts).toEqual([]);

    const ownOrg = service.extract(
      patient.id,
      {
        patientId: patient.id,
        documentType: 'Referral Note',
        sourceType: 'referral_note',
        rawText: 'Chief complaint: Chest pain',
      } as any,
      'org-b',
    );
    expect(ownOrg.status).toBe('active');
    expect(ownOrg.data.artifacts.length).toBeGreaterThan(0);
  });

  it('getEnvelope() refuses a patientId belonging to a different organization', () => {
    const patient = patientService.createPatient(
      {
        firstName: 'Org',
        lastName: 'B',
        chiefComplaint: 'Test',
        complaintCategory: 'Other',
      } as any,
      'org-b',
    );
    service.extract(
      patient.id,
      {
        patientId: patient.id,
        documentType: 'Referral Note',
        sourceType: 'referral_note',
        rawText: 'Chief complaint: Chest pain',
      } as any,
      'org-b',
    );

    const crossOrg = service.getEnvelope(patient.id, 'org-a');
    expect(crossOrg.status).toBe('error');
    expect(crossOrg.data.artifacts).toEqual([]);

    const ownOrg = service.getEnvelope(patient.id, 'org-b');
    expect(ownOrg.status).toBe('active');
    expect(ownOrg.data.artifacts.length).toBeGreaterThan(0);
  });

  it('review() refuses a patientId belonging to a different organization', () => {
    const patient = patientService.createPatient(
      {
        firstName: 'Org',
        lastName: 'B',
        chiefComplaint: 'Test',
        complaintCategory: 'Other',
      } as any,
      'org-b',
    );
    const created = service.extract(
      patient.id,
      {
        patientId: patient.id,
        documentType: 'Referral Note',
        sourceType: 'referral_note',
        rawText: 'Chief complaint: Chest pain',
      } as any,
      'org-b',
    );
    const artifactId = created.data.artifacts[0].id;

    const crossOrg = service.review(
      patient.id,
      artifactId,
      { reviewStatus: 'accepted', reviewer: 'attacker' } as any,
      'org-a',
    );
    expect(crossOrg.status).toBe('error');

    const ownOrg = service.review(
      patient.id,
      artifactId,
      { reviewStatus: 'accepted', reviewer: 'nurse-1' } as any,
      'org-b',
    );
    expect(ownOrg.status).toBe('active');
  });
});
