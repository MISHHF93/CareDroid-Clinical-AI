export const PREDICTIVE_ANALYTICS_MODEL_TYPES = Object.freeze([
  'deterioration-risk',
  'readmission-risk',
  'sepsis-risk',
  'icu-transfer-risk',
  'device-failure-risk',
  'fleet-maintenance-risk',
]);

export const DEMO_PREDICTIVE_ANALYTICS_MODELS = Object.freeze([
  {
    id: 'deterioration-risk',
    title: 'Deterioration risk',
    domain: 'Clinical surveillance',
    score: 72,
    band: 'high',
    confidence: 0.81,
    horizon: 'Next 6 hours',
    modelStatus: 'demo-model',
    signals: ['NEWS2 trend rising', 'Oxygen requirement increased', 'Tachycardia persistent'],
    recommendedActions: ['Recheck vitals within 30 minutes', 'Review escalation protocol', 'Consider clinician bedside reassessment'],
    linkedPath: '/clinical-decision-support',
  },
  {
    id: 'readmission-risk',
    title: 'Readmission risk',
    domain: 'Care transitions',
    score: 58,
    band: 'moderate',
    confidence: 0.74,
    horizon: '30 days',
    modelStatus: 'demo-model',
    signals: ['Recent discharge', 'Comorbidity burden', 'Medication changes pending reconciliation'],
    recommendedActions: ['Confirm follow-up appointment', 'Review discharge instructions', 'Medication reconciliation before discharge'],
    linkedPath: '/documentation',
  },
  {
    id: 'sepsis-risk',
    title: 'Sepsis risk',
    domain: 'Emergency and inpatient care',
    score: 76,
    band: 'high',
    confidence: 0.83,
    horizon: 'Current encounter',
    modelStatus: 'demo-model',
    signals: ['Suspected infection', 'Lactate elevated', 'qSOFA context positive'],
    recommendedActions: ['Open sepsis protocol', 'Trend lactate', 'Consider escalation if hypotension persists'],
    linkedPath: '/protocols',
  },
  {
    id: 'icu-transfer-risk',
    title: 'ICU transfer risk',
    domain: 'Capacity and escalation',
    score: 64,
    band: 'moderate',
    confidence: 0.78,
    horizon: 'Next 12 hours',
    modelStatus: 'demo-model',
    signals: ['Increasing oxygen support', 'Abnormal labs', 'Escalation protocol triggered'],
    recommendedActions: ['Notify charge nurse', 'Review bed capacity', 'Prepare handoff if escalation criteria persist'],
    linkedPath: '/hospital-map',
  },
  {
    id: 'device-failure-risk',
    title: 'Device failure risk',
    domain: 'Medical IoT',
    score: 69,
    band: 'high',
    confidence: 0.8,
    horizon: 'Next 24 hours',
    modelStatus: 'demo-model',
    signals: ['Battery degradation', 'Telemetry dropouts', 'Recent alarm frequency increased'],
    recommendedActions: ['Inspect device', 'Check backup availability', 'Review alarm event history'],
    linkedPath: '/medical-iot',
  },
  {
    id: 'fleet-maintenance-risk',
    title: 'Fleet maintenance risk',
    domain: 'Fleet operations',
    score: 61,
    band: 'moderate',
    confidence: 0.76,
    horizon: 'Next 7 days',
    modelStatus: 'demo-model',
    signals: ['Mileage threshold approaching', 'Delayed service window', 'Fault code trend rising'],
    recommendedActions: ['Schedule inspection window', 'Review fault codes', 'Check replacement vehicle coverage'],
    linkedPath: '/fleet/predictive-maintenance',
  },
]);

export function resolvePredictiveRiskBand(score) {
  if (score >= 75) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 45) return 'moderate';
  return 'low';
}

export function buildPredictiveAnalyticsSummary(models = DEMO_PREDICTIVE_ANALYTICS_MODELS) {
  const highestRisk = [...models].sort((a, b) => b.score - a.score)[0];
  const highOrCritical = models.filter((model) => ['high', 'critical'].includes(model.band));
  const averageScore = Math.round(models.reduce((total, model) => total + model.score, 0) / models.length);

  return {
    sourceStatus: 'demo-models',
    predictionLabel: 'Demo predictions - not live patient, device, or fleet data',
    modelCount: models.length,
    highestRisk,
    highOrCriticalCount: highOrCritical.length,
    averageScore,
  };
}

export function searchPredictiveModels(query = '', models = DEMO_PREDICTIVE_ANALYTICS_MODELS) {
  const normalizedQuery = String(query).trim().toLowerCase();
  if (!normalizedQuery) return models;

  return models.filter((model) =>
    [
      model.title,
      model.domain,
      model.band,
      model.horizon,
      ...model.signals,
      ...model.recommendedActions,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function buildPredictiveAnalyticsAiPrompt(model) {
  const selected = model || DEMO_PREDICTIVE_ANALYTICS_MODELS[0];
  return [
    `Explain this predictive analytics card: ${selected.title}.`,
    `Prediction score: ${selected.score}/100 (${selected.band}).`,
    `Horizon: ${selected.horizon}. Confidence: ${Math.round(selected.confidence * 100)}%.`,
    `Signals: ${selected.signals.join(', ')}.`,
    `Recommended review actions: ${selected.recommendedActions.join(', ')}.`,
    'State clearly that these are demo predictions and clinical/operations decision support only.',
  ].join('\n');
}
