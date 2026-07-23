/**
 * Tool Orchestrator API Integration Tests
 *
 * E2E tests for REST API endpoints
 * Tests tool execution via HTTP, parameter validation, response structure
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ToolOrchestratorController } from '../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller';
import { ToolOrchestratorService } from '../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import { SofaCalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service';
import { DrugCheckerService } from '../src/modules/medical-control-plane/tool-orchestrator/services/drug-checker.service';
import { LabInterpreterService } from '../src/modules/medical-control-plane/tool-orchestrator/services/lab-interpreter.service';
import { HeartScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/heart-score.service';
import { Cha2ds2VascCalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/cha2ds2vasc-calculator.service';
import { WellsPeService } from '../src/modules/medical-control-plane/tool-orchestrator/services/wells-pe.service';
import { ShockIndexService } from '../src/modules/medical-control-plane/tool-orchestrator/services/shock-index.service';
import { Apache2CalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/apache2-calculator.service';
import { AnionGapService } from '../src/modules/medical-control-plane/tool-orchestrator/services/anion-gap.service';
import { AaGradientService } from '../src/modules/medical-control-plane/tool-orchestrator/services/aa-gradient.service';
import { News2Service } from '../src/modules/medical-control-plane/tool-orchestrator/services/news2.service';
import { Abcd2Service } from '../src/modules/medical-control-plane/tool-orchestrator/services/abcd2.service';
import { CanadianCSpineService } from '../src/modules/medical-control-plane/tool-orchestrator/services/canadian-c-spine.service';
import { NexusCSpineService } from '../src/modules/medical-control-plane/tool-orchestrator/services/nexus-cspine.service';
import { GcsCalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/gcs-calculator.service';
import { Chads2Service } from '../src/modules/medical-control-plane/tool-orchestrator/services/chads2.service';
import { DukeTreadmillScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/duke-treadmill-score.service';
import { ReynoldsRiskScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/reynolds-risk-score.service';
import { HasBledService } from '../src/modules/medical-control-plane/tool-orchestrator/services/has-bled.service';
import { TimiUaNstemiService } from '../src/modules/medical-control-plane/tool-orchestrator/services/timi-ua-nstemi.service';
import { FraminghamRiskService } from '../src/modules/medical-control-plane/tool-orchestrator/services/framingham-risk.service';
import { GraceAcsService } from '../src/modules/medical-control-plane/tool-orchestrator/services/grace-acs.service';
import { CorrectedCalciumService } from '../src/modules/medical-control-plane/tool-orchestrator/services/corrected-calcium.service';
import { CorrectedSodiumService } from '../src/modules/medical-control-plane/tool-orchestrator/services/corrected-sodium.service';
import { FenaService } from '../src/modules/medical-control-plane/tool-orchestrator/services/fena.service';
import { FeureaService } from '../src/modules/medical-control-plane/tool-orchestrator/services/feurea.service';
import { OsmolalGapService } from '../src/modules/medical-control-plane/tool-orchestrator/services/osmolal-gap.service';
import { SerumOsmolalityService } from '../src/modules/medical-control-plane/tool-orchestrator/services/serum-osmolality.service';
import { Pao2Fio2RatioService } from '../src/modules/medical-control-plane/tool-orchestrator/services/pao2-fio2-ratio.service';
import { RoxIndexService } from '../src/modules/medical-control-plane/tool-orchestrator/services/rox-index.service';
import { MewsService } from '../src/modules/medical-control-plane/tool-orchestrator/services/mews.service';
import { RevisedTraumaScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/revised-trauma-score.service';
import { HuntHessScaleService } from '../src/modules/medical-control-plane/tool-orchestrator/services/hunt-hess-scale.service';
import { IchScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/ich-score.service';
import { FourScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/four-score.service';
import { ModifiedRankinScaleService } from '../src/modules/medical-control-plane/tool-orchestrator/services/modified-rankin-scale.service';
import { PecarnHeadService } from '../src/modules/medical-control-plane/tool-orchestrator/services/pecarn-head.service';
import { WellsDvtService } from '../src/modules/medical-control-plane/tool-orchestrator/services/wells-dvt.service';
import { AbgInterpreterService } from '../src/modules/medical-control-plane/tool-orchestrator/services/abg-interpreter.service';
import { ToolResult } from '../src/modules/medical-control-plane/tool-orchestrator/entities/tool-result.entity';
import { ToolMetricsService } from '../src/modules/metrics/tool-metrics.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AIService } from '../src/modules/ai/ai.service';

describe('Tool Orchestrator API (e2e)', () => {
  let app: INestApplication;
  let mockAuditService: any;
  let mockAiService: any;
  let mockToolMetricsService: any;
  let mockToolResultRepository: any;

  beforeAll(async () => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    mockAiService = {
      generateStructuredJSON: jest.fn().mockResolvedValue({}),
    };
    mockToolMetricsService = {
      calculateParameterComplexity: jest.fn().mockReturnValue({ score: 10, category: 'simple' }),
      setToolParameterComplexity: jest.fn(),
      recordToolError: jest.fn(),
      recordToolExecutionTier: jest.fn(),
      categorizeError: jest.fn().mockReturnValue('internal_error'),
    };
    mockToolResultRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'tool-result-1', ...data })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ToolOrchestratorController],
      providers: [
        ToolOrchestratorService,
        SofaCalculatorService,
        DrugCheckerService,
        LabInterpreterService,
        HeartScoreService,
        Cha2ds2VascCalculatorService,
        WellsPeService,
        ShockIndexService,
        Apache2CalculatorService,
        AnionGapService,
        AaGradientService,
        News2Service,
        Abcd2Service,
        CanadianCSpineService,
        NexusCSpineService,
        GcsCalculatorService,
        Chads2Service,
        DukeTreadmillScoreService,
        ReynoldsRiskScoreService,
        HasBledService,
        TimiUaNstemiService,
        FraminghamRiskService,
        GraceAcsService,
        CorrectedCalciumService,
        CorrectedSodiumService,
        FenaService,
        FeureaService,
        OsmolalGapService,
        SerumOsmolalityService,
        Pao2Fio2RatioService,
        RoxIndexService,
        MewsService,
        RevisedTraumaScoreService,
        HuntHessScaleService,
        IchScoreService,
        FourScoreService,
        ModifiedRankinScaleService,
        PecarnHeadService,
        WellsDvtService,
        AbgInterpreterService,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: AIService,
          useValue: mockAiService,
        },
        {
          provide: ToolMetricsService,
          useValue: mockToolMetricsService,
        },
        {
          provide: getRepositoryToken(ToolResult),
          useValue: mockToolResultRepository,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user-123', subscriptionTier: 'institutional' };
          return true;
        },
      })
      .compile();

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
          expect(res.body.count).toBe(39);
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
          const drug = res.body.tools.find((t) => t.id === 'drug-interactions');
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
          expect(res.body.totalTools).toBe(39);
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
          expect(res.body.toolId).toBe('drug-interactions');
          expect(res.body.requestedToolId).toBe('drug-interaction-checker');
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

    it('should handle an empty execute body without a controller exception', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interactions/execute')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.errorCode).toBe('VALIDATION_FAILED');
          expect(res.body.result.errors).toEqual(
            expect.arrayContaining([expect.stringContaining('medications')]),
          );
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
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.errorCode).toBe('TOOL_NOT_FOUND');
        });
    });

    it('should handle missing parameters', () => {
      return request(app.getHttpServer())
        .post('/tools/drug-interactions/execute')
        .send({})
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.result.errors).toBeDefined();
        });
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
