import {
  buildAutomationEngineContext,
  isAutomationEntitled,
  type AutomationEngineRuntimeContext,
} from '../config/automationEntitlement.config';
import {
  AUTOMATION_STATUSES,
  getAutomationById,
  getWorkspaceAutomations,
} from '../data/automationRegistry';
import {
  AUTOMATION_AUDIT_STATUSES,
  logAutomationAuditEvent,
} from '../data/automationAuditTrail';

function mergeAutomationContext(
  context: AutomationEngineRuntimeContext = {},
): AutomationEngineRuntimeContext {
  return { ...buildAutomationEngineContext(), ...context };
}

function conditionResult(condition, context: any = {}) {
  if (/human review/i.test(condition)) {
    return Boolean(context.humanReviewAvailable ?? true);
  }
  if (/integration|route configured|ticketing|telemetry|lab data|fleet data/i.test(condition)) {
    return Boolean(context.integrationsEnabled ?? true);
  }
  return true;
}

function shouldBlock(automation, context: any = {}) {
  if (!automation) return 'Automation not found.';
  if (automation.status === AUTOMATION_STATUSES.DISABLED) return 'Automation is disabled.';
  if (
    automation.automationId &&
    !isAutomationEntitled(automation.automationId, {
      entitledAssetIds: context.entitledAssetIds,
      strictEntitlements: context.strictEntitlements,
    })
  ) {
    return `Automation "${automation.automationId}" is not entitled for this tenant.`;
  }
  if (automation.subscriptionTier && context.subscriptionTier) {
    const tierOrder = { free: 0, starter: 1, professional: 2, academic: 2, enterprise: 3, government: 3 };
    if ((tierOrder[context.subscriptionTier] ?? 0) < (tierOrder[automation.subscriptionTier] ?? 0)) {
      return `Requires ${automation.subscriptionTier} subscription.`;
    }
  }
  if (automation.humanReviewRequired && context.humanReviewAvailable === false) {
    return 'Human review is required but unavailable.';
  }
  return '';
}

function buildAuditEvent(automation, status, context: any = {}, extra: any = {}) {
  const patientJourneyStates = automation?.patientJourneyStates || automation?.journeyStages || automation?.requiredWorkflows || [];

  return {
    triggerFired: automation?.trigger || 'Automation trigger',
    conditionsEvaluated: (automation?.conditions || []).map((condition) => ({
      label: condition,
      result: conditionResult(condition, context),
    })),
    actionSelected: (automation?.actions || [])[0] || 'Review automation',
    patientJourneyStates,
    user: context.user || { id: 'local-user', name: 'Local user' },
    tenant: context.tenant || { id: 'local-demo-tenant', name: 'Local Demo Tenant' },
    workspace: {
      id: automation?.workspace || context.workspaceId || 'workspace',
      name: `${automation?.workspace || context.workspaceId || 'CareDroid'} CareDroid`,
    },
    aiInvolvement: {
      involved: Boolean(automation?.aiInvolvement),
      summary: automation?.aiInvolvement || 'No AI involvement.',
    },
    toolCalled: (automation?.requiredAssets || [])[0] || 'none',
    backendEndpoint: context.backendEndpoint || '/api/automation-audit/events',
    status,
    reviewer: {
      required: Boolean(automation?.humanReviewRequired),
      name: automation?.humanReviewRequired ? 'Workspace reviewer' : '',
    },
    ...extra,
  };
}

export const AutomationEngine = {
  evaluateAutomation(automationId, context: any = {}) {
    const runtimeContext = mergeAutomationContext(context);
    const automation = getAutomationById(automationId);
    const patientJourneyStates = automation?.patientJourneyStates || automation?.journeyStages || automation?.requiredWorkflows || [];
    const blockedReason = shouldBlock(automation, runtimeContext);
    const conditionResults = (automation?.conditions || []).map((condition) => ({
      label: condition,
      result: conditionResult(condition, runtimeContext),
    }));
    const failedCondition = conditionResults.find((condition) => !condition.result);

    if (blockedReason || failedCondition) {
      return {
        ok: false,
        status: AUTOMATION_AUDIT_STATUSES.BLOCKED,
        automation,
        reason: blockedReason || `Condition failed: ${failedCondition.label}`,
        conditionResults,
        patientJourneyStates,
        actions: [],
      };
    }

    return {
      ok: true,
      status: AUTOMATION_AUDIT_STATUSES.SUCCESS,
      automation,
      reason: '',
      conditionResults,
      patientJourneyStates,
      actions: automation.actions,
    };
  },

  runAutomation(automationId, context: any = {}) {
    const runtimeContext = mergeAutomationContext(context);
    const evaluation = this.evaluateAutomation(automationId, runtimeContext);
    if (!evaluation.automation) {
      return {
        ...evaluation,
        auditEntry: null,
      };
    }
    const auditEntry = logAutomationAuditEvent(
      buildAuditEvent(evaluation.automation, evaluation.status, runtimeContext, {
        reason: evaluation.status === AUTOMATION_AUDIT_STATUSES.BLOCKED ? evaluation.reason : '',
      })
    );
    return {
      ...evaluation,
      auditEntry,
      outputs: evaluation.automation.outputs,
      patientJourneyStates:
        evaluation.patientJourneyStates ||
        evaluation.automation.patientJourneyStates ||
        evaluation.automation.journeyStages ||
        evaluation.automation.requiredWorkflows ||
        [],
      assistantPrompt: `Review ${evaluation.automation.title} in ${evaluation.automation.workspace}. ${evaluation.automation.aiInvolvement}`,
    };
  },

  getWorkspaceAutomationState(workspaceId, context: any = {}) {
    const runtimeContext = mergeAutomationContext(context);
    const automations = getWorkspaceAutomations(workspaceId);
    const evaluations = automations.map((automation) =>
      this.evaluateAutomation(automation.automationId, runtimeContext),
    );
    return {
      workspaceId,
      activeAutomations: automations.filter((automation) => automation.status === AUTOMATION_STATUSES.ACTIVE),
      disabledAutomations: automations.filter((automation) => automation.status === AUTOMATION_STATUSES.DISABLED),
      demoAutomations: automations.filter((automation) => automation.status === AUTOMATION_STATUSES.DEMO),
      blockedAutomations: evaluations.filter((evaluation) => !evaluation.ok).map((evaluation) => evaluation.automation),
      settings: {
        humanReviewRequired: automations.filter((automation) => automation.humanReviewRequired).length,
        highRisk: automations.filter((automation) => automation.riskLevel === 'high').length,
        subscriptionTiers: [...new Set(automations.map((automation) => automation.subscriptionTier))],
      },
    };
  },
};

export const evaluateAutomation = AutomationEngine.evaluateAutomation.bind(AutomationEngine);
export const runAutomation = AutomationEngine.runAutomation.bind(AutomationEngine);
export const getWorkspaceAutomationState = AutomationEngine.getWorkspaceAutomationState.bind(AutomationEngine);

export default AutomationEngine;
