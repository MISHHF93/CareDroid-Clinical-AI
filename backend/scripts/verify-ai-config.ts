import {
  AIConfigRegistry,
  AISafetyRules,
  PromptTemplateRegistry,
} from '../src/config/ai-governance.registry';

const errors: string[] = [];

for (const [id, config] of Object.entries(AIConfigRegistry)) {
  if (!config.name) errors.push(`${id}: missing name`);
  if (!config.provider) errors.push(`${id}: missing provider`);
  if (!config.model) errors.push(`${id}: missing model`);
  if (!config.purpose) errors.push(`${id}: missing purpose`);
  if (!Array.isArray(config.safetyConstraints) || config.safetyConstraints.length === 0) {
    errors.push(`${id}: missing safety constraints`);
  }
  if (config.requiresHumanReview && config.auditLevel === 'none') {
    errors.push(`${id}: human-reviewed services must use basic or full audit`);
  }
}

for (const [id, template] of Object.entries(PromptTemplateRegistry)) {
  const matches = template.template.match(/{{([^}]+)}}/g) || [];
  const usedVariables = matches.map((match) => match.slice(2, -2));
  const missingVars = template.variables.filter((variable) => !usedVariables.includes(variable));
  if (missingVars.length > 0) {
    errors.push(`${id}: variables defined but not used: ${missingVars.join(', ')}`);
  }
  if (
    !template.template.includes('Human review required') &&
    !template.template.includes('requires human review') &&
    !template.template.includes('requires clinician review')
  ) {
    errors.push(`${id}: missing human review disclaimer`);
  }
}

if (!AISafetyRules.requiredDisclaimers.some((disclaimer) => /Human review required/i.test(disclaimer))) {
  errors.push('AISafetyRules: missing Human review required disclaimer');
}

if (errors.length > 0) {
  console.error('AI configuration verification failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`AI configuration verification passed (${Object.keys(AIConfigRegistry).length} services, ${Object.keys(PromptTemplateRegistry).length} prompt templates).`);
