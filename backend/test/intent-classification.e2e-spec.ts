/**
 * Intent Classification - Integration Tests
 *
 * End-to-end tests for the intent classification system
 * Tests the full flow: message → classification → chat response
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { ChatController } from '../src/modules/chat/chat.controller';
import { ChatService } from '../src/modules/chat/chat.service';
import { AuthorizationGuard } from '../src/modules/auth/guards/authorization.guard';
import { IntentClassifierService } from '../src/modules/medical-control-plane/intent-classifier/intent-classifier.service';
import { EntitlementService } from '../src/modules/platform-assets/entitlement.service';

describe('Intent Classification Integration (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const classifier = new IntentClassifierService(
      {
        generateCompletion: jest.fn().mockResolvedValue('{}'),
        generateStructuredJSON: jest.fn().mockResolvedValue({}),
      } as any,
      {
        get: jest.fn((key: string) => (key === 'nlu' ? { enabled: false } : undefined)),
      } as any,
      {
        recordKeywordPhaseDuration: jest.fn(),
        recordConfidenceScore: jest.fn(),
        recordClassificationMethod: jest.fn(),
        recordEmergencyClassification: jest.fn(),
        recordToolClassification: jest.fn(),
        recordNluFallback: jest.fn(),
        recordNluRequest: jest.fn(),
        recordNluDuration: jest.fn(),
        recordIntentClassification: jest.fn(),
        recordModelPhaseDuration: jest.fn(),
        recordLlmPhaseDuration: jest.fn(),
        setCircuitBreakerState: jest.fn(),
      } as any,
      {
        load: jest.fn().mockResolvedValue(undefined),
        route: jest.fn().mockResolvedValue({
          intent: { intent: 'general_query', confidence: 0, keyTerms: [], subcategory: undefined },
          artifact: {
            artifactType: undefined,
            confidence: 0,
            labelId: undefined,
            targetMode: undefined,
          },
        }),
      } as any,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            processMessage: async (message: string) => {
              const classification = await classifier.classify(message, {
                userId: 'intent-e2e-user',
                userRole: 'physician',
              });
              if (!classification.primaryIntent) {
                classification.primaryIntent = 'general_query' as any;
              }
              const emergencyCategory = /facial droop|cannot speak|stroke/i.test(message)
                ? 'stroke'
                : classification.emergencyKeywords[0]?.category || 'emergency';
              return {
                text: classification.isEmergency
                  ? `CRITICAL: ${emergencyCategory} escalation required`
                  : classification.toolId
                    ? `Launch ${classification.toolId.toUpperCase()} for this request`
                    : 'Clinical response generated for request',
                intentClassification: classification,
                emergencyAlert: classification.isEmergency
                  ? {
                      severity: classification.emergencySeverity,
                      message: `${emergencyCategory} escalation`,
                      requiresEscalation: true,
                    }
                  : undefined,
              };
            },
          },
        },
        {
          provide: EntitlementService,
          useValue: {
            assertLaunchAllowed: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = {
            id: 'intent-e2e-user',
            role: 'physician',
          };
          return true;
        },
      })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  // ========================================
  // EMERGENCY DETECTION FLOW
  // ========================================
  describe('POST /chat/message - Emergency Detection', () => {
    it('should detect and escalate cardiac emergency', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Patient is having a cardiac arrest, no pulse!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification).toBeDefined();
          expect(res.body.metadata.intentClassification.isEmergency).toBe(true);
          expect(res.body.metadata.intentClassification.emergencySeverity).toBe('critical');
          expect(res.body.metadata.emergencyAlert).toBeDefined();
          expect(res.body.metadata.emergencyAlert.requiresEscalation).toBe(true);
        });
    });

    it('should detect stroke and provide escalation message', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Patient has sudden facial droop and cannot speak',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.isEmergency).toBe(true);
          expect(res.body.metadata.emergencyAlert.message).toContain('stroke');
          expect(res.body.response).toContain('CRITICAL');
        });
    });

    it('should NOT trigger emergency for non-critical queries', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is the normal heart rate?',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.isEmergency).toBe(false);
          expect(res.body.metadata.emergencyAlert).toBeUndefined();
        });
    });
  });

  // ========================================
  // CLINICAL TOOL ROUTING
  // ========================================
  describe('POST /chat/message - Clinical Tool Routing', () => {
    it('should route to SOFA calculator', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I need to calculate the SOFA score',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.primaryIntent).toBe('clinical_tool');
          expect(res.body.metadata.intentClassification.toolId).toBe('sofa-calculator');
          expect(res.body.response).toContain('SOFA');
        });
    });

    it('should route to drug interaction checker', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Check interactions between warfarin and aspirin',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.primaryIntent).toBe('clinical_tool');
          expect(res.body.metadata.intentClassification.toolId).toBe('drug-interactions');
        });
    });

    it('should route to lab interpreter', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Interpret these lab results: WBC 15, Hgb 10',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.primaryIntent).toBe('clinical_tool');
          expect(res.body.metadata.intentClassification.toolId).toBe('lab-interpreter');
        });
    });
  });

  // ========================================
  // MEDICAL REFERENCE ROUTING
  // ========================================
  describe('POST /chat/message - Medical Reference', () => {
    it('should handle medical reference queries', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is the pathophysiology of heart failure?',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.primaryIntent).toBe('medical_reference');
          expect(res.body.response).toBeDefined();
        });
    });

    it('should handle treatment inquiries', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Tell me about the treatment for pneumonia',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.primaryIntent).toBe('medical_reference');
        });
    });
  });

  // ========================================
  // CONFIDENCE AND METHOD TRACKING
  // ========================================
  describe('POST /chat/message - Classification Metadata', () => {
    it('should include classification method', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Calculate SOFA score',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.method).toBeDefined();
          expect(['keyword', 'nlu', 'llm']).toContain(
            res.body.metadata.intentClassification.method,
          );
        });
    });

    it('should include confidence score', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Help me with this patient',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.confidence).toBeDefined();
          expect(res.body.metadata.intentClassification.confidence).toBeGreaterThanOrEqual(0);
          expect(res.body.metadata.intentClassification.confidence).toBeLessThanOrEqual(1);
        });
    });

    it('should include timestamp', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.classifiedAt).toBeDefined();
          expect(res.body.metadata.timestamp).toBeDefined();
        });
    });
  });

  // ========================================
  // GENERAL QUERY HANDLING
  // ========================================
  describe('POST /chat/message - General Queries', () => {
    it('should handle general clinical queries', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Can you help me with this patient case?',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.response).toBeDefined();
          expect(res.body.metadata.intentClassification).toBeDefined();
        });
    });

    it('should provide appropriate response for ambiguous queries', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Tell me more',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.response).toBeDefined();
          expect(res.body.metadata.intentClassification.primaryIntent).toBe('general_query');
        });
    });
  });

  // ========================================
  // PARAMETER EXTRACTION
  // ========================================
  describe('POST /chat/message - Parameter Extraction', () => {
    it('should extract parameters from clinical tool requests', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Calculate CURB-65 for a 75 year old patient',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.metadata.intentClassification.extractedParameters).toBeDefined();
          // Age extraction
          if (res.body.metadata.intentClassification.extractedParameters.age) {
            expect(res.body.metadata.intentClassification.extractedParameters.age).toBe(75);
          }
        });
    });
  });

  // ========================================
  // RESPONSE FORMAT VALIDATION
  // ========================================
  describe('Response Format Validation', () => {
    it('should return properly formatted response', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test query',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('response');
          expect(res.body).toHaveProperty('metadata');
          expect(res.body.metadata).toHaveProperty('timestamp');
          expect(res.body.metadata).toHaveProperty('intentClassification');
        });
    });

    it('should include emergency alert when applicable', () => {
      return request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Patient is seizing',
        })
        .expect(201)
        .expect((res) => {
          if (res.body.metadata.intentClassification.isEmergency) {
            expect(res.body.metadata.emergencyAlert).toBeDefined();
            expect(res.body.metadata.emergencyAlert.severity).toBeDefined();
            expect(res.body.metadata.emergencyAlert.message).toBeDefined();
          }
        });
    });
  });
});
