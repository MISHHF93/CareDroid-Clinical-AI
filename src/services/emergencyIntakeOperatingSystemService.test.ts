import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import EmergencyIntakeOperatingSystemService, {
  DocumentIntelligenceService,
  getEmergencyIntakeAutomationFeed,
} from './emergencyIntakeOperatingSystemService';

describe('EmergencyIntakeOperatingSystemService', () => {
  it('unifies intake capabilities into a governed Emergency Intake OS', () => {
    const intake = EmergencyIntakeOperatingSystemService.getOperatingSystem();

    expect(intake).toEqual(
      expect.objectContaining({
        serviceId: 'emergency-intake-operating-system',
        route: '/workspace/emergency/intake',
        unifiedCapabilities: expect.arrayContaining([
          'Smart Arrival',
          'Smart Intake',
          'Document Intelligence',
          'Identity Resolution',
          'Patient Snapshot',
          'Medication Capture',
          'Allergy Capture',
          'Verification',
          'Intake Analytics',
        ]),
        governance: expect.objectContaining({
          verificationRule: 'No demographic extraction should bypass verification.',
          allExtractedFieldsRequireConfirmation: true,
          correctionWorkflowRequired: true,
          auditLoggingRequired: true,
          sourceAttributionRequired: true,
          artifacts: expect.objectContaining({
            patientConfirmation: expect.objectContaining({
              required: true,
              records: expect.arrayContaining([
                expect.objectContaining({
                  field: 'name',
                  confirmedBy: expect.any(String),
                  confirmedAt: expect.any(String),
                  confirmationActorType: expect.stringMatching(/patient|staff|representative/),
                  disputed: expect.any(Boolean),
                  corrected: expect.any(Boolean),
                  declinedToAnswer: expect.any(Boolean),
                }),
              ]),
            }),
            consentCapture: expect.objectContaining({
              required: true,
              records: expect.arrayContaining([
                expect.objectContaining({
                  consentType: expect.any(String),
                  status: expect.any(String),
                  consentTextVersion: expect.any(String),
                  capturedBy: expect.any(String),
                  timestamp: expect.any(String),
                  revocationOrCorrectionState: expect.any(String),
                }),
              ]),
            }),
            auditLog: expect.arrayContaining([
              expect.objectContaining({
                event: 'field extracted',
                suggestedValue: expect.any(String),
                validationResult: expect.any(String),
                reviewerAction: expect.any(String),
                confirmedValue: expect.any(String),
                correctionAction: null,
              }),
              expect.objectContaining({
                event: 'correction action',
                correctionAction: expect.stringMatching(/reconfirm/i),
              }),
            ]),
            correctionWorkflow: expect.arrayContaining(['reconfirm corrected fields']),
          }),
        }),
        intakeRecord: expect.objectContaining({
          promotionRule: 'Only confirmed values are promoted into the intake patient context.',
          fieldProposals: expect.arrayContaining([
            expect.objectContaining({
              field: 'insurance metadata',
              editable: true,
              confirmationState: 'partial review',
              conflict: true,
            }),
            expect.objectContaining({
              field: 'emergency contact',
              missing: true,
            }),
          ]),
          confirmedFields: expect.arrayContaining([
            expect.objectContaining({ field: 'name', confirmedBy: expect.any(String) }),
            expect.objectContaining({ field: 'insurance metadata', source: 'insurance card OCR' }),
          ]),
          draftSuggestions: expect.arrayContaining([
            expect.objectContaining({ field: 'insurance group ID', reason: 'needs review before promotion' }),
          ]),
        }),
      })
    );
    expect(intake.commandCenter.trackedStates.map((state) => state.label)).toEqual([
      'Arrivals',
      'Registrations',
      'Pending verification',
      'Pending intake review',
      'Triage-ready patients',
    ]);
    expect(intake.registrationCompletionScore.label).toBe('Registration Completion Score');
    expect(intake.smartArrival).toEqual(
      expect.objectContaining({
        title: 'Smart Arrival',
        operatingModel: expect.stringMatching(/not a separate intake app/i),
        capturePipeline: expect.arrayContaining([
          expect.objectContaining({ label: 'Capture ID document' }),
          expect.objectContaining({ label: 'OCR extraction' }),
          expect.objectContaining({ label: 'Demographic extraction' }),
          expect.objectContaining({ label: 'Insurance metadata extraction' }),
          expect.objectContaining({ label: 'Referral document ingestion' }),
          expect.objectContaining({ label: 'Medication list ingestion' }),
          expect.objectContaining({ label: 'Allergy extraction' }),
        ]),
        generatedSnapshot: expect.objectContaining({
          status: 'finalized',
          contains: expect.arrayContaining([
            'demographics',
            'allergies',
            'medications',
            'chronic conditions',
            'referral reason',
            'arrival complaint',
          ]),
        }),
        confirmationGate: expect.objectContaining({
          requiredBeforeFinalizing: true,
          acceptedConfirmationActors: expect.arrayContaining(['patient', 'staff']),
          rule: expect.stringMatching(/patient confirmation or staff confirmation/i),
          blocksAutonomousFinalization: true,
        }),
        emergencyWorkspaceFeed: expect.objectContaining({
          route: '/workspace/emergency',
          separateIntakeAppCreated: false,
          arrivalState: expect.stringMatching(/inside CareDroid already summarized/i),
        }),
      })
    );
    expect(intake.implementationTraceability).toEqual(
      expect.objectContaining({
        totalPlans: 19,
        implementedPlans: 19,
        status: expect.stringMatching(/all intake markdown plans linked/i),
        routes: expect.arrayContaining([
          '/workspace/emergency/intake',
          '/workspace/emergency/patient-context',
          '/workspace/emergency/intake-analytics',
          '/workspace/emergency/triage',
        ]),
        tests: expect.arrayContaining([
          'src/services/emergencyIntakeOperatingSystemService.test.js',
          'src/services/emergencyOperatingSystemService.test.js',
          'src/services/workspaceDataPipelineService.test.js',
          'src/pages/WorkspaceHome.test.jsx',
        ]),
      })
    );
    expect(intake.productSurfaces.map((surface) => surface.surface)).toEqual(
      expect.arrayContaining([
        'Document review workspace',
        'Identity resolution review',
        'Medication and allergy capture review',
        'Smart Arrival summary in CareDroid',
        'Emergency command center and Patient Journey Engine views',
      ])
    );
    expect(intake.intakeRecord.confirmedFields.every((field) => field.confirmedAt)).toBe(true);
    expect(intake.intakeRecord.confirmedFields.map((field) => field.field)).not.toContain('emergency contact');
    expect(intake.intakeRecord.draftSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'emergency contact',
          reason: expect.stringMatching(/not promoted until confirmed/i),
        }),
      ])
    );
    expect(intake.implementationTraceability.docs.map((doc) => doc.docPath)).toEqual(
      expect.arrayContaining([
        'docs/smart-patient-intake-engine.md',
        'docs/document-intelligence-pipeline.md',
        'docs/instant-patient-context.md',
        'docs/medication-reconciliation-assistant.md',
        'docs/allergy-risk-capture.md',
        'docs/emergency-registration-accelerator.md',
        'docs/ai-patient-snapshot-generator.md',
        'docs/pre-triage-queue-builder.md',
        'docs/emergency-intake-command-center.md',
        'docs/patient-flow-door-to-triage.md',
        'docs/consent-and-verification-framework.md',
        'docs/emergency-identity-resolution-layer.md',
        'docs/referral-document-ingestion.md',
        'docs/patient-intake-analytics.md',
        'docs/voice-assisted-intake.md',
        'docs/emergency-intake-automation-marketplace.md',
        'docs/emergency-flow-intelligence-integration.md',
        'docs/first-five-minute-experience.md',
        'docs/emergency-intake-operating-system.md',
      ])
    );
    expect(intake.implementationTraceability.docs.every((doc) => existsSync(doc.docPath))).toBe(true);
  });

  it('converts supported documents into structured reviewable records', () => {
    const record = DocumentIntelligenceService.processDocument({
      documentType: 'insurance card',
      sourceDocumentReference: 'insurance-demo',
    });

    expect(DocumentIntelligenceService.getSupportedInputs()).toEqual(
      expect.arrayContaining(['ID document', "driver's license", 'health card', 'insurance card', 'referral letters', 'discharge papers'])
    );
    expect(DocumentIntelligenceService.getAcceptedInputChannels()).toEqual(
      expect.arrayContaining(['uploaded', 'scanned', 'photographed', 'integration-supplied'])
    );
    expect(record).toEqual(
      expect.objectContaining({
        serviceId: 'DocumentIntelligenceService',
        documentType: 'insurance card',
        classification: expect.objectContaining({
          detectedDocumentType: 'insurance card',
          classified: true,
        }),
        pipeline: ['Capture', 'OCR', 'Field Extraction', 'Validation', 'Review', 'Structured Patient'],
        structuredRecord: expect.objectContaining({
          validationStatus: 'review required',
          reviewState: 'pending review',
          reviewerAttribution: 'intake reviewer pending',
          reviewTimestamp: null,
          unresolvedFields: expect.arrayContaining(['groupId']),
          reviewActions: expect.arrayContaining(['correct OCR or extraction errors']),
        }),
        sourceReferences: expect.arrayContaining([
          expect.objectContaining({
            sourceDocumentReference: 'insurance-demo',
            extractedTextSpan: expect.any(String),
            confidence: expect.any(Number),
            reviewStatus: expect.any(String),
            ingestionTimestamp: expect.any(String),
          }),
        ]),
      })
    );
    const intake = EmergencyIntakeOperatingSystemService.getOperatingSystem();
    expect(intake.documentIntelligence.records.map((item) => item.documentType)).toEqual(
      expect.arrayContaining(["driver's license", 'health card', 'insurance card', 'referral letters', 'discharge papers'])
    );
    expect(intake.referralDocumentIngestion.records.map((item) => item.documentType)).toEqual(
      expect.arrayContaining(['referral letters', 'clinic notes', 'discharge summaries', 'EMS reports'])
    );
    for (const record of intake.referralDocumentIngestion.records) {
      expect(record.extractedFields.map((field) => field.field)).toEqual(
        expect.arrayContaining(['diagnoses', 'medications', 'allergies', 'recommendations'])
      );
    }
    expect(intake.referralDocumentIngestion.sourceReferenceRequirements).toEqual(
      expect.arrayContaining(['extracted text span', 'ingestion timestamp'])
    );
    expect(intake.referralDocumentIngestion.searchModes).toEqual(
      expect.arrayContaining(['patient', 'document type', 'extracted concept', 'source', 'review state'])
    );
  });

  it('feeds all intake automation modules into valid Patient Journey Engine states', () => {
    const intake = EmergencyIntakeOperatingSystemService.getOperatingSystem();

    expect(intake.marketplace.modules.map((module) => module.title)).toEqual([
      'Smart Arrival',
      'Smart Intake',
      'OCR Intake',
      'Identity Resolution',
      'Patient Snapshot',
      'Medication Capture',
      'Allergy Capture',
      'Voice Intake',
      'Multi-Language Intake',
    ]);
    expect(intake.patientJourneyFeed).toHaveLength(12);
    expect(intake.patientJourneyFeed.every((module) => module.validJourneyStages)).toBe(true);
    expect(intake.patientJourneyFeed.map((module) => module.title)).toEqual(
      expect.arrayContaining(['Consent and Verification', 'Pre-Triage Queue', 'Intake Analytics'])
    );
    expect(intake.patientJourneyFeed.map((module) => module.patientJourneyStates).flat()).toEqual(
      expect.arrayContaining(['arrival', 'registration', 'triage', 'assessment'])
    );
    expect(getEmergencyIntakeAutomationFeed()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationId: 'emergency-intake-smart-arrival',
          title: 'Smart Arrival',
          humanReviewRequired: true,
          patientJourneyStates: expect.arrayContaining(['arrival', 'registration', 'triage']),
          source: 'EmergencyIntakeOperatingSystemService',
        }),
        expect.objectContaining({
          automationId: 'emergency-intake-smart-intake',
          title: 'Smart Intake',
          humanReviewRequired: true,
          patientJourneyStates: expect.arrayContaining(['arrival', 'registration']),
          source: 'EmergencyIntakeOperatingSystemService',
        }),
        expect.objectContaining({
          automationId: 'emergency-intake-consent-verification',
          title: 'Consent and Verification',
          humanReviewRequired: true,
        }),
        expect.objectContaining({
          automationId: 'emergency-intake-pre-triage-queue',
          title: 'Pre-Triage Queue',
          humanReviewRequired: true,
        }),
        expect.objectContaining({
          automationId: 'emergency-intake-intake-analytics',
          title: 'Intake Analytics',
          humanReviewRequired: true,
        }),
      ])
    );
    expect(intake.marketplace.upgradePaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'Core', to: 'Pro' }),
        expect.objectContaining({ from: 'Pro', to: 'Enterprise' }),
      ])
    );
    expect(intake.marketplace.configurationRules).toEqual(
      expect.arrayContaining(['review controls cannot be disabled for extracted clinical or identity data'])
    );
    expect(intake.emergencyOsIntegration).toEqual(
      expect.objectContaining({
        flow: ['Arrival', 'Intake', 'Verification', 'Patient Context', 'Triage', 'Assessment', 'Disposition'],
        requirements: expect.arrayContaining([
          'verification status controls whether extracted intake fields become confirmed context',
          'triage receives organized pre-triage information without autonomous triage decisions',
        ]),
        surfaces: expect.arrayContaining(['Emergency command center views', 'Patient context workspace']),
      })
    );
  });

  it('models patient snapshot, medication flags, risk capture, and intake analytics', () => {
    const intake = EmergencyIntakeOperatingSystemService.getOperatingSystem();

    expect(intake.patientSnapshot.route).toBe('/workspace/emergency/patient-context');
    expect(intake.patientSnapshot.sections.map((section) => section.question)).toEqual([
      'Who is this patient?',
      'Why are they here?',
      'Key history?',
      'Key medications?',
      'Key allergies?',
      'Recent encounters?',
    ]);
    expect(intake.patientSnapshot.sections.every((section) => section.sourceRecords.length > 0)).toBe(true);
    expect(intake.patientSnapshot.identityAnchor).toBe('confirmed intake patient context');
    expect(intake.patientSnapshot.structuredSummary).toEqual(
      expect.objectContaining({
        demographics: expect.objectContaining({
          displayName: 'Jordan Lee',
          dateOfBirth: '1971-04-12',
        }),
        allergies: expect.arrayContaining(['Penicillin - rash - confirmed']),
        medications: expect.arrayContaining(['Warfarin - patient reported - verification required']),
        chronicConditions: expect.arrayContaining(['Hypertension']),
        referralReason: expect.stringMatching(/chest pain/i),
        arrivalComplaint: 'Chest Pain',
      })
    );
    expect(intake.patientSnapshot.freshnessIndicators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ context: 'demographics', freshness: expect.stringMatching(/confirmed/i) }),
        expect.objectContaining({ context: 'medications', freshness: expect.stringMatching(/stale/i) }),
      ])
    );
    expect(intake.medicationSummary.flags).toEqual(
      expect.objectContaining({
        duplicates: expect.any(Array),
        missingInformation: expect.any(Array),
        uncertainEntries: expect.any(Array),
      })
    );
    expect(intake.medicationSummary.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Warfarin',
          lastTaken: expect.any(String),
          confidence: expect.any(Number),
          verificationStatus: 'requires verification',
        }),
      ])
    );
    expect(intake.medicationSummary.reviewWorkflow).toEqual(
      expect.arrayContaining(['compare patient report against prior records', 'confirm reviewed medications into the Medication Summary'])
    );
    expect(intake.allergyRiskCapture.triageDisplay).toBe('prominent');
    expect(intake.allergyRiskCapture.captureSources).toEqual(
      expect.arrayContaining(['patient or caregiver report', 'prior records', 'clinical staff review'])
    );
    expect(intake.identityResolution.candidateMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          confidenceScore: expect.any(Number),
          matchedFields: expect.arrayContaining(['date of birth']),
          conflictingFields: expect.any(Array),
          reviewStatus: expect.stringMatching(/review/i),
        }),
      ])
    );
    expect(intake.identityResolution.resolutionWorkflow).toEqual(
      expect.arrayContaining(['compare candidate records side by side', 'preserve audit trail of match suggestions and outcomes'])
    );
    expect(intake.preTriageQueue.patients[0]).toEqual(
      expect.objectContaining({
        queuePosition: 1,
        arrivalOrIntakeTimestamp: expect.any(String),
        reviewable: true,
      })
    );
    expect(intake.analytics.route).toBe('/workspace/emergency/intake-analytics');
    expect(intake.analytics.metrics.map((metric) => metric.label)).toEqual([
      'Average registration time',
      'Average verification time',
      'Intake completion rate',
      'Document processing volume',
      'Triage readiness time',
    ]);
    expect(intake.analytics.metricDefinitions.averageRegistrationTime).toMatch(/registration start/i);
    expect(intake.analytics.intakeModeComparison).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: 'QR code intake', completionRate: expect.any(Number) }),
      ])
    );
    expect(intake.voiceIntake).toEqual(
      expect.objectContaining({
        sampleTranscript: expect.stringMatching(/Jordan Lee/i),
        mappedFields: expect.arrayContaining([
          expect.objectContaining({ field: 'complaint', correctionState: 'requires staff confirmation' }),
        ]),
        correctionWorkflow: expect.arrayContaining(['review transcript', 'confirm reviewed fields']),
        alternateIntakePaths: expect.arrayContaining(['kiosk', 'tablet', 'QR code', 'receptionist-assisted intake']),
      })
    );
    expect(intake.firstFiveMinuteExperience.measures[0]).toEqual(
      expect.objectContaining({
        completionStatus: 'measured',
        completionTimestamp: expect.any(String),
        sourceOrMode: expect.any(String),
        missingOrUnresolvedFields: expect.any(Array),
        verificationStatus: expect.any(String),
        responsibleRole: expect.any(String),
      })
    );
    expect(intake.firstFiveMinuteExperience.measures.every((measure) => measure.completionStatus)).toBe(true);
    expect(intake.firstFiveMinuteExperience.measures.every((measure) => Array.isArray(measure.missingOrUnresolvedFields))).toBe(true);
    expect(intake.firstFiveMinuteExperience.measures.every((measure) => measure.responsibleRole)).toBe(true);
    expect(intake.doorToTriage.stages[0]).toEqual(
      expect.objectContaining({
        startTimestamp: 'T+0m',
        completionTimestamp: 'T+1m',
        responsibleRole: expect.any(String),
        sourceSystemOrIntakeMode: expect.any(String),
      })
    );
    expect(intake.doorToTriage.operationalSignals).toEqual(
      expect.arrayContaining(['patients waiting on verification', 'average and median time from arrival to triage-ready state'])
    );
  });
});
