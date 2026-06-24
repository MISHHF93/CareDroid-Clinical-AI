/**
 * Heuristic extraction for insurance, medication, allergy, referral, and discharge artifacts.
 */

export type ClinicalArtifactData = Record<string, string>;

function clean(value: string | undefined): string | undefined {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

function labeled(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const pattern = new RegExp(`\\b${label}\\s*[:\\-]\\s*([^\\n;]{2,120})`, 'i');
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return undefined;
}

export function parseInsuranceArtifactText(text = ''): ClinicalArtifactData {
  const normalized = String(text || '');
  return Object.fromEntries(
    Object.entries({
      payerName: labeled(normalized, ['payer', 'insurance', 'carrier', 'plan name']),
      memberId: labeled(normalized, ['member id', 'member number', 'subscriber id', 'policy number']),
      groupId: labeled(normalized, ['group id', 'group number', 'group no']),
      subscriberName: labeled(normalized, ['subscriber', 'member name', 'insured name']),
    }).filter(([, value]) => value),
  ) as ClinicalArtifactData;
}

export function parseMedicationArtifactText(text = ''): ClinicalArtifactData {
  const normalized = String(text || '');
  const medicationLine =
    labeled(normalized, ['medication', 'medications', 'current meds', 'drug']) ||
    normalized
      .split('\n')
      .map((line) => line.trim())
      .find((line) => /\b(mg|mcg|tablet|capsule|bid|tid|daily)\b/i.test(line));

  const medicationName = labeled(normalized, ['medication name', 'drug name', 'name']);
  const dose = labeled(normalized, ['dose', 'dosage', 'strength']);
  const route = labeled(normalized, ['route']);
  const frequency = labeled(normalized, ['frequency', 'sig', 'schedule']);

  const combined =
    medicationLine ||
    [medicationName, dose, route, frequency].filter(Boolean).join(' ').trim() ||
    undefined;

  return Object.fromEntries(
    Object.entries({
      medication: combined,
      medicationName,
      dose,
      route,
      frequency,
    }).filter(([, value]) => value),
  ) as ClinicalArtifactData;
}

export function parseAllergyArtifactText(text = ''): ClinicalArtifactData {
  const normalized = String(text || '');
  const substance = labeled(normalized, ['allergies', 'allergy', 'allergen', 'substance']);
  const reaction = labeled(normalized, ['reaction', 'manifestation']);
  const severity = labeled(normalized, ['severity', 'risk']);
  const combined = [substance, reaction].filter(Boolean).join(' - ');

  return Object.fromEntries(
    Object.entries({
      allergy: combined || substance,
      substance,
      reaction,
      severity,
    }).filter(([, value]) => value),
  ) as ClinicalArtifactData;
}

export function parseReferralArtifactText(text = ''): ClinicalArtifactData {
  const normalized = String(text || '');
  return Object.fromEntries(
    Object.entries({
      chiefComplaint: labeled(normalized, ['chief complaint', 'reason for referral', 'presenting complaint']),
      diagnoses: labeled(normalized, ['diagnosis', 'diagnoses', 'impression']),
      medications: labeled(normalized, ['medications', 'medication', 'current meds']),
      allergies: labeled(normalized, ['allergies', 'allergy']),
      recommendations: labeled(normalized, ['recommendation', 'recommendations', 'plan']),
    }).filter(([, value]) => value),
  ) as ClinicalArtifactData;
}

export function parseDischargeArtifactText(text = ''): ClinicalArtifactData {
  const normalized = String(text || '');
  return Object.fromEntries(
    Object.entries({
      diagnoses: labeled(normalized, ['diagnosis', 'diagnoses', 'discharge diagnosis']),
      medications: labeled(normalized, ['medications', 'medication', 'discharge meds']),
      allergies: labeled(normalized, ['allergies', 'allergy']),
      recommendations: labeled(normalized, ['recommendation', 'recommendations']),
      recentEncounter: labeled(normalized, ['recent encounter', 'admission', 'discharged from']),
      followUpInstructions: labeled(normalized, ['follow up', 'follow-up', 'followup instructions']),
    }).filter(([, value]) => value),
  ) as ClinicalArtifactData;
}

export function parseClinicalArtifactText(parser: string, text = ''): ClinicalArtifactData {
  switch (parser) {
    case 'insurance':
      return parseInsuranceArtifactText(text);
    case 'medication':
      return parseMedicationArtifactText(text);
    case 'allergy':
      return parseAllergyArtifactText(text);
    case 'referral':
      return parseReferralArtifactText(text);
    case 'discharge':
      return parseDischargeArtifactText(text);
    default:
      return {};
  }
}