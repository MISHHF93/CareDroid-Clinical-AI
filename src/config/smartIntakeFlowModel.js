/**
 * Smart Intake flow audit — clicks, screen transitions, verification friction.
 * Node-safe metrics model for QA scripts and in-app guidance.
 */

export const SMART_INTAKE_INTERNAL_STEPS = Object.freeze([
  'start',
  'capture',
  'ocr',
  'match',
  'verify',
  'finalize',
]);

export const SMART_INTAKE_STREAMLINED_STEPS = Object.freeze([
  'Document & details',
  'Find match',
  'Confirm fields',
  'Finish',
]);

export const SMART_INTAKE_STEP_INDEX = Object.freeze({
  start: 0,
  capture: 1,
  ocr: 2,
  match: 3,
  verify: 4,
  finalize: 5,
});

export const SMART_INTAKE_CLICK_BUDGET = Object.freeze({
  baselinePerFieldReview: 3,
  streamlinedPerFieldReview: 1,
  baselineSessionStart: 1,
  baselineStepNavigation: 5,
  baselineFinalize: 2,
});

const FIELD_COUNT = 8;
const REQUIRED_IDENTITY_FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'healthCardNumber'];

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function mapInternalStepToStreamlined(internalStep) {
  if (internalStep <= 0) return 0;
  if (internalStep <= 2) return 0;
  if (internalStep === 3) return 1;
  if (internalStep === 4) return 2;
  return 3;
}

export function resolveSmartIntakeStartStep({
  intakeStep = '',
  contextPatientId = '',
  autostart = false,
  hasBoardPatient = false,
} = {}) {
  if (intakeStep === 'verify' || (contextPatientId && hasBoardPatient)) {
    return SMART_INTAKE_STEP_INDEX.verify;
  }
  if (intakeStep === 'match') return SMART_INTAKE_STEP_INDEX.match;
  if (intakeStep === 'capture' || intakeStep === 'ocr') return SMART_INTAKE_STEP_INDEX.capture;
  if (intakeStep === 'finalize') return SMART_INTAKE_STEP_INDEX.finalize;
  if (autostart) return SMART_INTAKE_STEP_INDEX.capture;
  return SMART_INTAKE_STEP_INDEX.start;
}

export function resolveSmartIntakeContinueStep(activeStep, { verificationComplete = false } = {}) {
  if (activeStep <= SMART_INTAKE_STEP_INDEX.start) return SMART_INTAKE_STEP_INDEX.capture;
  if (activeStep === SMART_INTAKE_STEP_INDEX.capture) return SMART_INTAKE_STEP_INDEX.match;
  if (activeStep === SMART_INTAKE_STEP_INDEX.ocr) return SMART_INTAKE_STEP_INDEX.match;
  if (activeStep === SMART_INTAKE_STEP_INDEX.match) return SMART_INTAKE_STEP_INDEX.verify;
  if (activeStep === SMART_INTAKE_STEP_INDEX.verify) {
    return verificationComplete ? SMART_INTAKE_STEP_INDEX.finalize : SMART_INTAKE_STEP_INDEX.verify;
  }
  return activeStep;
}

export function canContinueSmartIntakeStep(
  activeStep,
  {
    sessionReady = false,
    selectedCandidateId = null,
    verificationComplete = false,
    documentCaptured = false,
  } = {},
) {
  if (activeStep === SMART_INTAKE_STEP_INDEX.start) return sessionReady;
  if (activeStep === SMART_INTAKE_STEP_INDEX.capture) return sessionReady || documentCaptured;
  if (activeStep === SMART_INTAKE_STEP_INDEX.ocr) return true;
  if (activeStep === SMART_INTAKE_STEP_INDEX.match) return Boolean(selectedCandidateId);
  if (activeStep === SMART_INTAKE_STEP_INDEX.verify) return verificationComplete;
  return false;
}

export function buildAutoApprovedFieldDecisions(fields = [], boardPatient = null) {
  const patientFieldMap = {
    firstName: boardPatient?.firstName,
    lastName: boardPatient?.lastName,
    dateOfBirth: boardPatient?.dob,
    sex: boardPatient?.sex,
    phone: boardPatient?.phone || boardPatient?.mobilePhone,
    healthCardNumber: boardPatient?.healthCardNumber || boardPatient?.healthCard || boardPatient?.mrn,
    address: boardPatient?.address,
  };

  return Object.fromEntries(
    fields.map((field) => {
      const extracted = String(field.extracted || '').trim();
      const existing = String(field.existing || patientFieldMap[field.field] || '').trim();
      if (extracted && existing && normalize(extracted) === normalize(existing)) {
        return [field.field, 'verified'];
      }
      if (field.status === 'verified') return [field.field, 'verified'];
      return [field.field, field.status === 'conflicting' ? 'conflicting' : 'unverified'];
    }),
  );
}

export function countBulkApprovableFields(fields = [], fieldDecisions = {}) {
  return fields.filter((field) => {
    const decision = fieldDecisions[field.field] || field.status;
    if (['verified', 'overridden'].includes(decision)) return false;
    const extracted = String(field.extracted || '').trim();
    const existing = String(field.existing || '').trim();
    return extracted && existing && normalize(extracted) === normalize(existing);
  }).length;
}

export function measureSmartIntakePath({
  path = 'baseline',
  fieldCount = FIELD_COUNT,
  conflictingFieldCount = 2,
  usesBulkApprove = false,
  skipsIntro = false,
  skipsOcrTransition = false,
  usesContinueButton = false,
} = {}) {
  const identityFieldCount = REQUIRED_IDENTITY_FIELDS.length;
  const reviewFieldCount = Math.max(0, fieldCount - identityFieldCount);
  const perFieldClicks = usesBulkApprove
    ? SMART_INTAKE_CLICK_BUDGET.streamlinedPerFieldReview
    : SMART_INTAKE_CLICK_BUDGET.baselinePerFieldReview;

  const introClicks = skipsIntro ? 0 : 1;
  const sessionStartClicks = skipsIntro ? 0 : SMART_INTAKE_CLICK_BUDGET.baselineSessionStart;
  const stepNavigationClicks = usesContinueButton
    ? SMART_INTAKE_STREAMLINED_STEPS.length - 1
    : SMART_INTAKE_CLICK_BUDGET.baselineStepNavigation;
  const ocrTransitionClicks = skipsOcrTransition ? 0 : 1;
  const conflictingReviewClicks = conflictingFieldCount * perFieldClicks;
  const matchingBulkClicks = usesBulkApprove ? 1 : (reviewFieldCount - conflictingFieldCount) * perFieldClicks;
  const finalizeClicks = SMART_INTAKE_CLICK_BUDGET.baselineFinalize;

  const clicks =
    introClicks +
    sessionStartClicks +
    stepNavigationClicks +
    ocrTransitionClicks +
    matchingBulkClicks +
    conflictingReviewClicks +
    finalizeClicks;

  const transitions = usesContinueButton
    ? SMART_INTAKE_STREAMLINED_STEPS.length
    : SMART_INTAKE_INTERNAL_STEPS.length;

  const frictionScore = Math.round(
    clicks * 0.45 +
      transitions * 4 +
      conflictingFieldCount * 6 +
      (path === 'baseline' ? 12 : 0),
  );

  return {
    path,
    clicks,
    transitions,
    frictionScore,
    breakdown: {
      introClicks,
      sessionStartClicks,
      stepNavigationClicks,
      ocrTransitionClicks,
      matchingBulkClicks,
      conflictingReviewClicks,
      finalizeClicks,
    },
  };
}

export function auditSmartIntakeFlow() {
  const baseline = measureSmartIntakePath({ path: 'baseline' });
  const optimized = measureSmartIntakePath({
    path: 'optimized',
    usesBulkApprove: true,
    skipsIntro: true,
    skipsOcrTransition: true,
    usesContinueButton: true,
  });

  return {
    baseline,
    optimized,
    clickReduction: baseline.clicks - optimized.clicks,
    transitionReduction: baseline.transitions - optimized.transitions,
    frictionReduction: baseline.frictionScore - optimized.frictionScore,
    passesAudit: optimized.clicks <= baseline.clicks * 0.55 && optimized.frictionScore < baseline.frictionScore,
  };
}

export const SMART_INTAKE_SURFACE_REGISTRY = Object.freeze([
  { id: 'smart-intake-page', measures: ['clicks', 'transitions', 'friction'] },
  { id: 'reception-overlay', measures: ['clicks', 'transitions', 'friction'] },
  { id: 'identity-field-review', measures: ['clicks'] },
  { id: 'verification-experience', measures: ['transitions'] },
]);
