import { ClinicalIntelligenceController } from './clinical-intelligence.controller';

describe('ClinicalIntelligenceController', () => {
  const buildController = () => {
    const platformSystemsService = {
      demo: jest.fn((capabilityId: string, id?: string, payload?: Record<string, unknown>) => ({
        capabilityId,
        id,
        payload,
        status: 'demo_review_required',
      })),
    };

    return {
      controller: new ClinicalIntelligenceController(platformSystemsService as any),
      platformSystemsService,
    };
  };

  it('routes calculator-recommender suggestions through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    const result = controller.suggestCalculator({ chiefComplaint: 'chest pain' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'calculator-recommender-ai',
      'demo-patient',
      {
        chiefComplaint: 'chest pain',
      },
    );
    expect(result).toEqual({
      capabilityId: 'calculator-recommender-ai',
      id: 'demo-patient',
      payload: { chiefComplaint: 'chest pain' },
      status: 'demo_review_required',
    });
  });

  it('routes workflow-builder generation through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.generateWorkflow({ goal: 'sepsis-pathway' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'workflow-builder-ai',
      'demo-patient',
      {
        goal: 'sepsis-pathway',
      },
    );
  });

  it('routes clinical-reasoning analysis through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.analyzeReasoning({ question: 'why elevated lactate' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'clinical-reasoning-engine',
      'demo-patient',
      {
        question: 'why elevated lactate',
      },
    );
  });

  it('routes why-engine explanations through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.explainWhy({ decision: 'admit' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('why-engine', 'demo-patient', {
      decision: 'admit',
    });
  });

  it('routes audit-trail summaries through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.summarizeAuditTrail({ runId: 'run-1' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('audit-trail-ai', 'demo-patient', {
      runId: 'run-1',
    });
  });

  it('routes clinical-event drafting through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.draftClinicalEvent({ eventType: 'medication-administered' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('clinical-event-ai', 'demo-patient', {
      eventType: 'medication-administered',
    });
  });

  it('routes SOAP drafting through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.draftSoap({ transcript: 'patient reports...' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('soap-builder', 'demo-patient', {
      transcript: 'patient reports...',
    });
  });

  it('routes dictation transcription through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.transcribeDictation({ audioRef: 'clip-1' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('clinical-dictation', 'demo-patient', {
      audioRef: 'clip-1',
    });
  });

  it('routes discharge-summary drafting through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.draftDischargeSummary({ patientId: 'pt-001' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'discharge-summary-ai',
      'demo-patient',
      {
        patientId: 'pt-001',
      },
    );
  });

  it('routes referral drafting through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.draftReferral({ specialty: 'cardiology' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('referral-ai', 'demo-patient', {
      specialty: 'cardiology',
    });
  });

  it('routes prior-auth drafting through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.draftPriorAuth({ medication: 'apixaban' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('prior-auth-ai', 'demo-patient', {
      medication: 'apixaban',
    });
  });

  it('routes document approval through the demo capability contract with the real documentId', () => {
    const { controller, platformSystemsService } = buildController();

    controller.approveDocument('doc-1', { approvedBy: 'staff-1' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('soap-builder', 'doc-1', {
      approvedBy: 'staff-1',
    });
  });

  it('routes document export through the demo capability contract with the real documentId', () => {
    const { controller, platformSystemsService } = buildController();

    controller.exportDocument('doc-2', { format: 'pdf' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('soap-builder', 'doc-2', {
      format: 'pdf',
    });
  });
});
