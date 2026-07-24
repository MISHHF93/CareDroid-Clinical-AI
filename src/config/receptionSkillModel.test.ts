import { describe, expect, it } from 'vitest';
import {
  resolveReceptionNextBestAction,
  RECEPTION_ARCHETYPE_SKILLS,
  RECEPTION_SKILLS,
} from './receptionSkillModel';

const clerkSkills = RECEPTION_ARCHETYPE_SKILLS.registration_clerk;

describe('receptionSkillModel', () => {
  it('defines skills receptionists actually perform (not manager KPIs)', () => {
    expect(RECEPTION_SKILLS.lookup_before_create.surgeCritical).toBe(true);
    expect(RECEPTION_SKILLS.crash_registration.clerkBehavior.toLowerCase()).toContain('nurse');
    expect(RECEPTION_ARCHETYPE_SKILLS.volunteer_greeter).toHaveLength(0);
  });

  it('prioritizes crash registration over lookup when red flags are high', () => {
    const action = resolveReceptionNextBestAction({
      hasDraftComplaint: true,
      hasDraftIdentity: false,
      hasSavedDraft: false,
      redFlagCount: 3,
      urgency: 'critical',
      duplicateHighConfidenceCount: 0,
      duplicateReviewCount: 0,
      verificationQueueCount: 0,
      pretriageQueueCount: 0,
      emsQueueCount: 0,
      lookupQueryEmpty: true,
      lookupResultsCount: 0,
      canCreatePatient: true,
      skillIds: clerkSkills,
    });
    expect(action.skillId).toBe('crash_registration');
    expect(action.tone).toBe('critical');
  });

  it('asks clerks to search before create when the desk is idle', () => {
    const action = resolveReceptionNextBestAction({
      hasDraftComplaint: false,
      hasDraftIdentity: false,
      hasSavedDraft: false,
      redFlagCount: 0,
      urgency: null,
      duplicateHighConfidenceCount: 0,
      duplicateReviewCount: 0,
      verificationQueueCount: 0,
      pretriageQueueCount: 0,
      emsQueueCount: 0,
      lookupQueryEmpty: true,
      lookupResultsCount: 0,
      canCreatePatient: true,
      skillIds: clerkSkills,
    });
    expect(action.skillId).toBe('lookup_before_create');
    expect(action.primaryCta).toBe('lookup');
  });

  it('surfaces high-confidence duplicate resolution before rapid walk-in', () => {
    const action = resolveReceptionNextBestAction({
      hasDraftComplaint: true,
      hasDraftIdentity: true,
      hasSavedDraft: false,
      redFlagCount: 0,
      urgency: 'standard',
      duplicateHighConfidenceCount: 1,
      duplicateReviewCount: 1,
      verificationQueueCount: 0,
      pretriageQueueCount: 0,
      emsQueueCount: 0,
      lookupQueryEmpty: false,
      lookupResultsCount: 1,
      canCreatePatient: true,
      skillIds: clerkSkills,
    });
    expect(action.skillId).toBe('duplicate_resolution');
  });

  it('always attaches an executable primaryCta for actionable desk states', () => {
    const cases = [
      {
        name: 'crash',
        ctx: {
          hasDraftComplaint: true,
          hasDraftIdentity: false,
          hasSavedDraft: false,
          redFlagCount: 2,
          urgency: 'critical' as const,
          duplicateHighConfidenceCount: 0,
          duplicateReviewCount: 0,
          verificationQueueCount: 0,
          pretriageQueueCount: 0,
          emsQueueCount: 0,
          lookupQueryEmpty: true,
          lookupResultsCount: 0,
          canCreatePatient: true,
          skillIds: clerkSkills,
        },
        cta: 'crash',
      },
      {
        name: 'lookup',
        ctx: {
          hasDraftComplaint: false,
          hasDraftIdentity: false,
          hasSavedDraft: false,
          redFlagCount: 0,
          urgency: null,
          duplicateHighConfidenceCount: 0,
          duplicateReviewCount: 0,
          verificationQueueCount: 0,
          pretriageQueueCount: 0,
          emsQueueCount: 0,
          lookupQueryEmpty: true,
          lookupResultsCount: 0,
          canCreatePatient: true,
          skillIds: clerkSkills,
        },
        cta: 'lookup',
      },
      {
        name: 'route',
        ctx: {
          hasDraftComplaint: true,
          hasDraftIdentity: true,
          hasSavedDraft: false,
          redFlagCount: 0,
          urgency: 'standard' as const,
          duplicateHighConfidenceCount: 0,
          duplicateReviewCount: 0,
          verificationQueueCount: 0,
          pretriageQueueCount: 0,
          emsQueueCount: 0,
          lookupQueryEmpty: false,
          lookupResultsCount: 0,
          canCreatePatient: true,
          skillIds: clerkSkills,
        },
        cta: 'route',
      },
      {
        name: 'idle-after-lookup-typed',
        ctx: {
          hasDraftComplaint: false,
          hasDraftIdentity: false,
          hasSavedDraft: false,
          redFlagCount: 0,
          urgency: null,
          duplicateHighConfidenceCount: 0,
          duplicateReviewCount: 0,
          verificationQueueCount: 0,
          pretriageQueueCount: 0,
          emsQueueCount: 0,
          lookupQueryEmpty: false,
          lookupResultsCount: 0,
          canCreatePatient: true,
          skillIds: clerkSkills,
        },
        cta: 'lookup',
      },
    ];

    for (const item of cases) {
      const action = resolveReceptionNextBestAction(item.ctx);
      expect(action.primaryCta, item.name).toBe(item.cta);
    }
  });
});
