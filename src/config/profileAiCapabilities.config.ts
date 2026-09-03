/**
 * Maps operational profile functions to governed unified-AI node services
 * surfaced on the profile insights panel.
 */
import { PLATFORM_AI_MODEL_REGISTRY } from '../data/aiModelRegistry';
import type { ProfileCopyStack, ProfileFunctionId } from './userProfileCopyModel';

export type ProfileAiCapability = Readonly<{
  serviceId: string;
  name: string;
  purpose: string;
  route: string;
  riskLevel: string;
  status: string;
  channel: string;
}>;

const FUNCTION_AI_SERVICE_IDS: Readonly<Partial<Record<ProfileFunctionId, readonly string[]>>> =
  Object.freeze({
    'copilot-capture': ['copilot', 'ambientDocumentation'],
    'clinical-tools': ['calculatorExplanation', 'clinicalWorkflowLauncher', 'protocolTrigger'],
    'triage-acuity': ['triageSupport', 'deteriorationPrediction'],
    'assign-acuity': ['triageSupport', 'deteriorationPrediction'],
    'register-patient': ['smartIntakeVerification', 'mohPatientMatching'],
    'verify-identity': ['smartIntakeVerification', 'mohPatientMatching'],
    'ems-handoff': ['smartHandover', 'federatedEmsTriage'],
    'command-throughput': ['analyticsExplanation', 'dischargePrediction', 'admissionPrediction'],
    'capacity-boarding': ['analyticsExplanation', 'admissionPrediction'],
    'analytics-view': ['analyticsExplanation', 'referralSummarization'],
    'provider-rounds': ['clinicalWorkflowLauncher', 'deteriorationPrediction'],
    disposition: ['dischargePrediction', 'referralSummarization'],
    'fleet-ops': ['edgeAmbulance', 'federatedEmsTriage'],
    'governance-audit': ['protocolTrigger', 'textMining'],
    'lab-tools': ['calculatorExplanation'],
    'pharmacy-tools': ['calculatorExplanation', 'protocolTrigger'],
    'education-sim': ['calculatorExplanation', 'clinicalWorkflowLauncher'],
    'trackmind-ops': ['analyticsExplanation'],
    reassessment: ['deteriorationPrediction', 'copilot'],
  });

const registryByServiceId = Object.freeze(
  Object.fromEntries(PLATFORM_AI_MODEL_REGISTRY.map((model) => [model.platformServiceId, model])),
);

export function resolveProfileAiCapabilities(
  profileCopy?: ProfileCopyStack | null,
  limit = 6,
): readonly ProfileAiCapability[] {
  const functionIds = profileCopy?.primaryFunctions?.map((fn) => fn.id as ProfileFunctionId) || [];
  const orderedServiceIds: string[] = [];

  for (const functionId of functionIds) {
    const serviceIds = FUNCTION_AI_SERVICE_IDS[functionId] || [];
    for (const serviceId of serviceIds) {
      if (!orderedServiceIds.includes(serviceId)) {
        orderedServiceIds.push(serviceId);
      }
    }
  }

  if (orderedServiceIds.length === 0) {
    orderedServiceIds.push('copilot', 'analyticsExplanation');
  }

  return orderedServiceIds
    .map((serviceId) => registryByServiceId[serviceId])
    .filter(Boolean)
    .slice(0, limit)
    .map((model) =>
      Object.freeze({
        serviceId: model.platformServiceId,
        name: model.name,
        purpose: model.purpose,
        route: model.route,
        riskLevel: model.riskLevel,
        status: model.status,
        channel: model.channel,
      }),
    );
}
