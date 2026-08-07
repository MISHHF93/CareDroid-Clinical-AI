import {
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from '../modules/emergency-os/emergency-os.advanced-services';
import {
  EmergencyPatientService,
  PatientJourneyService,
  QueueIntelligenceService,
  WorkflowActionLogService,
} from '../modules/emergency-os/emergency-os.services';
import { aiCallInterrogationService } from './ai-call-interrogation.service';
import { aiGovernanceService } from './ai-governance.service';
import { boardingService } from './boarding.service';
import { capacityService } from './capacity.service';
import { clinicalProtocolService } from './clinical-protocol.service';
import { consentService } from './consent.service';
import { deteriorationPredictionV3Service } from './deterioration-prediction-v3.service';
import { dischargePredictionService } from './discharge-prediction.service';
import { emsService } from './ems.service';
import { erPulseHandoverService } from './smart-handover-v2.service';
import { federatedEMSService } from './federated-ems.service';
import { incidentReportingService } from './incident-reporting.service';
import { iotDigitalTwinService } from './iot-digital-twin.service';
import { lmecsService } from './lmecs.service';
import { mohFhirService } from './moh-fhir.service';
import { mpiService } from './mpi.service';
import { ocrService } from './ocr.service';
import { organizationalDigitalTwin } from './organizational-digital-twin.service';
import { reassessmentService } from './reassessment.service';
import { smartIntakeService } from './smart-intake.service';
import { surgeCapacityService } from './surge-capacity.service';
import { wearableRPMService } from './wearable-rpm.service';

const workflowActionLogService = new WorkflowActionLogService();
// Manually constructed outside Nest DI, so it never receives a Patient
// repository (the constructor's 3rd param is optional for exactly this
// reason) and stays in-memory-only. This instance only feeds the generic
// lifecycle/health-probe registry below (initializeAllServices/
// checkServiceHealth) via patientJourneyService/queueIntelligenceService/
// realTimeSimulationService — no real controller reads or writes patient
// data through this registry, so it doesn't need database persistence.
const emergencyPatientService = new EmergencyPatientService(workflowActionLogService);

export const patientJourneyService = new PatientJourneyService(emergencyPatientService);
export const queueIntelligenceService = new QueueIntelligenceService(emergencyPatientService);
export const realTimeSimulationService = new RealTimeSimulationService(emergencyPatientService);
export const hybridDigitalTwinService = new HybridDigitalTwinService(realTimeSimulationService);
export const organizationalDigitalTwinService = organizationalDigitalTwin;

export {
  aiCallInterrogationService,
  aiGovernanceService,
  boardingService,
  capacityService,
  clinicalProtocolService,
  consentService,
  deteriorationPredictionV3Service,
  dischargePredictionService,
  emsService,
  erPulseHandoverService,
  federatedEMSService,
  incidentReportingService,
  iotDigitalTwinService,
  lmecsService,
  mohFhirService,
  mpiService,
  ocrService,
  reassessmentService,
  smartIntakeService,
  surgeCapacityService,
  wearableRPMService,
};

export const emergencyOsServiceRegistry = {
  capacityService,
  emsService,
  reassessmentService,
  patientJourneyService,
  queueIntelligenceService,
  surgeCapacityService,
  boardingService,
  dischargePredictionService,
  clinicalProtocolService,
  deteriorationPredictionV3Service,
  erPulseHandoverService,
  aiCallInterrogationService,
  smartIntakeService,
  mpiService,
  ocrService,
  mohFhirService,
  wearableRPMService,
  federatedEMSService,
  lmecsService,
  iotDigitalTwinService,
  realTimeSimulationService,
  hybridDigitalTwinService,
  organizationalDigitalTwinService,
  aiGovernanceService,
  incidentReportingService,
  consentService,
} as const;

export type EmergencyOsServiceName = keyof typeof emergencyOsServiceRegistry;

export const REQUIRED_SERVICE_NAMES = Object.keys(
  emergencyOsServiceRegistry,
) as EmergencyOsServiceName[];

type LifecycleMethod = 'initialize' | 'start' | 'connect' | 'startScheduler';
type HealthMethod = 'healthCheck' | 'getHealth' | 'checkHealth';

const lifecycleMethods: LifecycleMethod[] = ['initialize', 'start', 'connect', 'startScheduler'];
const healthMethods: HealthMethod[] = ['healthCheck', 'getHealth', 'checkHealth'];

export interface ServiceInitializationResult {
  status: 'ready' | 'initialized' | 'failed';
  methodsCalled: LifecycleMethod[];
  error?: string;
}

export interface InitializeAllServicesSummary {
  generatedAt: string;
  totals: {
    registered: number;
    initialized: number;
    ready: number;
    failed: number;
  };
  services: Record<EmergencyOsServiceName, ServiceInitializationResult>;
}

export interface ServiceHealthStatus {
  status: string;
  checkedAt: string;
  method?: HealthMethod;
  error?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface ServiceHealthSummary {
  generatedAt: string;
  totals: {
    registered: number;
    ready: number;
    failed: number;
  };
  services: Record<EmergencyOsServiceName, ServiceHealthStatus>;
}

function serviceEntries(): Array<[EmergencyOsServiceName, unknown]> {
  return Object.entries(emergencyOsServiceRegistry) as Array<[EmergencyOsServiceName, unknown]>;
}

function getCallable(service: unknown, method: string): (() => unknown) | null {
  const candidate = (service as Record<string, unknown>)[method];
  return typeof candidate === 'function' ? (candidate.bind(service) as () => unknown) : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function initializeAllServices(): Promise<InitializeAllServicesSummary> {
  const services = {} as Record<EmergencyOsServiceName, ServiceInitializationResult>;

  for (const [name, service] of serviceEntries()) {
    const methodsCalled: LifecycleMethod[] = [];
    try {
      for (const method of lifecycleMethods) {
        const callable = getCallable(service, method);
        if (!callable) continue;
        await callable();
        methodsCalled.push(method);
      }

      services[name] = {
        status: methodsCalled.length ? 'initialized' : 'ready',
        methodsCalled,
      };
    } catch (error) {
      services[name] = {
        status: 'failed',
        methodsCalled,
        error: errorMessage(error),
      };
    }
  }

  const results = Object.values(services);
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      registered: results.length,
      initialized: results.filter((result) => result.status === 'initialized').length,
      ready: results.filter((result) => result.status !== 'failed').length,
      failed: results.filter((result) => result.status === 'failed').length,
    },
    services,
  };
}

export async function checkServiceHealth(): Promise<ServiceHealthSummary> {
  const services = {} as Record<EmergencyOsServiceName, ServiceHealthStatus>;

  for (const [name, service] of serviceEntries()) {
    const checkedAt = new Date().toISOString();
    try {
      let healthMethod: HealthMethod | undefined;
      let healthResult: unknown;

      for (const method of healthMethods) {
        const callable = getCallable(service, method);
        if (!callable) continue;
        healthMethod = method;
        healthResult = await callable();
        break;
      }

      if (healthMethod && isRecord(healthResult)) {
        const status = typeof healthResult.status === 'string' ? healthResult.status : 'ready';
        services[name] = {
          ...healthResult,
          status,
          checkedAt,
          method: healthMethod,
        };
      } else {
        services[name] = {
          status: 'ready',
          checkedAt,
          method: healthMethod,
          details: healthResult,
        };
      }
    } catch (error) {
      services[name] = {
        status: 'failed',
        checkedAt,
        error: errorMessage(error),
      };
    }
  }

  const results = Object.values(services);
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      registered: results.length,
      ready: results.filter((result) => result.status !== 'failed').length,
      failed: results.filter((result) => result.status === 'failed').length,
    },
    services,
  };
}
