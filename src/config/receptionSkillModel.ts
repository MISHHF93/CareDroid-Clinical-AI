/**
 * Reception Job Skill System — executable skills clerks actually need under load.
 * Skills drive next-best-action, training hints, and desk modes (not manager KPIs).
 */

import type { ReceptionStaffArchetype } from './receptionUserProfile';

export type ReceptionSkillId =
  | 'lookup_before_create'
  | 'rapid_walk_in'
  | 'crash_registration'
  | 'identity_ocr_review'
  | 'duplicate_resolution'
  | 'ems_convert'
  | 'admin_defer'
  | 'shift_clearance'
  | 'language_access'
  | 'interrupt_resume';

export type ReceptionSkillDefinition = Readonly<{
  id: ReceptionSkillId;
  label: string;
  /** Plain language for the desk — what the clerk does. */
  clerkBehavior: string;
  trainingHint: string;
  /** When true, skill should surface as primary CTA under matching conditions. */
  surgeCritical: boolean;
}>;

export const RECEPTION_SKILLS: Readonly<Record<ReceptionSkillId, ReceptionSkillDefinition>> =
  Object.freeze({
    lookup_before_create: {
      id: 'lookup_before_create',
      label: 'Find before create',
      clerkBehavior: 'Search name, date of birth, or health card before opening a new chart.',
      trainingHint: 'Most return visits already have a record. Search first — it is faster than re-typing.',
      surgeCritical: true,
    },
    rapid_walk_in: {
      id: 'rapid_walk_in',
      label: 'Rapid walk-in',
      clerkBehavior: 'Capture complaint and identity, then send to the triage nurse.',
      trainingHint: 'Insurance and full admin can wait. Do not block triage on paperwork.',
      surgeCritical: true,
    },
    crash_registration: {
      id: 'crash_registration',
      label: 'Crash / unknown',
      clerkBehavior: 'When the patient is critical or unknown, send to the nurse immediately.',
      trainingHint: 'Chief complaint or red flags only. Identity can be completed after care starts.',
      surgeCritical: true,
    },
    identity_ocr_review: {
      id: 'identity_ocr_review',
      label: 'Scan ID & review',
      clerkBehavior: 'Scan ID or health card, check confidence, accept or correct fields.',
      trainingHint: 'Never trust OCR blindly. Accept only what you verified with the patient.',
      surgeCritical: false,
    },
    duplicate_resolution: {
      id: 'duplicate_resolution',
      label: 'Resolve possible match',
      clerkBehavior: 'When the system finds a likely match, link or confirm create-new.',
      trainingHint: 'Duplicate charts harm safety. Confirm name and DOB with the patient out loud.',
      surgeCritical: true,
    },
    ems_convert: {
      id: 'ems_convert',
      label: 'Convert ambulance arrival',
      clerkBehavior: 'Turn an arrived EMS unit into a patient on the verification list.',
      trainingHint: 'Use pre-arrival data; do not re-interview the crew for fields you already have.',
      surgeCritical: true,
    },
    admin_defer: {
      id: 'admin_defer',
      label: 'Defer admin',
      clerkBehavior: 'Mark insurance/consent as deferred without blocking the nurse handoff.',
      trainingHint: 'Admin completion is a verification-queue job, not a door-blocking step.',
      surgeCritical: false,
    },
    shift_clearance: {
      id: 'shift_clearance',
      label: 'Clear your lists',
      clerkBehavior: 'Before leaving, empty or hand off ID-check and waiting-for-nurse lists.',
      trainingHint: 'Leftover provisional identities are a night-shift safety risk.',
      surgeCritical: false,
    },
    language_access: {
      id: 'language_access',
      label: 'Language access',
      clerkBehavior: 'Capture preferred language and whether an interpreter is needed.',
      trainingHint: 'Triage and treatment quality depend on language access from the first contact.',
      surgeCritical: false,
    },
    interrupt_resume: {
      id: 'interrupt_resume',
      label: 'Resume draft',
      clerkBehavior: 'After a phone call or interruption, resume the saved intake draft.',
      trainingHint: 'Drafts auto-save locally. Resume instead of starting over.',
      surgeCritical: false,
    },
  });

/** Skills enabled per reception archetype (job analysis, not RBAC). */
export const RECEPTION_ARCHETYPE_SKILLS: Readonly<
  Record<ReceptionStaffArchetype, readonly ReceptionSkillId[]>
> = Object.freeze({
  registration_clerk: [
    'lookup_before_create',
    'rapid_walk_in',
    'crash_registration',
    'identity_ocr_review',
    'duplicate_resolution',
    'ems_convert',
    'admin_defer',
    'shift_clearance',
    'language_access',
    'interrupt_resume',
  ],
  admissions_officer: [
    'lookup_before_create',
    'identity_ocr_review',
    'duplicate_resolution',
    'admin_defer',
    'shift_clearance',
    'language_access',
  ],
  front_desk_coordinator: [
    'lookup_before_create',
    'crash_registration',
    'ems_convert',
    'shift_clearance',
    'duplicate_resolution',
  ],
  patient_access_staff: [
    'lookup_before_create',
    'duplicate_resolution',
    'identity_ocr_review',
    'language_access',
  ],
  volunteer_greeter: [],
});

export type ReceptionNextActionContext = {
  hasDraftComplaint: boolean;
  hasDraftIdentity: boolean;
  hasSavedDraft: boolean;
  redFlagCount: number;
  urgency: 'critical' | 'high' | 'standard' | null;
  duplicateHighConfidenceCount: number;
  duplicateReviewCount: number;
  verificationQueueCount: number;
  pretriageQueueCount: number;
  emsQueueCount: number;
  lookupQueryEmpty: boolean;
  lookupResultsCount: number;
  canCreatePatient: boolean;
  skillIds: readonly ReceptionSkillId[];
};

export type ReceptionNextBestAction = {
  skillId: ReceptionSkillId | 'idle';
  title: string;
  detail: string;
  tone: 'critical' | 'warning' | 'info' | 'neutral';
  primaryCta?: 'lookup' | 'route' | 'crash' | 'resolve_duplicate' | 'ems' | 'resume_draft' | 'clear_shift';
};

function hasSkill(skillIds: readonly ReceptionSkillId[], id: ReceptionSkillId): boolean {
  return skillIds.includes(id);
}

/**
 * Pure next-best-action resolver for the reception desk skill strip.
 * Order reflects ED front-desk priority: crash → high-confidence dupe → lookup → draft → route → queues.
 */
export function resolveReceptionNextBestAction(
  ctx: ReceptionNextActionContext,
): ReceptionNextBestAction {
  const skills = ctx.skillIds;

  if (
    hasSkill(skills, 'crash_registration') &&
    (ctx.urgency === 'critical' || ctx.redFlagCount >= 2)
  ) {
    return {
      skillId: 'crash_registration',
      title: 'Priority: get this patient to the nurse',
      detail:
        'Red flags or critical presentation — complete complaint and send now. Identity can finish later.',
      tone: 'critical',
      primaryCta: 'crash',
    };
  }

  if (hasSkill(skills, 'duplicate_resolution') && ctx.duplicateHighConfidenceCount > 0) {
    return {
      skillId: 'duplicate_resolution',
      title: 'Likely existing chart',
      detail: 'Confirm with the patient whether this is a return visit before creating a new record.',
      tone: 'warning',
      primaryCta: 'resolve_duplicate',
    };
  }

  if (
    hasSkill(skills, 'lookup_before_create') &&
    ctx.lookupQueryEmpty &&
    !ctx.hasDraftIdentity &&
    !ctx.hasDraftComplaint &&
    ctx.canCreatePatient
  ) {
    return {
      skillId: 'lookup_before_create',
      title: 'Search before you create',
      detail: 'Type name, date of birth, or health card. Most people already have a record.',
      tone: 'info',
      primaryCta: 'lookup',
    };
  }

  if (hasSkill(skills, 'interrupt_resume') && ctx.hasSavedDraft && !ctx.hasDraftComplaint) {
    return {
      skillId: 'interrupt_resume',
      title: 'Resume your saved draft',
      detail: 'A registration was interrupted. Continue instead of starting over.',
      tone: 'info',
      primaryCta: 'resume_draft',
    };
  }

  if (
    hasSkill(skills, 'rapid_walk_in') &&
    ctx.hasDraftComplaint &&
    ctx.canCreatePatient &&
    ctx.duplicateReviewCount === 0
  ) {
    return {
      skillId: 'rapid_walk_in',
      title: 'Ready to create & send to nurse',
      detail: 'Complaint captured. Add identity if available, then create & route.',
      tone: 'info',
      primaryCta: 'route',
    };
  }

  if (hasSkill(skills, 'ems_convert') && ctx.emsQueueCount > 0 && !ctx.hasDraftComplaint) {
    return {
      skillId: 'ems_convert',
      title: 'Ambulance patients need registration',
      detail: `${ctx.emsQueueCount} on the ambulance list — convert or complete ID when the unit is ready.`,
      tone: 'warning',
      primaryCta: 'ems',
    };
  }

  if (
    hasSkill(skills, 'shift_clearance') &&
    ctx.verificationQueueCount + ctx.pretriageQueueCount > 8
  ) {
    return {
      skillId: 'shift_clearance',
      title: 'Lists are growing',
      detail: 'Work ID-check and waiting-for-nurse lists so nothing is left hanging for the next shift.',
      tone: 'warning',
      primaryCta: 'clear_shift',
    };
  }

  if (hasSkill(skills, 'duplicate_resolution') && ctx.duplicateReviewCount > 0) {
    return {
      skillId: 'duplicate_resolution',
      title: 'Possible matches to review',
      detail: 'Check the match list before creating a new chart.',
      tone: 'warning',
      primaryCta: 'resolve_duplicate',
    };
  }

  // Always offer an executable CTA when the clerk can act — never a dead “desk ready” with no button.
  if (ctx.canCreatePatient && hasSkill(skills, 'lookup_before_create')) {
    return {
      skillId: 'idle',
      title: 'Desk ready',
      detail: 'Search for a return patient, or start a new walk-in registration.',
      tone: 'neutral',
      primaryCta: 'lookup',
    };
  }

  return {
    skillId: 'idle',
    title: 'Desk ready',
    detail: ctx.canCreatePatient
      ? 'Search for a return patient, or start a new walk-in registration.'
      : 'Your profile cannot create patients. Escalate to a registration clerk.',
    tone: 'neutral',
  };
}

export function getSkillsForArchetype(
  archetype: ReceptionStaffArchetype,
): ReceptionSkillDefinition[] {
  return (RECEPTION_ARCHETYPE_SKILLS[archetype] || []).map((id) => RECEPTION_SKILLS[id]);
}
