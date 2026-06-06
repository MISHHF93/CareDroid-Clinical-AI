export const AUTOMATION_STEP_TYPES = Object.freeze({
  TRIGGER: 'trigger',
  CONDITION: 'condition',
  ACTION: 'action',
});

export const AUTOMATION_EXECUTION_MODES = Object.freeze({
  DEMO_PREVIEW: 'demo-preview',
});

export const AUTOMATION_TRIGGERS = Object.freeze([
  {
    id: 'high-news2',
    label: 'High NEWS2',
    source: 'Vitals and calculator telemetry',
    description: 'NEWS2 reaches the local high-risk threshold.',
    sampleValue: 'NEWS2 >= 7',
  },
  {
    id: 'device-offline',
    label: 'Device offline',
    source: 'Medical IoT telemetry',
    description: 'A monitored bedside device stops sending heartbeat telemetry.',
    sampleValue: 'Last heartbeat > 5 minutes',
  },
  {
    id: 'abnormal-potassium',
    label: 'Abnormal potassium',
    source: 'Laboratory results',
    description: 'A potassium result arrives outside the configured normal range.',
    sampleValue: 'K < 3.0 or K > 5.5',
  },
]);

export const AUTOMATION_CONDITIONS = Object.freeze([
  {
    id: 'patient-admitted',
    label: 'Patient is admitted',
    description: 'Only run for active inpatient or emergency encounters.',
  },
  {
    id: 'device-assigned',
    label: 'Device has assigned owner',
    description: 'Only run when the device is assigned to a unit, room, or biomed owner.',
  },
  {
    id: 'critical-result-confirmed',
    label: 'Critical result confirmed',
    description: 'Only run after the lab critical-result flag has been verified.',
  },
  {
    id: 'always',
    label: 'Always run',
    description: 'Run the action whenever the trigger fires.',
  },
]);

export const AUTOMATION_ACTIONS = Object.freeze([
  {
    id: 'notify-clinician',
    label: 'Notify clinician',
    destination: 'Clinical notifications',
    description: 'Send a high-priority alert to the responsible clinician or escalation pool.',
  },
  {
    id: 'create-maintenance-ticket',
    label: 'Create maintenance ticket',
    destination: 'Biomed operations',
    description: 'Open a maintenance ticket with device, location, and last telemetry details.',
  },
  {
    id: 'open-laboratory-workflow',
    label: 'Open laboratory workflow',
    destination: 'Laboratory dashboard',
    description: 'Open the lab review workflow for repeat testing, trend review, and escalation.',
    path: '/laboratory',
  },
]);

export const AUTOMATION_TEMPLATES = Object.freeze([
  {
    id: 'news2-clinician-notification',
    name: 'High NEWS2 escalation',
    triggerId: 'high-news2',
    conditionId: 'patient-admitted',
    actionId: 'notify-clinician',
    status: 'demo-preview',
    executionMode: AUTOMATION_EXECUTION_MODES.DEMO_PREVIEW,
    goal: 'Move clinical deterioration monitoring from passive dashboard review to active escalation.',
  },
  {
    id: 'device-offline-maintenance',
    name: 'Offline device maintenance',
    triggerId: 'device-offline',
    conditionId: 'device-assigned',
    actionId: 'create-maintenance-ticket',
    status: 'demo-preview',
    executionMode: AUTOMATION_EXECUTION_MODES.DEMO_PREVIEW,
    goal: 'Convert device telemetry gaps into operational work without manual dashboard polling.',
  },
  {
    id: 'potassium-lab-workflow',
    name: 'Abnormal potassium lab workflow',
    triggerId: 'abnormal-potassium',
    conditionId: 'critical-result-confirmed',
    actionId: 'open-laboratory-workflow',
    status: 'demo-preview',
    executionMode: AUTOMATION_EXECUTION_MODES.DEMO_PREVIEW,
    goal: 'Route abnormal potassium results into the lab workflow for repeat, trend, and escalation review.',
  },
]);

function byId(items, id) {
  return items.find((item) => item.id === id) || items[0];
}

export function buildAutomationRule({ templateId, triggerId, conditionId, actionId } = {}) {
  const template = AUTOMATION_TEMPLATES.find((item) => item.id === templateId) || AUTOMATION_TEMPLATES[0];
  const trigger = byId(AUTOMATION_TRIGGERS, triggerId || template.triggerId);
  const condition = byId(AUTOMATION_CONDITIONS, conditionId || template.conditionId);
  const action = byId(AUTOMATION_ACTIONS, actionId || template.actionId);

  return {
    id: template.id,
    name: template.name,
    status: template.status,
    executionMode: template.executionMode,
    goal: template.goal,
    trigger,
    condition,
    action,
    chain: [
      { type: AUTOMATION_STEP_TYPES.TRIGGER, ...trigger },
      { type: AUTOMATION_STEP_TYPES.CONDITION, ...condition },
      { type: AUTOMATION_STEP_TYPES.ACTION, ...action },
    ],
    summary: `${trigger.label} -> ${condition.label} -> ${action.label}`,
    automationOutcome: `Demo preview: when ${trigger.label.toLowerCase()} occurs and ${condition.label.toLowerCase()}, the rule would ${action.label.toLowerCase()}. No automation is saved, scheduled, or executed from this legacy builder.`,
  };
}

export function buildAutomationRuleLibrary() {
  return AUTOMATION_TEMPLATES.map((template) => buildAutomationRule({ templateId: template.id }));
}

export function validateAutomationRule(rule) {
  return {
    valid: Boolean(rule?.trigger?.id && rule?.condition?.id && rule?.action?.id),
    missing: [
      rule?.trigger?.id ? null : AUTOMATION_STEP_TYPES.TRIGGER,
      rule?.condition?.id ? null : AUTOMATION_STEP_TYPES.CONDITION,
      rule?.action?.id ? null : AUTOMATION_STEP_TYPES.ACTION,
    ].filter(Boolean),
  };
}

export function summarizeAutomationBuilder() {
  return {
    triggers: AUTOMATION_TRIGGERS.length,
    conditions: AUTOMATION_CONDITIONS.length,
    actions: AUTOMATION_ACTIONS.length,
    templates: AUTOMATION_TEMPLATES.length,
  };
}
