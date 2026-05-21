/**
 * Tool Orchestrator API Integration Tests
 *
 * E2E tests for REST API endpoints
 * Tests tool execution via HTTP, parameter validation, response structure
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ToolOrchestratorController } from '../../../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller';
import { ToolOrchestratorService } from '../../../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import { SofaCalculatorService } from '../../../src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service';
import { DrugCheckerService } from '../../../src/modules/medical-control-plane/tool-orchestrator/services/drug-checker.service';
import { LabInterpreterService } from '../../../src/modules/medical-control-plane/tool-orchestrator/services/lab-interpreter.service';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { AIService } from '../../../src/modules/ai/ai.service';

describe('Tool Orchestrator API (e2e)', () => {
  let app: INestApplication;
  let mockAuditService: any;
  let mockAiService: any;

  beforeAll(async () => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    mockAiService = {
      generateStructuredJSON: jest.fn().mockResolvedValue({}),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ToolOrchestratorController],
      providers: [
        ToolOrchestratorService,
        SofaCalculatorService,
        DrugCheckerService,
        LabInterpreterService,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: AIService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /tools', () => {
    it('should return list of available tools', () => {
      return request(app.getHttpServer())
        .get('/tools')
        .expect(200)
        .expect((res) => {
          expect(res.body.tools).toBeDefined();
          expect(res.body.count).toBe(3);
        });
    });

    it('should include tool metadata', () => {
      return request(app.getHttpServer())
        .get('/tools')
        .expect(200)
        .expect((res) => {
          const tool = res.body.tools[0];
          expect(tool).toHaveProperty('id');
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('category');
          expect(tool).toHaveProperty('parameters');
        });
    });

    it('should include SOFA calculator', () => {
      return request(app.getHttpServer())
        .get('/tools')
        .expect(200)
        .expect((res) => {
          const sofa = res.body.tools.find((t) => t.id === 'sofa-calculator');
          expect(sofa).toBeDefined();
        });
    });

    it('should include drug checker', () => {
      return request(app.getHttpServer())
        .get('/tools')
        .expect(200)
        .expect((res) => {
          const drug = res.body.tools.find((t) => t.id === 'drug-interaction-checker');
          expect(drug).toBeDefined();
        });
    });

    it('should include lab interpreter', () => {
      return request(app.getHttpServer())
        .get('/tools')
        .expect(200)
        .expect((res) => {
          const lab = res.body.tools.find((t) => t.id === 'lab-interpreter');
          expect(lab).toBeDefined();
        });
    });
  });

  describe('GET /tools/statistics', () => {
    it('should return tool statistics', () => {
      return request(app.getHttpServer())
        .get('/tools/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body.totalTools).toBeDefined();
          expect(res.body.toolsByCategory).toBeDefined();
          expect(res.body.tools).toBeDefined();
        });
    });

    it('should show correct total tools', () => {
      return request(app.getHttpServer())
        .get('/tools/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body.totalTools).toBe(3);
        });
    });
  });

  describe('GET /tools/:id', () => {
    it('should return metadata for specific tool', () => {
      return request(app.getHttpServer())
        .get('/tools/sofa-calculator')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('sofa-calculator');
          expect(res.body.name).toBe('SOFA Score Calculator');
          expect(res.body.parameters).toBeDefined();
        });
    });

    it('should return 404 for non-existent tool', () => {
      return request(app.getHttpServer()).get('/tools/invalid-tool').expect(404);
    });

    it('should include parameter schema', () => {
      return request(app.getHttpServer())
        .get('/tools/sofa-calculator')
        .expect(200)
        .expect((res) => {
          expect(res.body.parameters.length).toBeGreaterThan(0);
          expect(res.body.parameters[0]).toHaveProperty('name');
          expect(res.body.parameters[0]).toHaveProperty('type');
        });
    });
  });

  describe('POST /tools/:id/validate', () => {
    it('should validate SOFA parameters', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/validate')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
        });
    });

    it('should reject invalid parameters', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interaction-checker/validate')
        .send({
          parameters: { medications: [] },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(false);
          expect(res.body.errors.length).toBeGreaterThan(0);
        });
    });

    it('should validate drug checker parameters', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interaction-checker/validate')
        .send({
          parameters: { medications: ['warfarin', 'aspirin'] },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
        });
    });
  });

  describe('POST /tools/:id/execute', () => {
    it('should execute SOFA calculator', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: {
            pao2: 200,
            fio2: 1.0,
            platelets: 150,
            bilirubin: 1.0,
            map: 70,
            gcs: 15,
            creatinine: 0.9,
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.toolId).toBe('sofa-calculator');
          expect(res.body.result.success).toBe(true);
          expect(res.body.result.data).toBeDefined();
        });
    });

    it('should execute drug checker', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interaction-checker/execute')
        .send({
          parameters: { medications: ['warfarin', 'aspirin'] },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.toolId).toBe('drug-interaction-checker');
        });
    });

    it('should execute lab interpreter', () => {
      return request(app.getHttpServer())
        .post('/tools/lab-interpreter/execute')
        .send({
          parameters: {
            labValues: [
              { name: 'WBC', value: 7.0 },
              { name: 'Hemoglobin', value: 14.0 },
            ],
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.toolId).toBe('lab-interpreter');
        });
    });

    it('should return execution time', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.executionTimeMs).toBeDefined();
          expect(res.body.executionTimeMs).toBeGreaterThanOrEqual(0);
        });
    });

    it('should handle validation errors', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interaction-checker/execute')
        .send({
          parameters: { medications: [] },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.result.errors).toBeDefined();
        });
    });

    it('should include tool name in response', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.toolName).toBe('SOFA Score Calculator');
        });
    });

    it('should include interpretation in result', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.result.interpretation).toBeDefined();
        });
    });

    it('should include citations in result', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.result.citations).toBeDefined();
        });
    });

    it('should include timestamp in result', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.result.timestamp).toBeDefined();
        });
    });
  });

  describe('POST /tools/execute (generic endpoint)', () => {
    it('should execute tool via generic endpoint', () => {
      return request(app.getHttpServer())
        .post('/tools/execute')
        .send({
          toolId: 'sofa-calculator',
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.toolId).toBe('sofa-calculator');
        });
    });

    it('should accept userId in request', () => {
      return request(app.getHttpServer())
        .post('/tools/execute')
        .send({
          toolId: 'sofa-calculator',
          parameters: { pao2: 200, fio2: 1.0 },
          userId: 'test-user-123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should accept conversationId in request', () => {
      return request(app.getHttpServer())
        .post('/tools/execute')
        .send({
          toolId: 'sofa-calculator',
          parameters: { pao2: 200, fio2: 1.0 },
          conversationId: 'conv-123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('Response structure validation', () => {
    it('successful response should have required fields', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('toolId');
          expect(res.body).toHaveProperty('toolName');
          expect(res.body).toHaveProperty('result');
          expect(res.body).toHaveProperty('executionTimeMs');
        });
    });

    it('result object should have required fields', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          const result = res.body.result;
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('timestamp');
        });
    });

    it('data object should be present', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.result.data).toBe('object');
        });
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent tool', () => {
      return request(app.getHttpServer())
        .post('/tools/invalid-tool/execute')
        .send({
          parameters: {},
        })
        .expect(404);
    });

    it('should handle missing parameters', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({})
        .expect(400);
    });

    it('should handle invalid JSON', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle validation failure gracefully', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interaction-checker/execute')
        .send({
          parameters: { medications: [] },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.result.errors).toBeDefined();
        });
    });
  });

  describe('Content negotiation', () => {
    it('should return JSON response', () => {
      return request(app.getHttpServer()).get('/tools').expect('Content-Type', /json/).expect(200);
    });

    it('should accept JSON content type', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .set('Content-Type', 'application/json')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200);
    });
  });

  describe('HTTP status codes', () => {
    it('GET /tools should return 200', () => {
      return request(app.getHttpServer()).get('/tools').expect(200);
    });

    it('GET /tools/:id for valid tool should return 200', () => {
      return request(app.getHttpServer()).get('/tools/sofa-calculator').expect(200);
    });

    it('GET /tools/:id for invalid tool should return 404', () => {
      return request(app.getHttpServer()).get('/tools/invalid-tool').expect(404);
    });

    it('POST /tools/:id/execute should return 200', () => {
      return request(app.getHttpServer())
        .post('/tools/sofa-calculator/execute')
        .send({
          parameters: { pao2: 200, fio2: 1.0 },
        })
        .expect(200);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent tool executions', async () => {
      const promises = [
        request(app.getHttpServer())
          .post('/tools/sofa-calculator/execute')
          .send({ parameters: { pao2: 200, fio2: 1.0 } }),
        request(app.getHttpServer())
          .post('/tools/drug-interaction-checker/execute')
          .send({ parameters: { medications: ['aspirin'] } }),
        request(app.getHttpServer())
          .post('/tools/lab-interpreter/execute')
          .send({
            parameters: {
              labValues: [{ name: 'WBC', value: 7.0 }],
            },
          }),
      ];

      const results = await Promise.all(promises);

      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
