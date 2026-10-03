/**
 * CareDroid Model Gateway Service
 * Manages vendor-neutral model registry, dynamic task-based routing, fallback orchestration,
 * latency/cost tracking, and circuit breakers across cloud, private, and edge AI providers.
 */

import {
  ModelExecutionResult,
  ModelPrivacyTier,
  ModelRoutingDecision,
  ModelRoutingRequest,
  RegisteredModel,
} from './modelGatewayTypes';

export class ModelGatewayService {
  private static instance: ModelGatewayService;
  private models: Map<string, RegisteredModel> = new Map();
  private maxConsecutiveFailuresBeforeTrip = 3;

  constructor() {
    this.seedDefaultModels();
  }

  public static getInstance(): ModelGatewayService {
    if (!ModelGatewayService.instance) {
      ModelGatewayService.instance = new ModelGatewayService();
    }
    return ModelGatewayService.instance;
  }

  /**
   * Register or update an AI model in the gateway.
   */
  public registerModel(model: RegisteredModel): void {
    this.models.set(model.id, { ...model });
  }

  /**
   * Retrieve all registered models.
   */
  public listModels(): RegisteredModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get a registered model by its ID.
   */
  public getModel(id: string): RegisteredModel | undefined {
    return this.models.get(id);
  }

  /**
   * Determine the optimal model and fallback chain for a given healthcare task.
   */
  public routeModel(request: ModelRoutingRequest): ModelRoutingDecision {
    const candidateModels = Array.from(this.models.values()).filter((model) => {
      if (!model.isAvailable || model.circuitBreakerTripped) {
        return false;
      }
      if (!model.supportedTasks.includes(request.task)) {
        return false;
      }
      if (!request.allowCloudProviders && model.deploymentLocation.startsWith('cloud')) {
        return false;
      }
      if (!this.satisfiesPrivacyTier(model.privacyTier, request.requiredPrivacyTier)) {
        return false;
      }
      if (
        request.maxAcceptableLatencyMs &&
        model.benchmark.averageLatencyMs > request.maxAcceptableLatencyMs
      ) {
        return false;
      }
      return true;
    });

    if (candidateModels.length === 0) {
      const emergencyFallback = this.models.get('caredroid-fallback-simulator') || {
        id: 'caredroid-fallback-simulator',
        name: 'CareDroid Emergency Fallback Simulator',
        provider: 'simulated_fallback',
        version: '1.0.0',
        contextWindowTokens: 8192,
        maxOutputTokens: 2048,
        deploymentLocation: 'edge_server',
        privacyTier: 'airgapped_local',
        supportedTasks: [request.task],
        pricing: { inputPer1kTokensUsd: 0, outputPer1kTokensUsd: 0 },
        benchmark: {
          averageLatencyMs: 15,
          p95LatencyMs: 30,
          tokensPerSecond: 100,
          accuracyScorePercent: 92,
          clinicalSafetyScorePercent: 99.5,
          lastEvaluatedAt: new Date().toISOString(),
        },
        isAvailable: true,
        requiresClinicianReview: true,
        circuitBreakerTripped: false,
        consecutiveFailures: 0,
      };

      return {
        selectedModel: emergencyFallback,
        fallbackModels: [],
        estimatedLatencyMs: emergencyFallback.benchmark.averageLatencyMs,
        estimatedCostUsd: 0,
        routingReason:
          'No qualified primary models available; using local emergency fallback simulator.',
        decisionTimestamp: new Date().toISOString(),
      };
    }

    candidateModels.sort((a, b) => {
      if (request.preferredModelId) {
        if (a.id === request.preferredModelId) return -1;
        if (b.id === request.preferredModelId) return 1;
      }
      if (b.benchmark.clinicalSafetyScorePercent !== a.benchmark.clinicalSafetyScorePercent) {
        return b.benchmark.clinicalSafetyScorePercent - a.benchmark.clinicalSafetyScorePercent;
      }
      const costA = this.calculateEstimatedCost(a, request.promptTokensEstimate);
      const costB = this.calculateEstimatedCost(b, request.promptTokensEstimate);
      return costA - costB;
    });

    const selectedModel = candidateModels[0];
    const fallbackModels = candidateModels.slice(1, 3);
    const estimatedCostUsd = this.calculateEstimatedCost(
      selectedModel,
      request.promptTokensEstimate,
      request.maxResponseTokens || 512,
    );

    return {
      selectedModel,
      fallbackModels,
      estimatedLatencyMs: selectedModel.benchmark.averageLatencyMs,
      estimatedCostUsd,
      routingReason: `Selected ${selectedModel.name} (${selectedModel.provider}) based on privacy tier ${selectedModel.privacyTier} and clinical safety score ${selectedModel.benchmark.clinicalSafetyScorePercent}%.`,
      decisionTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute an AI task with automatic fallback on model failure.
   */
  public async executeWithFallback<T>(
    request: ModelRoutingRequest,
    executor: (
      model: RegisteredModel,
    ) => Promise<{ data: T; inputTokens: number; outputTokens: number }>,
  ): Promise<ModelExecutionResult<T>> {
    const decision = this.routeModel(request);
    const executionChain = [decision.selectedModel, ...decision.fallbackModels];
    let lastError: Error | null = null;
    let fallbackCount = 0;

    const startTime = Date.now();

    for (const model of executionChain) {
      try {
        const result = await executor(model);
        const latencyMs = Date.now() - startTime;
        const cost = this.calculateActualCost(model, result.inputTokens, result.outputTokens);

        this.recordSuccess(model.id);

        return {
          success: true,
          modelId: model.id,
          provider: model.provider,
          data: result.data,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalCostUsd: cost,
          executionLatencyMs: latencyMs,
          usedFallback: fallbackCount > 0,
          fallbackCount,
          safetyWarnings: model.requiresClinicianReview
            ? [
                'Clinical decision support output: Must be reviewed and confirmed by a licensed clinician.',
              ]
            : [],
          clinicianReviewRequired: model.requiresClinicianReview,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        fallbackCount++;
        this.recordFailure(model.id);
      }
    }

    const totalLatency = Date.now() - startTime;
    return {
      success: false,
      modelId: decision.selectedModel.id,
      provider: decision.selectedModel.provider,
      inputTokens: request.promptTokensEstimate,
      outputTokens: 0,
      totalCostUsd: 0,
      executionLatencyMs: totalLatency,
      usedFallback: fallbackCount > 1,
      fallbackCount,
      error: `All models in routing chain failed. Last error: ${lastError?.message || 'Unknown error'}`,
      safetyWarnings: ['Model execution failed completely. Revert to manual clinical protocol.'],
      clinicianReviewRequired: true,
    };
  }

  public recordSuccess(modelId: string): void {
    const model = this.models.get(modelId);
    if (model) {
      model.consecutiveFailures = 0;
      model.circuitBreakerTripped = false;
    }
  }

  public recordFailure(modelId: string): void {
    const model = this.models.get(modelId);
    if (model) {
      model.consecutiveFailures += 1;
      if (model.consecutiveFailures >= this.maxConsecutiveFailuresBeforeTrip) {
        model.circuitBreakerTripped = true;
      }
    }
  }

  public resetCircuitBreakers(): void {
    for (const model of this.models.values()) {
      model.circuitBreakerTripped = false;
      model.consecutiveFailures = 0;
    }
  }

  private calculateEstimatedCost(
    model: RegisteredModel,
    promptTokens: number,
    outputTokens = 256,
  ): number {
    const inCost = (promptTokens / 1000) * model.pricing.inputPer1kTokensUsd;
    const outCost = (outputTokens / 1000) * model.pricing.outputPer1kTokensUsd;
    return Math.round((inCost + outCost) * 10000) / 10000;
  }

  private calculateActualCost(
    model: RegisteredModel,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const inCost = (inputTokens / 1000) * model.pricing.inputPer1kTokensUsd;
    const outCost = (outputTokens / 1000) * model.pricing.outputPer1kTokensUsd;
    return Math.round((inCost + outCost) * 10000) / 10000;
  }

  private satisfiesPrivacyTier(
    modelTier: ModelPrivacyTier,
    requiredTier: ModelPrivacyTier,
  ): boolean {
    const hierarchy: Record<ModelPrivacyTier, number> = {
      airgapped_local: 4,
      phi_authorized: 3,
      deidentified_only: 2,
      synthetic_only: 1,
    };
    return (hierarchy[modelTier] || 0) >= (hierarchy[requiredTier] || 0);
  }

  private seedDefaultModels(): void {
    const defaultModels: RegisteredModel[] = [
      {
        id: 'claude-3-7-sonnet-clinical',
        name: 'Claude 3.7 Sonnet (Clinical Reasoner)',
        provider: 'anthropic',
        version: '20250219',
        contextWindowTokens: 200000,
        maxOutputTokens: 8192,
        deploymentLocation: 'cloud_dedicated',
        privacyTier: 'phi_authorized',
        supportedTasks: [
          'triage_recommendation',
          'critical_alert_assessment',
          'clinical_summary',
          'handoff_sbar',
          'operational_bottleneck',
          'general_reasoning',
        ],
        pricing: {
          inputPer1kTokensUsd: 0.003,
          outputPer1kTokensUsd: 0.015,
          cachedInputPer1kTokensUsd: 0.0003,
        },
        benchmark: {
          averageLatencyMs: 850,
          p95LatencyMs: 1400,
          tokensPerSecond: 85,
          accuracyScorePercent: 96.8,
          clinicalSafetyScorePercent: 99.2,
          lastEvaluatedAt: '2026-09-15T00:00:00Z',
        },
        isAvailable: true,
        requiresClinicianReview: true,
        circuitBreakerTripped: false,
        consecutiveFailures: 0,
      },
      {
        id: 'gemini-1-5-pro-multimodal',
        name: 'Gemini 1.5 Pro (Diagnostic & Document Extraction)',
        provider: 'google_gemini',
        version: '002',
        contextWindowTokens: 1000000,
        maxOutputTokens: 8192,
        deploymentLocation: 'cloud_dedicated',
        privacyTier: 'phi_authorized',
        supportedTasks: [
          'patient_intake_assist',
          'document_extraction',
          'radiology_preliminary',
          'clinical_summary',
          'general_reasoning',
        ],
        pricing: { inputPer1kTokensUsd: 0.00125, outputPer1kTokensUsd: 0.005 },
        benchmark: {
          averageLatencyMs: 720,
          p95LatencyMs: 1250,
          tokensPerSecond: 90,
          accuracyScorePercent: 95.4,
          clinicalSafetyScorePercent: 98.7,
          lastEvaluatedAt: '2026-09-15T00:00:00Z',
        },
        isAvailable: true,
        requiresClinicianReview: true,
        circuitBreakerTripped: false,
        consecutiveFailures: 0,
      },
      {
        id: 'hospital-local-medgemma-27b',
        name: 'CareDroid On-Prem MedGemma 27B (vLLM)',
        provider: 'local_vllm',
        version: 'v2.1',
        contextWindowTokens: 32768,
        maxOutputTokens: 4096,
        deploymentLocation: 'hospital_datacenter',
        privacyTier: 'airgapped_local',
        supportedTasks: [
          'triage_recommendation',
          'critical_alert_assessment',
          'medication_interaction',
          'handoff_sbar',
          'clinical_summary',
        ],
        pricing: { inputPer1kTokensUsd: 0.0001, outputPer1kTokensUsd: 0.0001 },
        benchmark: {
          averageLatencyMs: 380,
          p95LatencyMs: 650,
          tokensPerSecond: 110,
          accuracyScorePercent: 94.1,
          clinicalSafetyScorePercent: 99.4,
          lastEvaluatedAt: '2026-09-20T00:00:00Z',
        },
        isAvailable: true,
        requiresClinicianReview: true,
        circuitBreakerTripped: false,
        consecutiveFailures: 0,
      },
      {
        id: 'edge-cart-onnx-int4',
        name: 'CareDroid Mobile Cart Quantized INT4',
        provider: 'edge_onnx',
        version: '1.4',
        contextWindowTokens: 8192,
        maxOutputTokens: 1024,
        deploymentLocation: 'mobile_unit',
        privacyTier: 'airgapped_local',
        supportedTasks: [
          'triage_recommendation',
          'patient_intake_assist',
          'critical_alert_assessment',
        ],
        pricing: { inputPer1kTokensUsd: 0, outputPer1kTokensUsd: 0 },
        benchmark: {
          averageLatencyMs: 140,
          p95LatencyMs: 220,
          tokensPerSecond: 65,
          accuracyScorePercent: 91.5,
          clinicalSafetyScorePercent: 98.9,
          lastEvaluatedAt: '2026-09-25T00:00:00Z',
        },
        isAvailable: true,
        requiresClinicianReview: true,
        circuitBreakerTripped: false,
        consecutiveFailures: 0,
      },
    ];

    for (const m of defaultModels) {
      this.registerModel(m);
    }
  }
}

export const modelGateway = ModelGatewayService.getInstance();
