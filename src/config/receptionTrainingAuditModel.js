/**
 * Five-minute training rule — reception workflows a new clerk must grasp on day one.
 */

import { RECEPTION_COPY } from '../components/reception/receptionCopy.js';
import {
  RECEPTION_WORKFLOW_PROFILES,
  RECEPTION_TIMING_MS,
} from '../services/receptionThroughputModel.js';

export const RECEPTION_TRAINING_JARGON = Object.freeze([
  'Smart Intake',
  'MPI',
  'OCR',
  'provisional intake',
  'FHIR',
  'HL7',
  'orchestrator',
  'tenant',
]);

export const RECEPTION_TRAINING_WORKFLOWS = Object.freeze([
  Object.freeze({
    id: 'express-walk-in',
    label: RECEPTION_COPY.express.title,
    screens: 2,
    clicks: 3,
    primaryCta: true,
    passesFiveMinuteRule: true,
  }),
  Object.freeze({
    id: 'symptoms-register',
    label: RECEPTION_COPY.quickCreate.title,
    screens: 2,
    clicks: 4,
    primaryCta: false,
    passesFiveMinuteRule: true,
  }),
  Object.freeze({
    id: 'identity-check',
    label: RECEPTION_COPY.identityCheck.title,
    screens: 4,
    clicks: 8,
    primaryCta: false,
    passesFiveMinuteRule: true,
    note: 'Four labeled steps; used for returning patients and ambulance arrivals.',
  }),
  Object.freeze({
    id: 'ambulance-arrival',
    label: RECEPTION_COPY.queues.tabs.ems,
    screens: 2,
    clicks: 6,
    primaryCta: false,
    passesFiveMinuteRule: true,
  }),
]);

const MAX_TRAINING_SCREENS = 4;
const MAX_TRAINING_CLICKS = 8;
const FIVE_MINUTE_RULE_SECONDS = 300;

function estimateWorkflowSeconds(workflow) {
  return (
    workflow.clicks * RECEPTION_TIMING_MS.click +
    workflow.screens * RECEPTION_TIMING_MS.screenTransition +
    2 * RECEPTION_TIMING_MS.fieldEntry
  );
}

export function auditReceptionCopyClarity() {
  const serialized = JSON.stringify(RECEPTION_COPY);
  const jargonHits = RECEPTION_TRAINING_JARGON.filter((term) =>
    new RegExp(term, 'i').test(serialized),
  );

  return Object.freeze({
    usesPlainLanguage: jargonHits.length === 0,
    jargonHits,
    primaryActionLabel: RECEPTION_COPY.workspace.registerWalkIn,
    queueTabsUnderstandable:
      RECEPTION_COPY.queues.tabs.ems.length < 24 &&
      RECEPTION_COPY.queues.tabs.verification.length < 24,
  });
}

export function auditReceptionWorkflowTraining() {
  const workflows = RECEPTION_TRAINING_WORKFLOWS.map((workflow) => {
    const estimatedSeconds = Math.round(estimateWorkflowSeconds(workflow) / 1000);
    const passesFiveMinuteRule =
      workflow.passesFiveMinuteRule &&
      workflow.screens <= MAX_TRAINING_SCREENS &&
      workflow.clicks <= MAX_TRAINING_CLICKS &&
      estimatedSeconds <= FIVE_MINUTE_RULE_SECONDS;

    return Object.freeze({
      ...workflow,
      estimatedSeconds,
      passesFiveMinuteRule,
    });
  });

  const failing = workflows.filter((workflow) => !workflow.passesFiveMinuteRule);

  return Object.freeze({
    workflows,
    failing,
    passesAudit: failing.length === 0,
    harmonizedExpressProfile: RECEPTION_WORKFLOW_PROFILES.harmonized.expressRegister,
  });
}

export function auditReceptionTrainingReadiness() {
  const copy = auditReceptionCopyClarity();
  const workflows = auditReceptionWorkflowTraining();

  return Object.freeze({
    copy,
    workflows,
    passesAudit: copy.usesPlainLanguage && workflows.passesAudit,
    recommendation: workflows.passesAudit
      ? 'Primary walk-in registration is one click; secondary flows use plain labels.'
      : 'Simplify labels and reduce screens for workflows that fail the five-minute rule.',
  });
}
