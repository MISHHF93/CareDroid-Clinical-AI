export const DRUG_REFERENCE_TOOLS = Object.freeze([
  {
    id: 'drug-check',
    name: 'Drug Interaction Checker',
    description: 'Fully built interaction, contraindication, and medication safety checker.',
    status: 'built',
    launchMode: 'route',
    path: '/tools/drug-checker',
    keywords: ['drugs', 'interactions', 'contraindications', 'medication safety'],
  },
  {
    id: 'pediatric-dose-safety-checker',
    name: 'Pediatric Emergency Drug Calculator',
    description: 'Weight or age-based ED quick reference for resuscitation drugs and fluid bolus volumes.',
    status: 'built',
    launchMode: 'calculator',
    path: '/emergency/tools?tool=pediatric-dose-safety-checker',
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

export function builtDrugReferenceToolNames() {
  return DRUG_REFERENCE_TOOLS.filter((tool) => tool.status === 'built').map((tool) => tool.name);
}

export function drugReferenceToolListForCopilot() {
  return builtDrugReferenceToolNames().join(', ') || 'None currently available';
}
