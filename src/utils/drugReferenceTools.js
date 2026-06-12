export const DRUG_REFERENCE_TOOLS = Object.freeze([
  {
    id: 'drug-check',
    name: 'Drug Interaction Checker',
    description: 'Fully built interaction, contraindication, and medication safety checker.',
    status: 'built',
    launchMode: 'reference',
    path: '/emergency/copilot?tool=drug-check',
    keywords: ['drugs', 'interactions', 'contraindications', 'medication safety'],
  },
  {
    id: 'pediatric-dose-safety-checker',
    name: 'Pediatric Emergency Drug Calculator',
    description: 'Weight or age-based ED quick reference for resuscitation drugs and fluid bolus volumes.',
    status: 'built',
    launchMode: 'calculator',
    path: '/emergency/copilot?tool=pediatric-dose-safety-checker',
    keywords: ['dose', 'pediatric', 'broselow', 'resuscitation', 'rsi'],
  },
  {
    id: 'antibiotic-dose-guide',
    name: 'Antibiotic Reference / Dose Guide',
    description: 'Coming soon: ED antibiotic reference and dose guide.',
    status: 'coming-soon',
    keywords: ['antibiotic', 'sepsis', 'infection', 'dose'],
  },
  {
    id: 'antidote-reference',
    name: 'Antidote Reference',
    description: 'Coming soon: overdose and toxicology antidote reference.',
    status: 'coming-soon',
    keywords: ['antidote', 'overdose', 'toxicology'],
  },
  {
    id: 'resuscitation-drug-reference',
    name: 'Resuscitation Drug Quick Reference',
    description: 'Coming soon: adult ED resuscitation medication quick-reference.',
    status: 'coming-soon',
    keywords: ['resuscitation', 'adrenaline', 'amiodarone', 'arrest'],
  },
  {
    id: 'anticoagulant-reversal-reference',
    name: 'Anticoagulant Reversal Reference',
    description: 'Coming soon: anticoagulant and antiplatelet reversal reference.',
    status: 'coming-soon',
    keywords: ['reversal', 'anticoagulant', 'warfarin', 'doac', 'bleeding'],
  },
  {
    id: 'iv-fluid-calculator',
    name: 'IV Fluid Calculator',
    description: 'Coming soon: ED IV fluid and maintenance/bolus support.',
    status: 'coming-soon',
    keywords: ['fluid', 'bolus', 'maintenance', 'iv fluids'],
  },
]);

const DRUG_REFERENCE_FEATURE_BY_ID = Object.freeze({
  'drug-check': 'clinical_calculator_hub',
  'pediatric-dose-safety-checker': 'clinical_calculator_hub',
});

export function builtDrugReferenceToolNames(isFeatureEnabled = () => true) {
  return DRUG_REFERENCE_TOOLS.filter((tool) => {
    if (tool.status !== 'built') return false;
    const featureId = DRUG_REFERENCE_FEATURE_BY_ID[tool.id];
    return !featureId || isFeatureEnabled(featureId);
  }).map((tool) => tool.name);
}

export function drugReferenceToolListForCopilot(isFeatureEnabled = () => true) {
  return builtDrugReferenceToolNames(isFeatureEnabled).join(', ') || 'None currently available';
}
