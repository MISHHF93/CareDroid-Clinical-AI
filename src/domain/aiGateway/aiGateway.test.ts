import { describe, expect, it } from 'vitest';
import { ModelGatewayService } from './modelGateway';
import { GovernedAgentRuntime } from './governedAgentRuntime';
import { ModelRoutingRequest } from './modelGatewayTypes';

describe('ModelGatewayService', () => {
  it('registers models and lists them correctly', () => {
    const gateway = new ModelGatewayService();
    const models = gateway.listModels();
    expect(models.length).toBeGreaterThanOrEqual(4);
    const claude = gateway.getModel('claude-3-7-sonnet-clinical');
    expect(claude).toBeDefined();
    expect(claude?.provider).toBe('anthropic');
  });

  it('routes to cloud dedicated model when cloud is allowed and task matches', () => {
    const gateway = new ModelGatewayService();
    const request: ModelRoutingRequest = {
      taskId: 'test-triage-1',
      task: 'triage_recommendation',
      promptTokensEstimate: 1200,
      requiredPrivacyTier: 'phi_authorized',
      allowCloudProviders: true,
    };
    const decision = gateway.routeModel(request);
    expect(decision.selectedModel).toBeDefined();
    expect(decision.selectedModel.supportedTasks).toContain('triage_recommendation');
    expect(decision.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    expect(decision.decisionTimestamp).toBeDefined();
  });

  it('routes strictly to local model when cloud providers are prohibited', () => {
    const gateway = new ModelGatewayService();
    const request: ModelRoutingRequest = {
      taskId: 'test-local-only',
      task: 'critical_alert_assessment',
      promptTokensEstimate: 800,
      requiredPrivacyTier: 'airgapped_local',
      allowCloudProviders: false,
    };
    const decision = gateway.routeModel(request);
    expect(decision.selectedModel.deploymentLocation).toMatch(/datacenter|server|unit/);
    expect(decision.selectedModel.provider).not.toBe('anthropic');
    expect(decision.selectedModel.provider).not.toBe('google_gemini');
  });

  it('trips circuit breaker after consecutive failures and routes to fallback', async () => {
    const gateway = new ModelGatewayService();
    const targetModelId = 'hospital-local-medgemma-27b';
    gateway.recordFailure(targetModelId);
    gateway.recordFailure(targetModelId);
    gateway.recordFailure(targetModelId);

    const model = gateway.getModel(targetModelId);
    expect(model?.circuitBreakerTripped).toBe(true);

    const request: ModelRoutingRequest = {
      taskId: 'circuit-test',
      task: 'critical_alert_assessment',
      promptTokensEstimate: 500,
      requiredPrivacyTier: 'airgapped_local',
      allowCloudProviders: false,
    };
    const decision = gateway.routeModel(request);
    expect(decision.selectedModel.id).not.toBe(targetModelId);
  });

  it('executes task with automatic fallback on model failure', async () => {
    const gateway = new ModelGatewayService();
    const request: ModelRoutingRequest = {
      taskId: 'failover-test',
      task: 'triage_recommendation',
      promptTokensEstimate: 300,
      requiredPrivacyTier: 'phi_authorized',
      allowCloudProviders: true,
    };

    let attempt = 0;
    const result = await gateway.executeWithFallback(request, async (_model) => {
      attempt++;
      if (attempt === 1) {
        throw new Error('Primary model timeout');
      }
      return {
        data: { acuity: 'ESI-2', condition: 'Severe asthma exacerbation' },
        inputTokens: 320,
        outputTokens: 85,
      };
    });

    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackCount).toBe(1);
    expect(result.data).toBeDefined();
    expect(result.clinicianReviewRequired).toBe(true);
  });
});

describe('GovernedAgentRuntime', () => {
  it('executes task within boundaries and mandates clinician review for clinical scope', async () => {
    const runtime = new GovernedAgentRuntime();
    const response = await runtime.executeAgentTask('triage-flow-assistant', {
      intent: 'triage_acuity_scoring',
      patientId: 'pt-10492',
      initiatorUserId: 'nurse-77',
      initiatorRole: 'triage_nurse',
      initiatorPermissions: ['emergency:triage:view'],
    });

    expect(response.status).toBe('pending_clinician_review');
    expect(response.requiresClinicianReview).toBe(true);
    expect(response.clinicianOverrideAvailable).toBe(true);
    expect(response.auditRecord).toBeDefined();
    expect(response.auditRecord.provenanceHash).toMatch(/^prov-/);
    expect(response.auditRecord.isClinicianConfirmed).toBe(false);
  });

  it('strictly blocks prohibited actions', async () => {
    const runtime = new GovernedAgentRuntime();
    await expect(
      runtime.executeAgentTask('triage-flow-assistant', {
        intent: 'discharge_patient',
        patientId: 'pt-10492',
        initiatorUserId: 'nurse-77',
        initiatorRole: 'triage_nurse',
        initiatorPermissions: ['emergency:triage:view'],
      }),
    ).rejects.toThrow(/strictly prohibited/);
  });

  it('records clinician confirmation in the immutable audit log', async () => {
    const runtime = new GovernedAgentRuntime();
    const response = await runtime.executeAgentTask('critical-alert-sentinel', {
      intent: 'critical_alert_check',
      patientId: 'pt-9921',
      initiatorUserId: 'physician-12',
      initiatorRole: 'emergency_physician',
      initiatorPermissions: ['emergency:alerts:acknowledge'],
    });

    const reviewed = runtime.reviewAgentExecution(
      response.executionId,
      'physician-12',
      'emergency_physician',
      'confirm',
      'Vitals align with septic shock presentation; initiated resuscitation.',
    );

    expect(reviewed.isClinicianConfirmed).toBe(true);
    const auditEntries = runtime.getAuditTrail('critical-alert-sentinel');
    expect(auditEntries.length).toBeGreaterThan(0);
    expect(auditEntries[auditEntries.length - 1].isClinicianConfirmed).toBe(true);
  });
});
