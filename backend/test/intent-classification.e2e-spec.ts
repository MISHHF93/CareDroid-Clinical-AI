/**
 * Intent Classification - Integration Tests
 *
 * End-to-end tests for the intent classification system
 * Tests the full flow: message → classification → chat response
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Intent Classification Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
