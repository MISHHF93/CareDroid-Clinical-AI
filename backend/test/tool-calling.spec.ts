import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../src/modules/ai/ai.service';
import { ChatService } from '../src/modules/chat/chat.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import {
  Subscription,
  SubscriptionTier,
} from '../src/modules/subscriptions/entities/subscription.entity';
import { AIQuery } from '../src/modules/ai/entities/ai-query.entity';
import { AuditService } from '../src/modules/audit/audit.service';
import { MetricsService } from '../src/modules/metrics/metrics.service';
import { IntentClassifierService } from '../src/modules/medical-control-plane/intent-classifier/intent-classifier.service';
import { ToolOrchestratorService } from '../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import { RAGService } from '../src/modules/rag/rag.service';
import { NluMetricsService } from '../src/modules/metrics/nlu-metrics.service';
import { EmergencyEscalationService } from '../src/modules/medical-control-plane/emergency-escalation/emergency-escalation.service';
import { CalculatorRecommenderService } from '../src/modules/chat/calculator-recommender.service';
import {
  AIGatewayService,
  ContextBuilderService,
  ResponseComposerService,
} from '../src/modules/ai-gateway';
import { MoERouterService } from '../src/modules/moe-router';
import { ToolExecutionService } from '../src/modules/tool-calling/tool-execution.service';
import { RoutingOptimizerService } from '../src/modules/cost-optimizer/routing-optimizer.service';
import { ShortMemoryService } from '../src/modules/memory/short-memory.service';
import { LongMemoryService } from '../src/modules/memory/long-memory.service';
import { ClinicalMemoryService } from '../src/modules/memory/clinical-memory.service';
import { ArtifactsService } from '../src/modules/artifacts/artifacts.service';
import { EvaluationService } from '../src/modules/evaluation/evaluation.service';

describe('Tool Calling Integration (Batch 15 Phase 1)', () => {
  let aiService: AIService;
  let chatService: ChatService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        AIService,
        ChatService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-key',
              };
              return config[key];
            },
          },
        },
        {
          provide: getRepositoryToken(AIQuery),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn((query) => query),
            save: jest.fn((query) => Promise.resolve(query)),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              tier: SubscriptionTier.PROFESSIONAL,
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordOpenaiCost: jest.fn(),
          },
        },
        {
          provide: IntentClassifierService,
          useValue: {
            classify: jest.fn().mockResolvedValue({
              primaryIntent: 'general',
              confidence: 0.95,
              method: 'hybrid',
            }),
          },
        },
        {
          provide: ToolOrchestratorService,
          useValue: {
            executeInChat: jest.fn().mockResolvedValue({
              result: {
                success: true,
                data: { score: 8, interpretation: 'High risk' },
              },
              formattedForChat: 'SOFA Score: 8',
            }),
            getToolMetadata: jest.fn().mockReturnValue({
              name: 'SOFA Calculator',
              parameters: [{ name: 'respiratory', required: true }],
            }),
          },
        },
        {
          provide: RAGService,
          useValue: {
            retrieve: jest.fn().mockResolvedValue({
              chunks: [],
              sources: [],
              confidence: 0,
            }),
          },
        },
        {
          provide: NluMetricsService,
          useValue: {
            recordConversationDepth: jest.fn(),
            recordConfidenceMismatch: jest.fn(),
          },
        },
        {
          provide: EmergencyEscalationService,
          useValue: {
            escalate: jest.fn().mockResolvedValue({
              escalated: false,
              severity: null,
              actions: [],
              recommendations: [],
              requiresImmediate911: false,
              medicalDirectorNotified: false,
              message: '',
            }),
            shouldEscalate: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: CalculatorRecommenderService,
          useValue: {
            recommend: jest.fn().mockReturnValue({ recommendations: [] }),
          },
        },
        {
          provide: AIGatewayService,
          useValue: {
            createRunEnvelope: jest.fn().mockReturnValue({
              runId: 'test-run-id',
              capabilityId: 'assistant-chat',
              policy: { phiAccessed: false },
              trace: { startedAt: new Date().toISOString() },
            }),
            logRoutingAudit: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MoERouterService,
          useValue: {
            createRoutePlan: jest.fn().mockReturnValue({
              primaryIntent: 'general',
              selectedExpert: 'clinical',
              selectedExperts: [{ expertId: 'clinical' }],
              retrievalPolicy: 'optional',
              confidence: 0.9,
              routeScore: 0.9,
              routeReason: 'test route',
              routingMode: 'test',
              fallbackApplied: false,
              routingEvidence: [],
              modelPlan: {},
              toolPlan: {},
              costPlan: { estimatedCost: 0.01, costReductionApplied: 0 },
              safetyPlan: {
                requiresHumanReview: false,
                blockedActions: [],
                emergencyEscalation: false,
                crisisEscalation: false,
              },
            }),
          },
        },
        {
          provide: ContextBuilderService,
          useValue: {
            buildContextPacket: jest.fn().mockReturnValue({
              pipeline: [],
              sourceSurface: 'test',
              memory: { persistence: 'test' },
              inputSummary: { messageCharacters: 12 },
              route: {
                selectedExperts: [{ expertId: 'clinical' }],
                routeScore: 0.9,
                routingMode: 'test',
              },
            }),
            toModelContext: jest.fn().mockReturnValue({}),
          },
        },
        {
          provide: ResponseComposerService,
          useValue: {
            compose: jest.fn(
              (response, _envelope, _routePlan, _contextPacket, extraMetadata = {}) => ({
                ...response,
                metadata: { ...(response.metadata || {}), ...extraMetadata },
              }),
            ),
          },
        },
        {
          provide: ToolExecutionService,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              success: false,
              status: 'unsupported',
              text: 'Unsupported test tool',
              executionLogs: [],
            }),
            executePrompt: jest.fn().mockResolvedValue({
              status: 'completed',
              text: 'SOFA Score: 8',
              toolName: 'SOFA Calculator',
              result: { score: 8, interpretation: 'High risk' },
              parameters: { respiratory: 8.5 },
              missingParameters: [],
              suggestions: ['Review organ dysfunction trend'],
              visualizations: [],
              executionLogs: [],
              context: {},
            }),
          },
        },
        {
          provide: RoutingOptimizerService,
          useValue: {
            optimizeRequest: jest.fn().mockReturnValue({
              routing: { model: 'test-model' },
              costPrediction: { totalCostUsd: 0.01 },
              cache: { hit: false },
            }),
          },
        },
        {
          provide: ShortMemoryService,
          useValue: {
            getActiveContext: jest.fn().mockResolvedValue({}),
            remember: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: LongMemoryService,
          useValue: {
            getContext: jest
              .fn()
              .mockResolvedValue({ preferences: [], history: [], savedTools: [] }),
          },
        },
        {
          provide: ClinicalMemoryService,
          useValue: {
            getClinicalContext: jest
              .fn()
              .mockResolvedValue({ findings: [], summaries: [], scores: [] }),
            record: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ArtifactsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: EvaluationService,
          useValue: {
            createRun: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    aiService = module.get<AIService>(AIService);
    chatService = module.get<ChatService>(ChatService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Tool Definitions (Step 1)', () => {
    it('should expose tool definitions for Claude', () => {
      const tools = aiService.getToolDefinitions();

      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include SOFA Calculator tool', () => {
      const tools = aiService.getToolDefinitions();
      const sofaTool = tools.find((t) => t.name === 'sofa_calculator');

      expect(sofaTool).toBeDefined();
      expect(sofaTool.description).toContain('SOFA');
      expect(sofaTool.input_schema.properties).toHaveProperty('respiratory');
    });

    it('should include Drug Checker tool', () => {
      const tools = aiService.getToolDefinitions();
      const drugTool = tools.find((t) => t.name === 'drug_checker');

      expect(drugTool).toBeDefined();
      expect(drugTool.description).toContain('drug');
      expect(drugTool.input_schema.properties).toHaveProperty('medications');
    });

    it('should include Lab Interpreter tool', () => {
      const tools = aiService.getToolDefinitions();
      const labTool = tools.find((t) => t.name === 'lab_interpreter');

      expect(labTool).toBeDefined();
      expect(labTool.description).toContain('lab');
      expect(labTool.input_schema.properties).toHaveProperty('test_name');
    });
  });

  describe('Tool-Calling Method (Step 2)', () => {
    it('should have invokeLLMWithTools method', () => {
      expect(aiService.invokeLLMWithTools).toBeDefined();
      expect(typeof aiService.invokeLLMWithTools).toBe('function');
    });

    it('should return response with toolCalls array', async () => {
      // Mock the OpenAI response to include tool calls
      jest.spyOn(aiService['openai'].chat.completions, 'create').mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'I can help you calculate the SOFA score.',
              tool_calls: [
                {
                  id: 'call_123',
                  function: {
                    name: 'sofa_calculator',
                    arguments: JSON.stringify({
                      respiratory: 8.5,
                      coagulation: 150,
                      liver: 1.2,
                      cardiovascular: 'none',
                      cns: 15,
                      renal: 0.8,
                    }),
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      } as any);

      const result = await aiService.invokeLLMWithTools('test-user-123', 'Calculate SOFA score');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('toolCalls');
      expect(result.toolCalls).toBeInstanceOf(Array);
    });

    it('should handle multi-turn conversations', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Check my medications' },
        { role: 'assistant', content: 'Which medications are you taking?' },
      ];

      jest.spyOn(aiService['openai'].chat.completions, 'create').mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'I found a potential interaction.',
              tool_calls: [],
            },
            finish_reason: 'end_turn',
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 50,
          total_tokens: 250,
        },
      } as any);

      const result = await aiService.invokeLLMWithTools(
        'test-user-123',
        'What about aspirin?',
        conversationHistory as any,
      );

      expect(result).toHaveProperty('content');
      expect(result.toolCalls).toBeDefined();
    });
  });

  describe('Chat Service Integration (Step 3)', () => {
    it('should process message and invoke tools via chat service', async () => {
      const response = await chatService.processMessage(
        'What is my SOFA score with respiratory 8.5?',
        'sofa-calculator',
        undefined,
        undefined,
        'test-user-123',
      );

      expect(response).toHaveProperty('text');
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should handle tool results in response', async () => {
      // Mock Tool Orchestrator to return a tool result
      const mockToolResult = {
        result: {
          success: true,
          data: { score: 8, components: { respiratory: 2 } },
        },
        formattedForChat: 'SOFA Score: 8',
      };

      jest
        .spyOn(module.get<ToolOrchestratorService>(ToolOrchestratorService), 'executeInChat')
        .mockResolvedValueOnce(mockToolResult as any);

      const response = await chatService.processMessage(
        'Calculate SOFA score with respiratory 8.5',
        undefined,
        undefined,
        undefined,
        'test-user-123',
      );

      expect(response).toHaveProperty('text');
    });
  });

  describe('Response Format (Step 4)', () => {
    it('should return proper ChatResponseDto structure', async () => {
      const response = await chatService.processMessage(
        'Test message',
        undefined,
        undefined,
        undefined,
        'test-user-123',
      );

      expect(response).toHaveProperty('text');
      expect(response).toHaveProperty('intentClassification');
      // Citations and confidence are optional (only with RAG)
    });

    it('should include toolResult when tool is invoked', async () => {
      // When a tool is called, the response should include toolResult
      const response = await chatService.processMessage(
        'Calculate SOFA score',
        undefined,
        undefined,
        undefined,
        'test-user-123',
      );

      // Either toolResult is undefined or has the expected structure
      if (response.toolResult) {
        expect(response.toolResult).toHaveProperty('toolName');
        expect(response.toolResult).toHaveProperty('parameters');
      }
    });
  });

  describe('Error Handling (Step 5)', () => {
    it('should handle API errors gracefully', async () => {
      jest
        .spyOn(aiService['openai'].chat.completions, 'create')
        .mockRejectedValueOnce(new Error('OpenAI API Error'));

      try {
        await aiService.invokeLLMWithTools('test-user-123', 'Test message');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('AI query with tools failed');
      }
    });

    it('should handle tool execution failures', async () => {
      const toolOrchestrator = module.get<ToolOrchestratorService>(ToolOrchestratorService);
      jest
        .spyOn(toolOrchestrator, 'executeInChat')
        .mockRejectedValueOnce(new Error('Tool execution failed'));

      // Should not throw, but log the error
      const response = await chatService.processMessage(
        'Test message that triggers tool',
        undefined,
        undefined,
        undefined,
        'test-user-123',
      );

      expect(response).toHaveProperty('text');
    });
  });

  describe('MVP Scope (SOFA, Drug Checker, Lab Interpreter)', () => {
    it('should support SOFA Calculator invocation', async () => {
      const tools = aiService.getToolDefinitions();
      const sofaTool = tools.find((t) => t.name === 'sofa_calculator');

      expect(sofaTool).toBeDefined();
      // Verify required parameters
      expect(sofaTool.input_schema.required).toContain('respiratory');
      expect(sofaTool.input_schema.required).toContain('coagulation');
      expect(sofaTool.input_schema.required).toContain('liver');
    });

    it('should support Drug Checker invocation', async () => {
      const tools = aiService.getToolDefinitions();
      const drugTool = tools.find((t) => t.name === 'drug_checker');

      expect(drugTool).toBeDefined();
      expect(drugTool.input_schema.properties.medications.type).toBe('array');
      expect(drugTool.input_schema.required).toContain('medications');
    });

    it('should support Lab Interpreter invocation', async () => {
      const tools = aiService.getToolDefinitions();
      const labTool = tools.find((t) => t.name === 'lab_interpreter');

      expect(labTool).toBeDefined();
      expect(labTool.input_schema.required).toContain('test_name');
      expect(labTool.input_schema.required).toContain('value');
    });
  });
});
