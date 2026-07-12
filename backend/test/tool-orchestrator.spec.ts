/**
 * Tool Orchestrator Service Unit Tests
 *
 * Tests for the main orchestrator service
 * Covers tool registry, execution, validation, formatting
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { AuditService } from '../src/modules/audit/audit.service';
import { AIService } from '../src/modules/ai/ai.service';
import { ToolMetricsService } from '../src/modules/metrics/tool-metrics.service';
import { ToolResult } from '../src/modules/medical-control-plane/tool-orchestrator/entities/tool-result.entity';
import {
  REGISTRY_ID_TO_EXECUTOR_TOOL_ID,
  REGISTERED_EXECUTOR_TOOL_IDS,
  ToolExecutionErrorCode,
} from '../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry';
import { NotFoundException } from '@nestjs/common';

describe('ToolOrchestratorService', () => {
  let service: ToolOrchestratorService;
  let mockAuditService: any;
  let mockAiService: any;
  let _sofaService: SofaCalculatorService;
  let _drugService: DrugCheckerService;
  let _labService: LabInterpreterService;

  beforeEach(async () => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    mockAiService = {
      generateStructuredJSON: jest.fn().mockResolvedValue({
        interactions: [],
        summary: 'No interactions',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
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
          useValue: {
            calculateParameterComplexity: jest.fn().mockReturnValue({ category: 'low', score: 1 }),
            setToolParameterComplexity: jest.fn(),
            recordToolError: jest.fn(),
            categorizeError: jest.fn().mockReturnValue('unknown'),
            recordToolExecutionTier: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ToolResult),
          useValue: {
            create: jest.fn((entity) => entity),
            save: jest.fn().mockResolvedValue({ id: 'test-result-id' }),
          },
        },
      ],
    }).compile();

    service = module.get<ToolOrchestratorService>(ToolOrchestratorService);
    _sofaService = module.get<SofaCalculatorService>(SofaCalculatorService);
    _drugService = module.get<DrugCheckerService>(DrugCheckerService);
    _labService = module.get<LabInterpreterService>(LabInterpreterService);
  });

  describe('Tool Registry', () => {
    it('should register all thirty-seven tools on initialization', () => {
      const tools = service.listAvailableTools();
      expect(tools.count).toBe(37);
      expect(tools.tools.length).toBe(37);
    });

    it('should have SOFA calculator in registry', () => {
      const tools = service.listAvailableTools();
      const sofa = tools.tools.find((t) => t.id === 'sofa-calculator');
      expect(sofa).toBeDefined();
      expect(sofa?.name).toBe('SOFA Score Calculator');
    });

    it('should have drug checker in registry', () => {
      const tools = service.listAvailableTools();
      const drug = tools.tools.find((t) => t.id === 'drug-interactions');
      expect(drug).toBeDefined();
      expect(drug?.name).toBe('Drug Interaction Checker');
    });

    it('should have lab interpreter in registry', () => {
      const tools = service.listAvailableTools();
      const lab = tools.tools.find((t) => t.id === 'lab-interpreter');
      expect(lab).toBeDefined();
      expect(lab?.name).toBe('Lab Results Interpreter');
    });

    it.each([
      'heart-score',
      'cha2ds2vasc-calculator',
      'wells-pe',
      'shock-index',
      'apache2-calculator',
      'anion-gap',
      'aa-gradient',
      'news2',
      'abcd2',
      'canadian-c-spine',
      'nexus-cspine',
      'gcs-calculator',
      'chads2',
      'duke-treadmill-score',
      'reynolds-risk-score',
      'has-bled',
      'timi-ua-nstemi',
      'framingham-risk',
      'grace-acs',
    ])('should have %s in registry', (toolId) => {
      const tools = service.listAvailableTools();
      expect(tools.tools.find((t) => t.id === toolId)).toBeDefined();
    });
  });

  describe('listAvailableTools', () => {
    it('should return tools with metadata', () => {
      const result = service.listAvailableTools();

      expect(result.tools[0]).toHaveProperty('id');
      expect(result.tools[0]).toHaveProperty('name');
      expect(result.tools[0]).toHaveProperty('description');
      expect(result.tools[0]).toHaveProperty('category');
      expect(result.tools[0]).toHaveProperty('parameters');
    });

    it('should include correct count', () => {
      const result = service.listAvailableTools();
      expect(result.count).toEqual(result.tools.length);
    });

    it('should include parameter schemas', () => {
      const result = service.listAvailableTools();

      result.tools.forEach((tool) => {
        expect(tool.parameters).toBeDefined();
        expect(Array.isArray(tool.parameters)).toBe(true);
      });
    });
  });

  describe('getToolMetadata', () => {
    it('should return metadata for valid tool ID', () => {
      const metadata = service.getToolMetadata('sofa-calculator');

      expect(metadata.id).toBe('sofa-calculator');
      expect(metadata.name).toBe('SOFA Score Calculator');
      expect(metadata.parameters).toBeDefined();
    });

    it('should include parameter schema', () => {
      const metadata = service.getToolMetadata('sofa-calculator');
      expect(metadata.parameters.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid tool ID', () => {
      expect(() => {
        service.getToolMetadata('invalid-tool');
      }).toThrow(NotFoundException);
    });

    it('should return parameters for each tool', () => {
      const tools = ['sofa-calculator', 'drug-interaction-checker', 'lab-interpreter'];

      tools.forEach((toolId) => {
        const metadata = service.getToolMetadata(toolId);
        expect(metadata.parameters).toBeDefined();
        expect(metadata.parameters.length).toBeGreaterThan(0);
      });
    });
  });

  describe('chat registry hints', () => {
    it('should map sofa-score UI hint to sofa-calculator executor', () => {
      expect(() => service.getToolMetadata('sofa-score')).not.toThrow();
      expect(service.getToolMetadata('sofa-score').id).toBe('sofa-calculator');
    });
  });

  describe('validateToolExecution', () => {
    it('should validate tool parameters', async () => {
      const result = await service.validateToolExecution({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.valid).toBe(true);
    });

    it('should return validation errors for invalid parameters', async () => {
      const result = await service.validateToolExecution({
        toolId: 'drug-interaction-checker',
        parameters: { medications: [] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent tool', async () => {
      const result = await service.validateToolExecution({
        toolId: 'invalid-tool',
        parameters: {},
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('executeTool', () => {
    it('should execute SOFA calculator successfully', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('sofa-calculator');
      expect(result.result.success).toBe(true);
    });

    it('should normalize snake_case SOFA parameters from NLU before execution', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-score',
        parameters: { pao2: 90, fio2: 0.3, urine_output: 450 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('sofa-calculator');
      expect(result.result.data.renalScore).toBeGreaterThan(0);
    });

    it('should execute drug checker successfully (canonical id)', async () => {
      const result = await service.executeTool({
        toolId: 'drug-interactions',
        parameters: { medications: ['warfarin', 'aspirin'] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('drug-interactions');
    });

    it('should resolve drug-interaction-checker alias to drug-interactions', async () => {
      const result = await service.executeTool({
        toolId: 'drug-interaction-checker',
        parameters: { medications: ['warfarin', 'aspirin'] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('drug-interactions');
      expect(result.requestedToolId).toBe('drug-interaction-checker');
    });

    it('should execute lab interpreter successfully', async () => {
      const result = await service.executeTool({
        toolId: 'lab-interpreter',
        parameters: { labValues: [{ name: 'WBC', value: 7.0 }] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('lab-interpreter');
    });

    it('should include execution time', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.executionTimeMs).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should log successful execution to audit trail', async () => {
      await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should handle validation failures', async () => {
      const result = await service.executeTool({
        toolId: 'drug-interaction-checker',
        parameters: { medications: [] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.result.errors).toBeDefined();
    });

    it('should return tool name in response', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.toolName).toBe('SOFA Score Calculator');
    });

    it('should return TOOL_NOT_FOUND for invalid tool', async () => {
      const result = await service.executeTool({
        toolId: 'invalid-tool',
        parameters: {},
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ToolExecutionErrorCode.TOOL_NOT_FOUND);
    });

    it('should return UNSUPPORTED_TOOL for dispatch-ai without executing', async () => {
      const result = await service.executeTool({
        toolId: 'dispatch-ai',
        parameters: { message: 'route a unit' },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ToolExecutionErrorCode.UNSUPPORTED_TOOL);
    });

    it('should return VALIDATION_FAILED with errorCode', async () => {
      const result = await service.executeTool({
        toolId: 'drug-interactions',
        parameters: { medications: [] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ToolExecutionErrorCode.VALIDATION_FAILED);
    });

    it('should return INVALID_REQUEST when parameters is not an object', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: null as unknown as Record<string, unknown>,
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ToolExecutionErrorCode.INVALID_REQUEST);
    });

    it('should return contract VALIDATION_FAILED before tool execute for missing medications', async () => {
      const result = await service.executeTool({
        toolId: 'drug-interactions',
        parameters: {},
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ToolExecutionErrorCode.VALIDATION_FAILED);
      expect(result.result.errors?.some((e) => e.includes('medications'))).toBe(true);
    });
  });

  describe('getExecutorCatalog', () => {
    it('should expose registered executors and unsupported docs', () => {
      const catalog = service.getExecutorCatalog();
      expect(catalog.registeredExecutorToolIds).toEqual([...REGISTERED_EXECUTOR_TOOL_IDS]);
      expect(catalog.unsupportedTools.some((t) => t.nluToolId === 'dispatch-ai')).toBe(true);
      expect(catalog.contracts['sofa-calculator'].deterministic).toBe(true);
    });
  });

  describe('executeInChat', () => {
    it('should execute tool and format for chat', async () => {
      const result = await service.executeInChat(
        'sofa-calculator',
        { pao2: 200, fio2: 1.0 },
        'test-user',
        'test-conv',
      );

      expect(result.type).toBe('tool_result');
      expect(result.toolId).toBe('sofa-calculator');
      expect(result.formattedForChat).toBeDefined();
      expect(result.formattedForChat.length).toBeGreaterThan(0);
    });

    it('should format SOFA results for chat', async () => {
      const result = await service.executeInChat(
        'sofa-calculator',
        { pao2: 200, fio2: 1.0 },
        'test-user',
        'test-conv',
      );

      expect(result.formattedForChat).toContain('SOFA');
    });

    it('should format drug results for chat', async () => {
      const result = await service.executeInChat(
        'drug-interaction-checker',
        { medications: ['warfarin', 'aspirin'] },
        'test-user',
        'test-conv',
      );

      expect(result.formattedForChat).toBeDefined();
    });

    it('should include tool result object', async () => {
      const result = await service.executeInChat(
        'sofa-calculator',
        { pao2: 200, fio2: 1.0 },
        'test-user',
        'test-conv',
      );

      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
    });
  });

  describe('Result formatting', () => {
    it('should format SOFA results with total score', async () => {
      const result = await service.executeInChat(
        'sofa-calculator',
        { pao2: 200, fio2: 1.0, platelets: 100 },
        'test-user',
        'test-conv',
      );

      expect(result.formattedForChat).toContain('SOFA Score');
    });

    it('should format drug checker results with severity', async () => {
      const result = await service.executeInChat(
        'drug-interaction-checker',
        { medications: ['warfarin', 'aspirin'] },
        'test-user',
        'test-conv',
      );

      expect(result.formattedForChat).toBeDefined();
    });

    it('should format error results appropriately', async () => {
      const result = await service.executeInChat(
        'drug-interaction-checker',
        { medications: [] },
        'test-user',
        'test-conv',
      );

      expect(result.formattedForChat).toContain('❌');
    });

    it('should include execution timestamp in formatted result', async () => {
      const result = await service.executeInChat(
        'sofa-calculator',
        { pao2: 200, fio2: 1.0 },
        'test-user',
        'test-conv',
      );

      expect(result.formattedForChat).toContain('Executed in');
    });
  });

  describe('getToolStatistics', () => {
    it('should return tool statistics', () => {
      const stats = service.getToolStatistics();

      expect(stats.totalTools).toBe(37);
      expect(stats.toolsByCategory).toBeDefined();
      expect(stats.tools).toBeDefined();
    });

    it('should categorize tools by type', () => {
      const stats = service.getToolStatistics();

      expect(stats.toolsByCategory['calculator']).toBeGreaterThan(0);
      expect(stats.toolsByCategory['checker']).toBeGreaterThan(0);
      expect(stats.toolsByCategory['interpreter']).toBeGreaterThan(0);
    });

    it('should include all tools in statistics', () => {
      const stats = service.getToolStatistics();

      const toolIds = stats.tools.map((t) => t.id);
      expect(toolIds.sort()).toEqual([...REGISTERED_EXECUTOR_TOOL_IDS].sort());
    });
  });

  describe('Frontend registry contract parity', () => {
    it('REGISTRY_ID_TO_EXECUTOR_TOOL_ID matches frontend REGISTRY_ID_TO_ORCHESTRATOR_TOOL', () => {
      expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID).toEqual({
        'drug-check': 'drug-interactions',
        'lab-interp': 'lab-interpreter',
        'sofa-score': 'sofa-calculator',
      });
    });
  });

  describe('Error handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 'invalid', fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(false);
      expect(result.result.errors).toBeDefined();
    });

    it('should log errors to audit trail', async () => {
      await service.executeTool({
        toolId: 'invalid-tool',
        parameters: {},
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should provide user-friendly error messages', async () => {
      const result = await service.executeInChat('invalid-tool', {}, 'test-user', 'test-conv');

      expect(result.formattedForChat).toContain('Error');
    });
  });

  describe('Audit logging', () => {
    it('should log successful tool execution', async () => {
      await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          resource: expect.stringContaining('sofa-calculator'),
        }),
      );
    });

    it('should log failed validation', async () => {
      await service.executeTool({
        toolId: 'drug-interaction-checker',
        parameters: { medications: [] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should include execution time in audit log', async () => {
      await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'success',
          }),
        }),
      );
    });
  });

  describe('Response structure', () => {
    it('ToolExecutionResponseDto should have required fields', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('toolId');
      expect(result).toHaveProperty('toolName');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('executionTimeMs');
    });

    it('Result should have ToolExecutionResult structure', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      const toolResult = result.result;
      expect(toolResult).toHaveProperty('success');
      expect(toolResult).toHaveProperty('data');
      expect(toolResult).toHaveProperty('timestamp');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle sequential tool executions', async () => {
      const sofaResult = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: { pao2: 200, fio2: 1.0 },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      const drugResult = await service.executeTool({
        toolId: 'drug-interactions',
        parameters: { medications: ['aspirin', 'clopidogrel'] },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(sofaResult.success).toBe(true);
      expect(drugResult.success).toBe(true);
    });

    it('should handle tool execution with full parameters', async () => {
      const result = await service.executeTool({
        toolId: 'sofa-calculator',
        parameters: {
          pao2: 100,
          fio2: 1.0,
          mechanicalVentilation: true,
          platelets: 50,
          bilirubin: 5.0,
          map: 60,
          dopamine: 10,
          gcs: 10,
          creatinine: 2.0,
        },
        userId: 'test-user',
        conversationId: 'test-conv',
      });

      expect(result.success).toBe(true);
      expect(result.result.data.totalScore).toBeGreaterThan(0);
    });
  });
});
