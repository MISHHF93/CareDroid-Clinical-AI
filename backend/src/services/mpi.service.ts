import {
  UnifiedPatient as Patient,
  type IPatientIdentifier,
  type IUnifiedPatient as IPatient,
} from '../models/unified-patient.model';
import { ExtractedDemographics, PatientMatchCandidate } from '../models/SmartIntake';

function normalize(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

export class MPIService {
  async findCandidates(
    demographics: ExtractedDemographics,
    organizationId?: string,
  ): Promise<PatientMatchCandidate[]> {
    const query: Record<string, unknown>[] = [];
    const identifiers = [
      ['mrn', demographics.mrn],
      ['health_card', demographics.healthCardNumber],
      ['external_ehr', demographics.externalEhrId],
      ['referral_source', demographics.referralSourceId],
    ].filter(([, value]) => Boolean(value));

    if (demographics.phone) query.push({ phone: demographics.phone });
    if (demographics.email) query.push({ email: demographics.email });
    if (demographics.dateOfBirth) query.push({ date_of_birth: demographics.dateOfBirth });
    if (identifiers.length) {
      query.push({
        identifiers: {
          $elemMatch: {
            $or: identifiers.map(([type, value]) => ({ type, value })),
          },
        },
      });
    }

    // HEAL-347.49: without this, candidate matching searched EVERY
    // organization's patients -- a staff member at Hospital A could be
    // shown (and could then link an intake session to) Hospital B's real
    // patient record. Own-org-or-legacy-null, same filter shape as the
    // TypeORM side (HEAL-343) -- omitted organizationId preserves the
    // prior unfiltered behavior for callers that don't have tenant context
    // yet, rather than silently returning zero candidates.
    const orgFilter = organizationId
      ? { $or: [{ organizationId }, { organizationId: null }] }
      : null;
    const demographicFilter = query.length ? { $or: query } : null;
    const filter = orgFilter
      ? demographicFilter
        ? { $and: [demographicFilter, orgFilter] }
        : orgFilter
      : (demographicFilter ?? {});

    const patients = query.length
      ? await Patient.find(filter).limit(25)
      : await Patient.find(filter).limit(50);
    return patients
      .map((patient) => this.scorePatient(patient, demographics))
      .filter((candidate) => candidate.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }

  private scorePatient(
    patient: IPatient,
    demographics: ExtractedDemographics,
  ): PatientMatchCandidate {
    const matchedFields: string[] = [];
    const conflictingFields: string[] = [];
    let score = 0;
    const patientNames = splitName(patient.name);

    this.compare(
      'firstName',
      patientNames.firstName,
      demographics.firstName,
      matchedFields,
      conflictingFields,
      () => {
        score += 12;
      },
    );
    this.compare(
      'lastName',
      patientNames.lastName,
      demographics.lastName,
      matchedFields,
      conflictingFields,
      () => {
        score += 16;
      },
    );
    if (
      demographics.previousNames?.some((name) =>
        patient.previous_names.map(normalize).includes(normalize(name)),
      )
    ) {
      matchedFields.push('previousNames');
      score += 8;
    }
    this.compare(
      'dateOfBirth',
      patient.date_of_birth,
      demographics.dateOfBirth,
      matchedFields,
      conflictingFields,
      () => {
        score += 25;
      },
    );
    this.compare(
      'phone',
      patient.phone,
      demographics.phone,
      matchedFields,
      conflictingFields,
      () => {
        score += 12;
      },
    );
    this.compare(
      'email',
      patient.email,
      demographics.email,
      matchedFields,
      conflictingFields,
      () => {
        score += 10;
      },
    );
    this.compare(
      'address',
      patient.address,
      demographics.address,
      matchedFields,
      conflictingFields,
      () => {
        score += 8;
      },
    );
    this.compare('sex', patient.sex, demographics.sex, matchedFields, conflictingFields, () => {
      score += 5;
    });

    score += this.scoreIdentifiers(
      patient.identifiers || [],
      demographics,
      matchedFields,
      conflictingFields,
    );

    const boundedScore = Math.min(100, Math.max(0, score - conflictingFields.length * 5));
    const recommendedAction =
      boundedScore >= 85
        ? 'link_after_staff_confirmation'
        : boundedScore >= 65
          ? 'possible_duplicate_review'
          : boundedScore >= 35
            ? 'manual_review'
            : 'create_new_patient';

    return {
      patientId: String(patient._id),
      displayName: patient.name,
      matchScore: boundedScore,
      matchedFields,
      conflictingFields,
      explanation: `${matchedFields.length} fields matched${conflictingFields.length ? `; conflicts: ${conflictingFields.join(', ')}` : ''}. Staff confirmation required before linking.`,
      recommendedAction,
    };
  }

  private compare(
    field: string,
    patientValue: unknown,
    incomingValue: unknown,
    matchedFields: string[],
    conflictingFields: string[],
    onMatch: () => void,
  ) {
    if (!incomingValue || !patientValue) return;
    if (normalize(patientValue) === normalize(incomingValue)) {
      matchedFields.push(field);
      onMatch();
      return;
    }
    conflictingFields.push(field);
  }

  private scoreIdentifiers(
    identifiers: IPatientIdentifier[],
    demographics: ExtractedDemographics,
    matchedFields: string[],
    conflictingFields: string[],
  ): number {
    let score = 0;
    const checks: Array<[string, string | undefined, number]> = [
      ['mrn', demographics.mrn, 35],
      ['health_card', demographics.healthCardNumber, 35],
      ['external_ehr', demographics.externalEhrId, 20],
      ['referral_source', demographics.referralSourceId, 15],
    ];
    for (const [type, value, weight] of checks) {
      if (!value) continue;
      const sameType = identifiers.filter((identifier) => identifier.type === type);
      if (sameType.some((identifier) => normalize(identifier.value) === normalize(value))) {
        matchedFields.push(type);
        score += weight;
      } else if (sameType.length) {
        conflictingFields.push(type);
      }
    }
    return score;
  }
}

export const mpiService = new MPIService();
