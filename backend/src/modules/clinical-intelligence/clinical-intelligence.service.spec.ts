import { ClinicalIntelligenceService } from './clinical-intelligence.service';
import { AmbientScribeNoteType } from './dto/ambient-scribe.dto';
import { AuditAction } from '../audit/entities/audit-log.entity';

describe('ClinicalIntelligenceService', () => {
  const auditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    findByUser: jest.fn(),
    findByAction: jest.fn(),
  };
  const ragService = {
    retrieve: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createService() {
    return new ClinicalIntelligenceService(auditService as any, ragService as any);
  }

  it('generates a SOAP draft that always requires clinician review', async () => {
    const service = createService();

    const result = await service.generateAmbientScribeDraft('user-1', {
      noteType: AmbientScribeNoteType.SOAP,
      transcriptText:
        'Patient reports cough for three days with low grade fever. Denies chest pain. Exam and vitals need clinician verification.',
      patientContext: {
        patientLabel: 'Clinic follow-up',
        encounterType: 'primary care',
        clinicianInstructions: 'Include return precautions.',
      },
      safetyAcknowledged: true,
    });

    expect(result.capabilityId).toBe('ambient-scribe');
    expect(result.status).toBe('review_required');
    expect(result.reviewRequired).toBe(true);
    expect(result.safety.requiresHumanReview).toBe(true);
    expect(result.safety.blockedActions).toEqual(
      expect.arrayContaining(['auto_sign_note', 'ehr_write_back', 'autonomous_chart_modification']),
    );
    expect(result.draft.sections.Subjective).toContain('Patient reports cough');
    expect(result.draft.sections.Plan).toContain('Include return precautions');
  });

  it('audits PHI access without storing the raw transcript in metadata', async () => {
    const service = createService();

    await service.generateAmbientScribeDraft('user-2', {
      noteType: AmbientScribeNoteType.DISCHARGE_SUMMARY,
      transcriptText:
        'Patient admitted for dehydration, improved with fluids, tolerating oral intake, and needs follow-up with primary care.',
      patientContext: {},
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        action: AuditAction.AI_QUERY,
        resource: 'clinical-intelligence/ambient-scribe',
        phiAccessed: true,
        metadata: expect.objectContaining({
          capabilityId: 'ambient-scribe',
          noteType: AmbientScribeNoteType.DISCHARGE_SUMMARY,
          status: 'review_required',
          transcriptCharacters: expect.any(Number),
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.transcriptText).toBeUndefined();
  });

  it('returns citation-bound guideline evidence with source attribution and explainability', async () => {
    ragService.retrieve.mockResolvedValue({
      chunks: [
        {
          id: 'chunk-1',
          text: 'Guidelines recommend administering broad-spectrum antibiotics promptly after sepsis recognition.',
          score: 0.91,
          metadata: {
            sourceId: 'src-1',
            title: 'Sepsis Guideline',
            type: 'guideline',
            organization: 'Example Society',
            date: '2025',
            url: 'https://example.org/sepsis',
            chunkIndex: 2,
          },
        },
      ],
      sources: [],
      confidence: 0.91,
      query: 'sepsis antibiotics timing',
      timestamp: new Date(),
      totalRetrieved: 1,
      latencyMs: 12,
    });
    const service = createService();

    const result = await service.queryGuidelineEvidence('user-3', {
      query: 'What do guidelines say about sepsis antibiotics timing?',
      specialty: 'emergency medicine',
      topK: 5,
      minScore: 0.6,
    });

    expect(ragService.retrieve).toHaveBeenCalledWith(
      expect.stringContaining('sepsis antibiotics timing'),
      expect.objectContaining({ documentType: 'guideline', specialty: 'emergency medicine' }),
    );
    expect(result.status).toBe('evidence_found');
    expect(result.summary.recommendations[0]).toMatchObject({
      text: expect.stringContaining('Guidelines recommend'),
      citationIds: [1],
    });
    expect(result.citations[0]).toMatchObject({
      id: 1,
      sourceId: 'src-1',
      title: 'Sepsis Guideline',
      organization: 'Example Society',
    });
    expect(result.sources[0]).toMatchObject({ chunkId: 'chunk-1', citationId: 1 });
    expect(result.explainability.limitations.join(' ')).toMatch(
      /Does not generate recommendations beyond retrieved source text/i,
    );
  });

  it('withholds recommendations when retrieval has insufficient evidence', async () => {
    ragService.retrieve.mockResolvedValue({
      chunks: [],
      sources: [],
      confidence: 0,
      query: 'rare unsupported claim',
      timestamp: new Date(),
      totalRetrieved: 0,
      latencyMs: 4,
    });
    const service = createService();

    const result = await service.queryGuidelineEvidence('user-4', {
      query: 'Should I make an unsupported medical claim?',
    });

    expect(result.status).toBe('insufficient_evidence');
    expect(result.summary.recommendations).toEqual([]);
    expect(result.summary.unsupportedClaimNotice).toMatch(
      /Insufficient retrieved guideline evidence/i,
    );
  });

  it('generates ranked differential decision support with calculator suggestions and safety flags', async () => {
    const service = createService();

    const result = await service.generateDifferentialAi('user-5', {
      symptoms: 'Chest pain with diaphoresis and dyspnea',
      labs: 'Troponin elevated',
      history: 'Hypertension and diabetes',
      demographics: { age: 67, sex: 'female' },
    });

    expect(result.capabilityId).toBe('differential-ai');
    expect(result.status).toBe('ranked_differential_generated');
    expect(result.rankedDifferentials[0]).toMatchObject({
      condition: 'Acute coronary syndrome',
      likelihood: 'higher',
    });
    expect(result.rankedDifferentials[0].supportingEvidence.join(' ')).toContain('troponin');
    expect(result.suggestedCalculators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'heart-score', label: 'HEART score' }),
        expect.objectContaining({ id: 'wells-pe' }),
      ]),
    );
    expect(result.explainability.evidenceInputsUsed).toEqual(
      expect.arrayContaining(['symptoms', 'labs', 'history', 'demographics']),
    );
    expect(result.safety).toMatchObject({
      decisionSupportOnly: true,
      notDiagnosis: true,
    });
  });

  it('audits differential-ai PHI access without storing raw clinical inputs', async () => {
    const service = createService();

    await service.generateDifferentialAi('user-6', {
      symptoms: 'Fever with hypotension and altered mental status',
      labs: 'Lactate elevated',
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-6',
        resource: 'clinical-intelligence/differential-ai',
        phiAccessed: true,
        metadata: expect.objectContaining({
          capabilityId: 'differential-ai',
          status: 'ranked_differential_generated',
          symptomsCharacters: expect.any(Number),
          labsProvided: true,
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.symptoms).toBeUndefined();
    expect(auditService.log.mock.calls[0][0].metadata.labs).toBeUndefined();
  });

  it('generates patient timeline summaries with trends and abnormal progression flags', async () => {
    const service = createService();

    const result = await service.generateTimelineAi('user-7', {
      patientContext: 'CHF and CKD',
      focus: 'respiratory decline and renal trend',
      encounters: [
        {
          date: '2026-05-01',
          encounterType: 'ED visit',
          title: 'Initial dyspnea visit',
          details: 'Presented with dyspnea and edema. Discharged with close follow-up.',
          labs: 'BNP 650, creatinine 1.2',
          vitals: 'SpO2 95%, BP 128/76',
        },
        {
          date: '2026-05-05',
          encounterType: 'Admission',
          title: 'Worsening respiratory status',
          details: 'Returned with worsening dyspnea and progressive edema.',
          labs: 'Creatinine rising to 1.8',
          vitals: 'SpO2 88% on room air, hypotension noted',
        },
      ],
    });

    expect(result.capabilityId).toBe('timeline-ai');
    expect(result.status).toBe('timeline_generated');
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[1]).toMatchObject({
      dateLabel: '2026-05-05',
      title: 'Worsening respiratory status',
    });
    expect(result.trends).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'respiratory', direction: 'worsening' }),
        expect.objectContaining({ id: 'renal', direction: 'worsening' }),
      ]),
    );
    expect(result.abnormalProgression.length).toBeGreaterThan(0);
    expect(result.safety.decisionSupportOnly).toBe(true);
  });

  it('audits timeline-ai PHI access without storing raw encounter details', async () => {
    const service = createService();

    await service.generateTimelineAi('user-8', {
      patientContext: 'Complex longitudinal review',
      encounters: [
        {
          details: 'Fever and hypotension with elevated lactate.',
          labs: 'Lactate 4.1',
        },
      ],
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-8',
        resource: 'clinical-intelligence/timeline-ai',
        phiAccessed: true,
        metadata: expect.objectContaining({
          capabilityId: 'timeline-ai',
          status: 'timeline_generated',
          encounterCount: 1,
          patientContextProvided: true,
          abnormalProgressionCount: expect.any(Number),
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.encounters).toBeUndefined();
    expect(auditService.log.mock.calls[0][0].metadata.patientContext).toBeUndefined();
  });

  it('generates patient summary sections for problems, medications, labs, alerts, and risk factors', async () => {
    const service = createService();

    const result = await service.generatePatientSummaryAi('user-9', {
      patientContext: '72-year-old admitted for CHF exacerbation with CKD and diabetes.',
      problems: 'CHF exacerbation; CKD stage 3; diabetes; hypertension',
      medications: 'Furosemide; lisinopril; metformin',
      labs: 'Creatinine 1.8 from 1.2; K 5.5; A1c 8.4',
      alerts: 'Hyperkalemia alert; fall risk',
      riskFactors: 'Age; CKD; diabetes; prior MI',
      notes: 'Needs medication and renal function review.',
    });

    expect(result.capabilityId).toBe('patient-summary-ai');
    expect(result.status).toBe('summary_generated');
    expect(result.activeProblems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'CHF exacerbation' }),
        expect.objectContaining({ label: 'Chronic kidney disease / renal impairment' }),
      ]),
    );
    expect(result.medications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Furosemide' }),
        expect.objectContaining({ name: 'lisinopril' }),
      ]),
    );
    expect(result.recentLabs).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'K', interpretation: 'abnormal' })]),
    );
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Hyperkalemia alert', severity: 'urgent_review' }),
      ]),
    );
    expect(result.riskFactors).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'CKD' })]),
    );
    expect(result.safety.decisionSupportOnly).toBe(true);
  });

  it('audits patient-summary-ai PHI access without storing raw summary input text', async () => {
    const service = createService();

    await service.generatePatientSummaryAi('user-10', {
      patientContext: 'Complex patient summary context',
      problems: 'Sepsis; CKD',
      medications: 'Vancomycin; lisinopril',
      labs: 'Lactate 4.2; K 6.1',
      alerts: 'Critical potassium',
      riskFactors: 'CKD',
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-10',
        resource: 'clinical-intelligence/patient-summary-ai',
        phiAccessed: true,
        metadata: expect.objectContaining({
          capabilityId: 'patient-summary-ai',
          status: 'summary_generated',
          activeProblemCount: expect.any(Number),
          medicationCount: expect.any(Number),
          labCount: expect.any(Number),
          alertCount: expect.any(Number),
          riskFactorCount: expect.any(Number),
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.patientContext).toBeUndefined();
    expect(auditService.log.mock.calls[0][0].metadata.problems).toBeUndefined();
    expect(auditService.log.mock.calls[0][0].metadata.medications).toBeUndefined();
    expect(auditService.log.mock.calls[0][0].metadata.labs).toBeUndefined();
  });

  it('generates review-required order bundles and protocol pathways without autonomous orders', async () => {
    const service = createService();

    const result = await service.generateOrderSetAi('user-11', {
      clinicalScenario:
        'Suspected sepsis with hypotension, fever, elevated lactate, and pneumonia source concern.',
      diagnosis: 'Sepsis / pneumonia',
      patientContext: 'CKD stage 3 and penicillin allergy.',
      constraints: 'Renal dosing and local antimicrobial stewardship review.',
    });

    expect(result.capabilityId).toBe('order-set-ai');
    expect(result.status).toBe('suggestions_generated');
    expect(result.orderBundles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sepsis-initial-review',
          title: 'Sepsis Initial Evaluation Bundle',
        }),
      ]),
    );
    expect(result.orderBundles[0].suggestedOrders[0]).toMatchObject({
      reviewRequired: true,
    });
    expect(result.protocolPathways).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'sepsis-pathway' })]),
    );
    expect(result.explainability.matchedSignals).toEqual(
      expect.arrayContaining(['Sepsis / infection pathway signal']),
    );
    // HEAL-312: the old single "Renal/allergy constraint signal" gave zero indication
    // of which concern (or both) actually fired, or what text triggered it. Now the two
    // concerns are split and each carries the actual matched excerpt.
    expect(result.explainability.matchedSignals).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Documented allergy signal: ".*allerg.*"$/)]),
    );
    expect(result.explainability.matchedSignals).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Renal function constraint signal: ".*(ckd|renal).*"$/),
      ]),
    );
    expect(result.safety).toMatchObject({
      reviewRequired: true,
      autonomousOrderPlacement: false,
    });
    expect(result.safety.blockedActions).toEqual(
      expect.arrayContaining(['place_orders', 'sign_orders']),
    );
  });

  it("HEAL-312: order bundle review checklists name the specific allergy/renal text detected in THIS patient's context, not identical boilerplate for every patient", async () => {
    const service = createService();

    const withAllergy = await service.generateOrderSetAi('user-11a', {
      clinicalScenario: 'Suspected sepsis with hypotension, fever, elevated lactate.',
      diagnosis: 'Sepsis',
      patientContext: 'Documented penicillin allergy.',
    });
    const withoutConstraint = await service.generateOrderSetAi('user-11b', {
      clinicalScenario: 'Suspected sepsis with hypotension, fever, elevated lactate.',
      diagnosis: 'Sepsis',
    });

    const allergyChecklist = withAllergy.orderBundles[0].reviewChecklist;
    const plainChecklist = withoutConstraint.orderBundles[0].reviewChecklist;

    expect(allergyChecklist.some((item) => item.includes('penicillin'))).toBe(true);
    // The two patients must not receive an identical checklist -- before HEAL-312 they
    // always did, since the constraint flag never changed any returned content.
    expect(allergyChecklist).not.toEqual(plainChecklist);
  });

  it('audits order-set-ai PHI access without storing raw scenario text', async () => {
    const service = createService();

    await service.generateOrderSetAi('user-12', {
      clinicalScenario: 'Chest pain with elevated troponin and ECG concern.',
      diagnosis: 'ACS',
      patientContext: 'On anticoagulation.',
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-12',
        resource: 'clinical-intelligence/order-set-ai',
        phiAccessed: true,
        metadata: expect.objectContaining({
          capabilityId: 'order-set-ai',
          status: 'suggestions_generated',
          scenarioCharacters: expect.any(Number),
          diagnosisProvided: true,
          patientContextProvided: true,
          bundleCount: expect.any(Number),
          pathwayCount: expect.any(Number),
          blockedActions: expect.arrayContaining(['place_orders']),
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.clinicalScenario).toBeUndefined();
    expect(auditService.log.mock.calls[0][0].metadata.patientContext).toBeUndefined();
  });

  it('returns ai-explainability confidence, source, reasoning, tool chain, and sanitized logs', async () => {
    const service = createService();
    auditService.findByUser.mockResolvedValue([
      {
        id: 'log-1',
        action: AuditAction.AI_QUERY,
        resource: 'clinical-intelligence/guideline-rag',
        phiAccessed: false,
        integrityVerified: true,
        hash: 'abcdef1234567890',
        timestamp: new Date('2026-05-22T05:00:00Z'),
        metadata: {
          runId: 'rag-run-1',
          capabilityId: 'guideline-rag',
          status: 'evidence_found',
          sourceCount: 2,
          chunksRetrieved: 4,
          query: 'raw question should not appear',
        },
      },
    ]);

    const result = await service.getAiExplainabilityTrace('user-13', {
      toolId: 'guideline-rag',
      clinicalQuestion: 'Why this recommendation?',
      limit: '10',
    });

    expect(result.capabilityId).toBe('ai-explainability');
    expect(result.confidence.label).toBe('high');
    expect(result.source).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'guideline-rag' })]),
    );
    expect(result.reasoning.join(' ')).toMatch(/sanitized execution log/i);
    expect(result.toolChain).toEqual(
      expect.arrayContaining(['guideline-rag -> evidence_found -> ai_query']),
    );
    expect(result.executionLogs[0].metadataSummary).toMatchObject({
      capabilityId: 'guideline-rag',
      sourceCount: 2,
      chunksRetrieved: 4,
    });
    expect(result.executionLogs[0].metadataSummary.query).toBeUndefined();
  });

  it('audits ai-explainability trace requests without storing raw clinical question text', async () => {
    const service = createService();
    auditService.findByUser.mockResolvedValue([]);

    await service.getAiExplainabilityTrace('user-14', {
      toolId: 'order-set-ai',
      clinicalQuestion: 'Contains PHI-like narrative that should not be stored.',
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-14',
        resource: 'clinical-intelligence/ai-explainability',
        phiAccessed: true,
        metadata: expect.objectContaining({
          capabilityId: 'ai-explainability',
          requestedToolId: 'order-set-ai',
          clinicalQuestionProvided: true,
          executionLogCount: 0,
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.clinicalQuestion).toBeUndefined();
  });

  it('returns clinical-audit execution log summaries with PHI and integrity counts', async () => {
    const service = createService();
    auditService.findByAction.mockResolvedValue([
      {
        id: 'log-2',
        action: AuditAction.AI_QUERY,
        resource: 'clinical-intelligence/differential-ai',
        phiAccessed: true,
        integrityVerified: true,
        hash: '1234567890abcdef',
        timestamp: new Date('2026-05-22T05:10:00Z'),
        metadata: {
          runId: 'diff-run-1',
          capabilityId: 'differential-ai',
          status: 'ranked_differential_generated',
          symptoms: 'raw symptoms should not appear',
        },
      },
    ]);

    const result = await service.getClinicalAuditExecutionLogs('auditor-1', {
      action: 'ai_query',
      limit: '25',
    });

    expect(result.capabilityId).toBe('clinical-audit');
    expect(result.status).toBe('logs_available');
    expect(result.summary).toMatchObject({
      logCount: 1,
      phiAccessCount: 1,
      integrityVerifiedCount: 1,
      uniqueCapabilities: ['differential-ai'],
    });
    expect(result.executionLogs[0].metadataSummary.symptoms).toBeUndefined();
    expect(result.toolChain).toEqual(
      expect.arrayContaining(['differential-ai -> ranked_differential_generated -> ai_query']),
    );
  });

  it("HEAL-310: scopes clinical-audit execution logs to the caller's own organization", async () => {
    const service = createService();
    auditService.findByAction.mockResolvedValue([]);

    await service.getClinicalAuditExecutionLogs(
      'physician-1',
      { action: 'ai_query', limit: '25' },
      { organizationId: 'org-a' },
    );

    // Before HEAL-310, findByAction was called with only (action, limit) -- no
    // organizationId -- which returned every organization's PHI-access/AI-query
    // audit trail to any caller with VIEW_AUDIT_LOGS (a permission granted to the
    // PHYSICIAN role for "own patients only"). This asserts the org filter is
    // actually threaded through to the query, not just accepted and dropped.
    expect(auditService.findByAction).toHaveBeenCalledWith(AuditAction.AI_QUERY, 25, 'org-a');
  });

  it('HEAL-310: still queries all-organization logs when no tenant context is available (back-compat)', async () => {
    const service = createService();
    auditService.findByAction.mockResolvedValue([]);

    await service.getClinicalAuditExecutionLogs('physician-1', { action: 'ai_query', limit: '25' });

    expect(auditService.findByAction).toHaveBeenCalledWith(AuditAction.AI_QUERY, 25, undefined);
  });
});
