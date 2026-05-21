import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import { classifyOrchestratorExecution } from '../data/orchestratorMappingAudit';
import { getToolById } from '../data/toolRegistry';

export const EXECUTOR_CHAT_CARD_CONFIGS = Object.freeze({
  'drug-interactions': {
    toolName: 'Drug Interaction Checker',
    whatItDoes: 'Checks a medication list for drug-drug interactions and severity context.',
    requiredInputs: [
      {
        key: 'medications',
        label: 'At least 2 medications',
        question: 'Which medications should I check? Add at least two names.',
      },
    ],
    optionalInputs: [
      {
        key: 'severityFilter',
        label: 'Severity filter',
        question: 'Should I show all severities or focus on contraindicated/major interactions?',
      },
    ],
  },
  'lab-interpreter': {
    toolName: 'Lab Results Interpreter',
    whatItDoes: 'Interprets structured lab values, flags abnormal or critical results, and summarizes clinical significance.',
    requiredInputs: [
      {
        key: 'labValues',
        label: 'At least 1 lab value',
        question: 'Which lab values should I interpret? Use one per line, such as "WBC 15.2 K/uL".',
      },
    ],
    optionalInputs: [
      { key: 'patientAge', label: 'Patient age', question: 'What is the patient age, if relevant?' },
      { key: 'patientSex', label: 'Patient sex', question: 'What patient sex should be used for context, if relevant?' },
      {
        key: 'clinicalContext',
        label: 'Clinical context',
        question: 'Is there clinical context I should include, such as sepsis evaluation or kidney injury?',
      },
    ],
  },
  'sofa-calculator': {
    toolName: 'SOFA Score Calculator',
    whatItDoes: 'Calculates available SOFA organ-system subscores and total severity context from supplied ICU data.',
    requiredInputs: [],
    optionalInputs: [
      { key: 'pao2', label: 'PaO2', question: 'What PaO2 is available?' },
      { key: 'fio2', label: 'FiO2', question: 'What FiO2 is available?' },
      { key: 'platelets', label: 'Platelets', question: 'What platelet count is available?' },
      { key: 'bilirubin', label: 'Bilirubin', question: 'What bilirubin value is available?' },
      { key: 'map', label: 'MAP / vasopressor context', question: 'What MAP or vasopressor context is available?' },
      { key: 'gcs', label: 'GCS', question: 'What GCS is available?' },
      { key: 'creatinine', label: 'Creatinine', question: 'What creatinine value is available?' },
      { key: 'urineOutput', label: 'Urine output', question: 'What urine output is available?' },
      {
        key: 'mechanicalVentilation',
        label: 'Mechanical ventilation',
        question: 'Is the patient mechanically ventilated?',
      },
    ],
    minimumPrompt: 'SOFA has no required fields in the backend contract, but I need at least one available SOFA input to preview a meaningful run.',
  },
});

const EXECUTABLE_INPUT_DEFAULTS = Object.freeze({
  'drug-interactions': {
    medicationsText: '',
    severityFilter: 'all',
  },
  'lab-interpreter': {
    labValuesText: '',
    patientAge: '',
    patientSex: '',
    clinicalContext: '',
  },
  'sofa-calculator': {
    pao2: '',
    fio2: '',
    platelets: '',
    bilirubin: '',
    map: '',
    gcs: '',
    creatinine: '',
    urineOutput: '',
    mechanicalVentilation: false,
  },
});

function cleanText(value) {
  return String(value ?? '').trim();
}

function toNumberOrUndefined(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return undefined;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

function parseMedications(text) {
  return cleanText(text)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLabLine(line) {
  const cleaned = cleanText(line);
  if (!cleaned) return null;

  const commaParts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const value = Number(commaParts[1]);
    if (!Number.isFinite(value)) return null;
    return {
      name: commaParts[0],
      value,
      unit: commaParts.slice(2).join(' '),
    };
  }

  const match = cleaned.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)\s*([^\d\s].*)?$/);
  if (!match) return null;
  return {
    name: match[1].trim(),
    value: Number(match[2]),
    unit: cleanText(match[3]),
  };
}

function parseLabValues(text) {
  return cleanText(text)
    .split(/\n+/)
    .map(parseLabLine)
    .filter(Boolean);
}

function defaultParametersForTool(toolId) {
  return { ...(EXECUTABLE_INPUT_DEFAULTS[toolId] || {}) };
}

export function getExecutorCardConfig(toolId) {
  return EXECUTOR_CHAT_CARD_CONFIGS[toolId] || null;
}

export function createChatExecutionAction(toolOrId, { source = 'chat' } = {}) {
  const registryId = typeof toolOrId === 'string' ? toolOrId : toolOrId?.id;
  const tool = typeof toolOrId === 'string' ? getToolById(toolOrId) : toolOrId;
  const label = tool?.name || registryId || 'Clinical tool';
  const classification = classifyOrchestratorExecution(registryId);
  const launch = resolveCatalogLaunch(registryId);
  const isExecutable = classification.status === 'executable';
  const hasGuidedRoute = Boolean(launch.chatSeed || launch.path || tool?.path);

  return {
    id: `chat-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source,
    registryId,
    toolId: isExecutable ? classification.nluToolId : launch.orchestratorTool,
    mode: isExecutable ? 'executable' : hasGuidedRoute ? 'guided' : 'unsupported',
    status: isExecutable ? 'collecting' : hasGuidedRoute ? 'available' : 'unsupported',
    toolName: label,
    description: tool?.description || launch.chatSeed || classification.message,
    executorConfig: isExecutable ? getExecutorCardConfig(classification.nluToolId) : null,
    path: launch.path || tool?.path || null,
    chatSeed: launch.chatSeed || null,
    openLabel: launch.openLabel || (launch.path ? 'Open tool' : 'Start guided chat'),
    parameters: isExecutable ? defaultParametersForTool(classification.nluToolId) : {},
    normalizedParameters: null,
    validation: null,
    result: null,
    error: isExecutable ? '' : classification.message,
    createdAt: new Date().toISOString(),
  };
}

export function buildExecutionParameters(action) {
  const params = action?.parameters || {};
  switch (action?.toolId) {
    case 'drug-interactions':
      return compactObject({
        medications: parseMedications(params.medicationsText),
        severityFilter: params.severityFilter || 'all',
      });
    case 'lab-interpreter':
      return compactObject({
        labValues: parseLabValues(params.labValuesText),
        patientAge: toNumberOrUndefined(params.patientAge),
        patientSex: cleanText(params.patientSex),
        clinicalContext: cleanText(params.clinicalContext),
      });
    case 'sofa-calculator':
      return compactObject({
        pao2: toNumberOrUndefined(params.pao2),
        fio2: toNumberOrUndefined(params.fio2),
        platelets: toNumberOrUndefined(params.platelets),
        bilirubin: toNumberOrUndefined(params.bilirubin),
        map: toNumberOrUndefined(params.map),
        gcs: toNumberOrUndefined(params.gcs),
        creatinine: toNumberOrUndefined(params.creatinine),
        urineOutput: toNumberOrUndefined(params.urineOutput),
        mechanicalVentilation: Boolean(params.mechanicalVentilation),
      });
    default:
      return compactObject(params);
  }
}

export function getExecutionInputIssue(action) {
  const params = buildExecutionParameters(action);
  switch (action?.toolId) {
    case 'drug-interactions':
      return params.medications?.length >= 2 ? '' : 'Add at least two medications before previewing execution.';
    case 'lab-interpreter':
      return params.labValues?.length > 0 ? '' : 'Add at least one lab value before previewing execution.';
    case 'sofa-calculator':
      return Object.keys(params).some((key) => key !== 'mechanicalVentilation')
        ? ''
        : 'Add at least one SOFA input before previewing execution.';
    default:
      return action?.mode === 'executable' ? '' : 'This capability is not registered for server execution.';
  }
}

export function getMissingRequiredInputPrompts(action) {
  const config = getExecutorCardConfig(action?.toolId);
  const params = buildExecutionParameters(action);
  if (!config) return [];

  if (action.toolId === 'drug-interactions' && (params.medications?.length || 0) < 2) {
    return config.requiredInputs.map((input) => input.question);
  }

  if (action.toolId === 'lab-interpreter' && (params.labValues?.length || 0) === 0) {
    return config.requiredInputs.map((input) => input.question);
  }

  if (
    action.toolId === 'sofa-calculator' &&
    !Object.keys(params).some((key) => key !== 'mechanicalVentilation')
  ) {
    return [config.minimumPrompt];
  }

  return [];
}

export function getValidationStatusText(action) {
  if (!action || action.mode !== 'executable') return 'Not executable';
  if (action.status === 'validating') return 'Checking inputs...';
  if (action.status === 'executing') return 'Validated and running';
  if (action.status === 'success') return 'Validated and completed';
  if (action.status === 'failure') return 'Failed before completion';
  if (action.validation?.valid === false) return 'Validation failed';
  if (action.validation?.valid === true) return 'Validation passed';
  return 'Not validated yet';
}

export function summarizeExecutionParameters(action) {
  const params = buildExecutionParameters(action);
  switch (action?.toolId) {
    case 'drug-interactions':
      return [
        ['Medications', params.medications?.join(', ') || 'None'],
        ['Severity filter', params.severityFilter || 'all'],
      ];
    case 'lab-interpreter':
      return [
        ['Lab values', `${params.labValues?.length || 0} value(s)`],
        ['Age', params.patientAge ?? 'Not provided'],
        ['Sex', params.patientSex || 'Not provided'],
        ['Context', params.clinicalContext || 'Not provided'],
      ];
    case 'sofa-calculator':
      return Object.entries(params).map(([key, value]) => [key, String(value)]);
    default:
      return Object.entries(params).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : String(value),
      ]);
  }
}
