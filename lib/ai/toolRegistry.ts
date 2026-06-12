import type { AIRequestType, ToolDefinition } from './types';
import type {
  AlertSeverity,
  Patient,
  PatientFlag,
  PatientState,
  Priority,
  QueueType,
} from '../../types/emergency';

export type EmergencyToolName =
  | 'get_patient_details'
  | 'get_queue_status'
  | 'flag_patient'
  | 'move_patient_state'
  | 'launch_calculator'
  | 'create_referral'
  | 'get_capacity_status'
  | 'search_patients'
  | 'dispatch_alert';

export interface PendingToolAction {
  toolName: EmergencyToolName;
  input: Record<string, any>;
  label: string;
  description: string;
  requiresConfirmation: true;
}

export type EmergencyToolResult =
  | {
      ok: true;
      toolName: EmergencyToolName;
      data: any;
      requiresConfirmation?: false;
    }
  | {
      ok: true;
      toolName: EmergencyToolName;
      requiresConfirmation: true;
      action: PendingToolAction;
      preview: any;
    }
  | {
      ok: false;
      toolName: EmergencyToolName;
      error: string;
      requiresConfirmation?: boolean;
    };

type StoreReader = () => any;

const MUTATING_TOOLS = new Set<EmergencyToolName>([
  'flag_patient',
  'move_patient_state',
  'launch_calculator',
  'create_referral',
  'dispatch_alert',
]);

const TOOL_BY_NAME: Record<EmergencyToolName, ToolDefinition> = {
  get_patient_details: {
    name: 'get_patient_details',
    description: 'Read the full Emergency OS patient object for a patient id.',
    input_schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'Emergency OS patient id.' },
      },
      required: ['patientId'],
    },
  },
  get_queue_status: {
    name: 'get_queue_status',
    description: 'Read queue statistics for one queue or all Emergency OS queues.',
    input_schema: {
      type: 'object',
      properties: {
        queue: { type: 'string', description: 'Optional QueueType to filter by.' },
      },
      required: [],
    },
  },
  flag_patient: {
    name: 'flag_patient',
    description:
      'Propose adding a clinical/operational flag to a patient. Requires human confirmation before applying.',
    input_schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        flag: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            reason: { type: 'string' },
            detectedAt: { type: 'string' },
            severity: { type: 'string', enum: ['Info', 'Warning', 'Critical'] },
          },
          required: ['type'],
        },
        reason: { type: 'string' },
      },
      required: ['patientId', 'flag', 'reason'],
    },
  },
  move_patient_state: {
    name: 'move_patient_state',
    description:
      'Propose moving a patient to a different journey state. Requires human confirmation before applying.',
    input_schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        targetState: {
          type: 'string',
          enum: [
            'Arrival',
            'Registration',
            'Triage',
            'Waiting',
            'Assessment',
            'Orders',
            'Results',
            'Disposition',
            'Admission',
            'Discharge',
            'Deceased',
          ],
        },
      },
      required: ['patientId', 'targetState'],
    },
  },
  launch_calculator: {
    name: 'launch_calculator',
    description:
      'Propose opening a clinical calculator for a patient. Requires human confirmation before opening UI.',
    input_schema: {
      type: 'object',
      properties: {
        calculatorType: { type: 'string' },
        patientId: { type: 'string' },
      },
      required: ['calculatorType'],
    },
  },
  create_referral: {
    name: 'create_referral',
    description:
      'Propose creating a draft referral for a patient. Requires human confirmation before saving.',
    input_schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        department: { type: 'string' },
        urgency: { type: 'string', enum: ['Routine', 'Urgent', 'Emergent'] },
        summary: { type: 'string' },
      },
      required: ['patientId', 'department', 'urgency', 'summary'],
    },
  },
  get_capacity_status: {
    name: 'get_capacity_status',
    description: 'Read the full current Emergency OS CapacitySnapshot.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  search_patients: {
    name: 'search_patients',
    description:
      'Search Emergency OS patients by query and optional partial patient fields. Returns only summary fields.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        filter: { type: 'object', description: 'Optional partial Patient fields to match.' },
      },
      required: ['query'],
    },
  },
  dispatch_alert: {
    name: 'dispatch_alert',
    description:
      'Propose dispatching an Emergency OS alert. Requires human confirmation before adding it.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        message: { type: 'string' },
        severity: { type: 'string', enum: ['Info', 'Warning', 'Critical'] },
        patientId: { type: 'string' },
      },
      required: ['title', 'message', 'severity'],
    },
  },
};

const TOOLS_BY_REQUEST_TYPE: Record<AIRequestType, EmergencyToolName[]> = {
  COPILOT_CHAT: Object.keys(TOOL_BY_NAME) as EmergencyToolName[],
  SCORE_ASSIST: ['launch_calculator'],
  INTAKE_SUGGESTION: ['get_patient_details', 'launch_calculator'],
  CLINICAL_SUMMARY: ['get_patient_details', 'search_patients', 'get_capacity_status'],
  HANDOFF_BRIEF: [],
  PROTOCOL_SUGGEST: ['launch_calculator', 'search_patients'],
  TRIAGE_ASSIST: ['search_patients', 'get_patient_details', 'get_queue_status', 'get_capacity_status'],
  SHIFT_SUMMARY: ['get_capacity_status', 'get_queue_status', 'search_patients'],
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  Arrival: ['Registration'],
  Registration: ['Triage'],
  Triage: ['Waiting'],
  Waiting: ['Assessment'],
  Assessment: ['Orders', 'Disposition'],
  Orders: ['Results'],
  Results: ['Disposition', 'Assessment'],
  Disposition: ['Discharge', 'Admission'],
  Admission: [],
  Discharge: [],
  Deceased: [],
};

let storeReader: StoreReader | null = null;

export function setToolRegistryStoreReader(reader: StoreReader | null) {
  storeReader = reader;
}

export function getToolsForRequestType(type: AIRequestType): ToolDefinition[] {
  return (TOOLS_BY_REQUEST_TYPE[type] || []).map((name) => TOOL_BY_NAME[name]);
}

export function getEmergencyToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOL_BY_NAME);
}

export function isMutatingTool(toolName: string): boolean {
  return MUTATING_TOOLS.has(toolName as EmergencyToolName);
}

export function executeEmergencyTool(
  toolName: EmergencyToolName,
  input: Record<string, any> = {},
): EmergencyToolResult {
  if (!TOOL_BY_NAME[toolName]) {
    return { ok: false, toolName, error: `Unknown Emergency OS tool: ${toolName}` };
  }

  if (isMutatingTool(toolName)) {
    return pendingAction(toolName, input);
  }

  const state = getStoreState();
  if (!state) {
    return { ok: false, toolName, error: 'Emergency OS store is not available.' };
  }

  try {
    switch (toolName) {
      case 'get_patient_details':
        return readPatientDetails(state, toolName, input);
      case 'get_queue_status':
        return readQueueStatus(state, toolName, input);
      case 'get_capacity_status':
        return { ok: true, toolName, data: clone(state.capacity), requiresConfirmation: false };
      case 'search_patients':
        return searchPatients(state, toolName, input);
      default:
        return { ok: false, toolName, error: `${toolName} is not a read-only tool.` };
    }
  } catch (error) {
    return {
      ok: false,
      toolName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function applyConfirmedToolAction(action: PendingToolAction): Promise<EmergencyToolResult> {
  const state = getStoreState();
  if (!state) {
    return { ok: false, toolName: action.toolName, error: 'Emergency OS store is not available.' };
  }

  try {
    switch (action.toolName) {
      case 'flag_patient':
        return applyFlagPatient(state, action.input);
      case 'move_patient_state':
        return applyMovePatientState(action.input);
      case 'launch_calculator':
        return applyLaunchCalculator(action.input);
      case 'create_referral':
        return applyCreateReferral(state, action.input);
      case 'dispatch_alert':
        return applyDispatchAlert(state, action.input);
      default:
        return { ok: false, toolName: action.toolName, error: `${action.toolName} cannot be applied.` };
    }
  } catch (error) {
    return {
      ok: false,
      toolName: action.toolName,
      error: error instanceof Error ? error.message : String(error),
      requiresConfirmation: true,
    };
  }
}

function readPatientDetails(
  state: any,
  toolName: EmergencyToolName,
  input: Record<string, any>,
): EmergencyToolResult {
  const patient = state.patients?.find((candidate: Patient) => candidate.id === input.patientId);
  if (!patient) {
    return { ok: false, toolName, error: `Patient ${input.patientId} was not found.` };
  }
  return { ok: true, toolName, data: clone(patient), requiresConfirmation: false };
}

function readQueueStatus(
  state: any,
  toolName: EmergencyToolName,
  input: Record<string, any>,
): EmergencyToolResult {
  const queues = Array.isArray(state.queues) ? state.queues : [];
  if (!input.queue) {
    return { ok: true, toolName, data: clone(queues), requiresConfirmation: false };
  }

  const queue = queues.find((candidate: any) => candidate.type === input.queue || candidate.name === input.queue);
  if (!queue) {
    return { ok: false, toolName, error: `Queue ${input.queue} was not found.` };
  }
  return { ok: true, toolName, data: clone(queue), requiresConfirmation: false };
}

function searchPatients(
  state: any,
  toolName: EmergencyToolName,
  input: Record<string, any>,
): EmergencyToolResult {
  const query = String(input.query || '').trim().toLowerCase();
  const filter = input.filter || {};
  const patients = Array.isArray(state.patients) ? state.patients : [];
  const matches = patients
    .filter((patient: Patient) => patientMatchesQuery(patient, query))
    .filter((patient: Patient) => patientMatchesFilter(patient, filter))
    .map((patient: any) => ({
      id: patient.id,
      name: patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' '),
      complaint: patient.complaint || patient.chiefComplaint,
      state: patient.state,
      priority: patient.priority,
      waitMinutes: patient.waitMinutes ?? waitMinutes(patient.arrivalTime),
      location: patient.location,
    }));

  return { ok: true, toolName, data: matches, requiresConfirmation: false };
}

function pendingAction(toolName: EmergencyToolName, input: Record<string, any>): EmergencyToolResult {
  const action: PendingToolAction = {
    toolName,
    input,
    label: actionLabel(toolName, input),
    description: actionDescription(toolName, input),
    requiresConfirmation: true,
  };

  return {
    ok: true,
    toolName,
    requiresConfirmation: true,
    action,
    preview: buildActionPreview(toolName, input),
  };
}

function applyFlagPatient(state: any, input: Record<string, any>): EmergencyToolResult {
  const patient = state.patients?.find((candidate: Patient) => candidate.id === input.patientId);
  if (!patient) {
    return { ok: false, toolName: 'flag_patient', error: `Patient ${input.patientId} was not found.` };
  }

  const flag = normalizeFlag(input.flag, input.reason);
  state.addFlag(input.patientId, flag, { reason: input.reason || flag.reason });
  return {
    ok: true,
    toolName: 'flag_patient',
    data: { patientId: input.patientId, flag: flag.type, confirmed: true },
  };
}

async function applyMovePatientState(input: Record<string, any>): Promise<EmergencyToolResult> {
  const state = getStoreState();
  const patient = state?.patients?.find((candidate: Patient) => candidate.id === input.patientId);
  if (!patient) {
    return { ok: false, toolName: 'move_patient_state', error: `Patient ${input.patientId} was not found.` };
  }

  const targetState = input.targetState as PatientState;
  const validNextStates = VALID_TRANSITIONS[String(patient.state)] || [];
  if (!validNextStates.includes(String(targetState))) {
    return {
      ok: false,
      toolName: 'move_patient_state',
      error: `Invalid transition from ${patient.state} to ${targetState}. Valid next states: ${
        validNextStates.join(', ') || 'none'
      }.`,
      requiresConfirmation: true,
    };
  }

  state.movePatientToState(input.patientId, targetState);
  state.updateCapacity?.();
  return {
    ok: true,
    toolName: 'move_patient_state',
    data: { patientId: input.patientId, from: patient.state, to: targetState },
  };
}

function applyLaunchCalculator(input: Record<string, any>): EmergencyToolResult {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ed:open-calculator', {
        detail: {
          calculatorId: input.calculatorType,
          patientId: input.patientId,
        },
      }),
    );
  }

  return {
    ok: true,
    toolName: 'launch_calculator',
    data: {
      calculatorType: input.calculatorType,
      patientId: input.patientId || null,
      opened: typeof window !== 'undefined',
    },
  };
}

function applyCreateReferral(state: any, input: Record<string, any>): EmergencyToolResult {
  const beforeIds = new Set((state.referrals || []).map((referral: any) => referral.id));
  state.createReferral({
    patientId: input.patientId,
    requestingStaffId: state.activeShift?.chargeStaffId || 'ai-copilot',
    targetDepartment: input.department,
    urgency: input.urgency,
    reason: input.summary,
    clinicalSummary: input.summary,
    status: 'Draft',
    workflow: 'Referral',
  });

  const updatedState = getStoreState();
  const referral = (updatedState?.referrals || []).find((candidate: any) => !beforeIds.has(candidate.id));
  return {
    ok: true,
    toolName: 'create_referral',
    data: { referralId: referral?.id || null, status: 'Draft' },
  };
}

function applyDispatchAlert(state: any, input: Record<string, any>): EmergencyToolResult {
  const alert = state.dispatchAlert({
    id: `alert-ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'System',
    title: input.title,
    message: input.message,
    severity: input.severity as AlertSeverity,
    patientId: input.patientId,
    createdAt: new Date().toISOString(),
  });

  return {
    ok: true,
    toolName: 'dispatch_alert',
    data: { alertId: alert.id },
  };
}

function getStoreState(): any | null {
  try {
    return storeReader?.() || null;
  } catch (_error) {
    return null;
  }
}

function normalizeFlag(flagInput: any, reason?: string): PatientFlag {
  const flag = typeof flagInput === 'string' ? { type: flagInput } : flagInput || {};
  return {
    type: flag.type,
    reason: reason || flag.reason || 'AI suggested flag for human review.',
    detectedAt: flag.detectedAt || new Date().toISOString(),
    severity: flag.severity || 'Warning',
  };
}

function patientMatchesQuery(patient: any, query: string): boolean {
  if (!query) return true;
  const haystack = [
    patient.id,
    patient.mrn,
    patient.name,
    patient.firstName,
    patient.lastName,
    patient.complaint,
    patient.chiefComplaint,
    patient.state,
    patient.priority,
    patient.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function patientMatchesFilter(patient: any, filter: Partial<Patient>): boolean {
  return Object.entries(filter || {}).every(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;
    return String((patient as any)[key] || '').toLowerCase() === String(value).toLowerCase();
  });
}

function waitMinutes(arrivalTime?: string): number {
  if (!arrivalTime) return 0;
  const then = new Date(arrivalTime).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 60000));
}

function actionLabel(toolName: EmergencyToolName, input: Record<string, any>): string {
  switch (toolName) {
    case 'flag_patient':
      return `Flag patient ${input.patientId}`;
    case 'move_patient_state':
      return `Move patient ${input.patientId} to ${input.targetState}`;
    case 'launch_calculator':
      return `Open ${input.calculatorType}`;
    case 'create_referral':
      return `Create ${input.department} referral`;
    case 'dispatch_alert':
      return `Dispatch ${input.severity} alert`;
    default:
      return toolName;
  }
}

function actionDescription(toolName: EmergencyToolName, input: Record<string, any>): string {
  switch (toolName) {
    case 'flag_patient':
      return input.reason || 'Add a patient flag for human review.';
    case 'move_patient_state':
      return 'Move the patient in the Emergency OS journey timeline.';
    case 'launch_calculator':
      return 'Open the calculator UI for human-entered scoring.';
    case 'create_referral':
      return input.summary || 'Create a draft referral.';
    case 'dispatch_alert':
      return input.message || 'Dispatch an Emergency OS alert.';
    default:
      return 'Confirm AI-suggested action.';
  }
}

function buildActionPreview(toolName: EmergencyToolName, input: Record<string, any>) {
  return {
    toolName,
    input: clone(input),
    requiresConfirmation: true,
    message: 'This action must be confirmed by a human before it is applied.',
  };
}

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}
