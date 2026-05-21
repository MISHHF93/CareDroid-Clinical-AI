import { Test, TestingModule } from '@nestjs/testing';
import {
  EmergencyEscalationService,
  EmergencyEscalationDto,
  EmergencySeverity,
} from '../src/modules/medical-control-plane/emergency-escalation/emergency-escalation.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { MetricsService } from '../src/modules/metrics/metrics.service';
import {
  IntentClassification,
  PrimaryIntent,
} from '../src/modules/medical-control-plane/intent-classifier/dto/intent-classification.dto';

describe('Emergency Escalation (Batch 15 Phase 2)', () => {
  let service: EmergencyEscalationService;
  let auditService: AuditService;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyEscalationService,
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordEmergencyDetection: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmergencyEscalationService>(EmergencyEscalationService);
    auditService = module.get<AuditService>(AuditService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Emergency Detection (Step 1)', () => {
    it('should detect critical cardiac emergency', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.95,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'cardiac arrest', category: 'cardiac', severity: EmergencySeverity.CRITICAL },
        ],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: ['cardiac arrest'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.CRITICAL,
        category: 'cardiac',
        keywords: ['cardiac arrest'],
        context: {
          userId: 'test-user-123',
          message: 'Patient in cardiac arrest',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.escalated).toBe(true);
      expect(result.severity).toBe(EmergencySeverity.CRITICAL);
      expect(result.requiresImmediate911).toBe(true);
    });

    it('should detect urgent respiratory emergency', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.88,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          {
            keyword: 'respiratory distress',
            category: 'respiratory',
            severity: EmergencySeverity.URGENT,
          },
        ],
        emergencySeverity: EmergencySeverity.URGENT,
        matchedPatterns: ['respiratory distress'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.URGENT,
        category: 'respiratory',
        keywords: ['respiratory distress'],
        context: {
          userId: 'test-user-123',
          message: 'Patient with severe respiratory distress',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.escalated).toBe(true);
      expect(result.severity).toBe(EmergencySeverity.URGENT);
      expect(result.medicalDirectorNotified).toBe(true);
    });

    it('should detect moderate neurological concern', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.75,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'confusion', category: 'neurological', severity: EmergencySeverity.MODERATE },
        ],
        emergencySeverity: EmergencySeverity.MODERATE,
        matchedPatterns: ['confusion'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.MODERATE,
        category: 'neurological',
        keywords: ['confusion'],
        context: {
          userId: 'test-user-123',
          message: 'Patient appears confused',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.escalated).toBe(true);
      expect(result.severity).toBe(EmergencySeverity.MODERATE);
      expect(result.requiresImmediate911).toBe(false);
    });
  });

  describe('Escalation Actions (Step 2)', () => {
    it('should trigger 911 for critical emergencies', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 1.0,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'stroke', category: 'neurological', severity: EmergencySeverity.CRITICAL },
        ],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: ['stroke'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.CRITICAL,
        category: 'neurological',
        keywords: ['stroke'],
        context: {
          userId: 'test-user-123',
          message: 'Suspected stroke',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.requiresImmediate911).toBe(true);
      expect(result.actions.some((a) => a.type === 'call_911')).toBe(true);
    });

    it('should notify medical director for all emergencies', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.9,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'chest pain', category: 'cardiac', severity: EmergencySeverity.URGENT },
        ],
        emergencySeverity: EmergencySeverity.URGENT,
        matchedPatterns: ['chest pain'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.URGENT,
        category: 'cardiac',
        keywords: ['chest pain'],
        context: {
          userId: 'test-user-123',
          message: 'Patient with chest pain',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.medicalDirectorNotified).toBe(true);
      expect(result.actions.some((a) => a.type === 'notify_medical_director')).toBe(true);
    });

    it('should activate appropriate protocols', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.95,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'sepsis', category: 'sepsis', severity: EmergencySeverity.CRITICAL },
        ],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: ['sepsis'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.CRITICAL,
        category: 'sepsis',
        keywords: ['sepsis'],
        context: {
          userId: 'test-user-123',
          message: 'Septic shock suspected',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.actions.some((a) => a.type === 'activate_protocol')).toBe(true);
      expect(result.recommendations).toContain('Obtain blood cultures before antibiotics');
    });
  });

  describe('Clinical Recommendations (Step 3)', () => {
    it('should provide cardiac-specific recommendations', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.92,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'MI', category: 'cardiac', severity: EmergencySeverity.CRITICAL },
        ],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: ['MI'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.CRITICAL,
        category: 'cardiac',
        keywords: ['MI'],
        context: {
          userId: 'test-user-123',
          message: 'STEMI suspected',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.recommendations).toContain('Obtain 12-lead ECG immediately');
      expect(result.recommendations).toContain(
        'Administer aspirin 325mg PO if not contraindicated',
      );
    });

    it('should provide respiratory-specific recommendations', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.88,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'hypoxia', category: 'respiratory', severity: EmergencySeverity.CRITICAL },
        ],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: ['hypoxia'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.CRITICAL,
        category: 'respiratory',
        keywords: ['hypoxia'],
        context: {
          userId: 'test-user-123',
          message: 'Severe hypoxia',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.recommendations).toContain(
        'Administer supplemental oxygen to maintain SpO2 > 90%',
      );
      expect(result.recommendations).toContain('Assess airway patency');
    });

    it('should always include documentation recommendation', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.8,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'trauma', category: 'trauma', severity: EmergencySeverity.URGENT },
        ],
        emergencySeverity: EmergencySeverity.URGENT,
        matchedPatterns: ['trauma'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.URGENT,
        category: 'trauma',
        keywords: ['trauma'],
        context: {
          userId: 'test-user-123',
          message: 'Trauma patient',
          timestamp: new Date(),
        },
      };

      const result = await service.escalate(classification, dto);

      expect(result.recommendations).toContain('Document all interventions and patient responses');
    });
  });

  describe('Audit & Metrics (Step 4)', () => {
    it('should log escalation in audit trail', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.95,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'emergency', category: 'general', severity: EmergencySeverity.URGENT },
        ],
        emergencySeverity: EmergencySeverity.URGENT,
        matchedPatterns: ['emergency'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.URGENT,
        category: 'general',
        keywords: ['emergency'],
        context: {
          userId: 'test-user-123',
          conversationId: 456,
          message: 'This is an emergency',
          timestamp: new Date(),
        },
      };

      await service.escalate(classification, dto);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-123',
          resource: 'emergency/escalation',
          details: expect.objectContaining({
            severity: EmergencySeverity.URGENT,
            category: 'general',
            keywords: ['emergency'],
          }),
        }),
      );
    });

    it('should record escalation metrics', async () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.9,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [
          { keyword: 'critical', category: 'general', severity: EmergencySeverity.CRITICAL },
        ],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: ['critical'],
        classifiedAt: new Date(),
      };

      const dto: EmergencyEscalationDto = {
        severity: EmergencySeverity.CRITICAL,
        category: 'cardiac',
        keywords: ['critical'],
        context: {
          userId: 'test-user-123',
          message: 'Critical situation',
          timestamp: new Date(),
        },
      };

      await service.escalate(classification, dto);

      expect(metricsService.recordEmergencyDetection).toHaveBeenCalledWith('cardiac', 'critical');
    });
  });

  describe('shouldEscalate (Step 5)', () => {
    it('should return true for emergency classification', () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.9,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [],
        emergencySeverity: EmergencySeverity.CRITICAL,
        matchedPatterns: [],
        classifiedAt: new Date(),
      };

      const result = service.shouldEscalate(classification);

      expect(result).toBe(true);
    });

    it('should return false for non-emergency classification', () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.GENERAL_QUERY,
        confidence: 0.9,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: false,
        emergencyKeywords: [],
        matchedPatterns: [],
        classifiedAt: new Date(),
      };

      const result = service.shouldEscalate(classification);

      expect(result).toBe(false);
    });

    it('should return false if severity is undefined', () => {
      const classification: IntentClassification = {
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.85,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: true,
        emergencyKeywords: [],
        emergencySeverity: undefined,
        matchedPatterns: [],
        classifiedAt: new Date(),
      };

      const result = service.shouldEscalate(classification);

      expect(result).toBe(false);
    });
  });
});
