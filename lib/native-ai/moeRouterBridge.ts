import type { ClinicalDomainId } from './types';

/**
 * Maps native AI clinical domain specialists to MoE chat-router expert IDs
 * for documentation and copilot pathway alignment.
 */
const DOMAIN_TO_MOE_EXPERT: Partial<Record<ClinicalDomainId, string>> = {
  cardiac_vascular: 'cardiology',
  pulmonary: 'pulmonology',
  gastro_oesophageal: 'gastroenterology',
  musculoskeletal: 'orthopedics',
  psychogenic: 'psychiatry',
  neurology: 'neurology',
  general_emergency: 'emergency-medicine',
};

export function resolveMoeExpertForClinicalDomain(domainId: ClinicalDomainId): string {
  return DOMAIN_TO_MOE_EXPERT[domainId] || 'emergency-medicine';
}

export function resolveMoeExpertsForRouting(domains: ClinicalDomainId[]): string[] {
  return [...new Set(domains.map((domain) => resolveMoeExpertForClinicalDomain(domain)))];
}