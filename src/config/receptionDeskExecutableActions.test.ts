/**
 * Contract: every reception skill CTA and profile path is executable.
 * Guards against decorative “What to do next” buttons with no handler.
 */
import { describe, expect, it } from 'vitest';
import {
  RECEPTION_ARCHETYPE_SKILLS,
  RECEPTION_SKILLS,
  resolveReceptionNextBestAction,
  type ReceptionNextBestAction,
  type ReceptionSkillId,
} from './receptionSkillModel';
import {
  listReceptionUserProfiles,
  resolveReceptionArchetypeFromRole,
  resolveReceptionProfileForRole,
} from './receptionUserProfile';
import { RECEPTION_SKILL_CTA_LABELS } from '../components/reception/ReceptionSkillStrip';
import {
  applyNavigationProposal,
  listPromptNavigationCatalog,
  resolvePromptNavigationIntent,
} from '../services/interactiveAi/promptNavigationIntent';
import { CANONICAL_ROUTES } from './routes.config';

const ALL_CTAS = [
  'lookup',
  'route',
  'crash',
  'resolve_duplicate',
  'ems',
  'resume_draft',
  'clear_shift',
] as const;

const CLERK_SKILLS = RECEPTION_ARCHETYPE_SKILLS.registration_clerk;

function baseCtx(over: Partial<Parameters<typeof resolveReceptionNextBestAction>[0]> = {}) {
  return {
    hasDraftComplaint: false,
    hasDraftIdentity: false,
    hasSavedDraft: false,
    redFlagCount: 0,
    urgency: null as null | 'critical' | 'high' | 'standard',
    duplicateHighConfidenceCount: 0,
    duplicateReviewCount: 0,
    verificationQueueCount: 0,
    pretriageQueueCount: 0,
    emsQueueCount: 0,
    lookupQueryEmpty: true,
    lookupResultsCount: 0,
    canCreatePatient: true,
    skillIds: CLERK_SKILLS,
    ...over,
  };
}

/** Situations that should produce each CTA at least once. */
const CTA_FIXTURES: Array<{
  cta: NonNullable<ReceptionNextBestAction['primaryCta']>;
  ctx: ReturnType<typeof baseCtx>;
}> = [
  {
    cta: 'crash',
    ctx: baseCtx({ redFlagCount: 3, urgency: 'critical', hasDraftComplaint: true }),
  },
  {
    cta: 'resolve_duplicate',
    ctx: baseCtx({
      hasDraftComplaint: true,
      hasDraftIdentity: true,
      duplicateHighConfidenceCount: 1,
      lookupQueryEmpty: false,
    }),
  },
  {
    cta: 'lookup',
    ctx: baseCtx({ lookupQueryEmpty: true }),
  },
  {
    cta: 'resume_draft',
    ctx: baseCtx({
      hasSavedDraft: true,
      hasDraftComplaint: false,
      lookupQueryEmpty: false,
    }),
  },
  {
    cta: 'route',
    ctx: baseCtx({
      hasDraftComplaint: true,
      hasDraftIdentity: true,
      lookupQueryEmpty: false,
    }),
  },
  {
    cta: 'ems',
    ctx: baseCtx({
      emsQueueCount: 2,
      lookupQueryEmpty: false,
      hasDraftComplaint: false,
    }),
  },
  {
    cta: 'clear_shift',
    ctx: baseCtx({
      verificationQueueCount: 5,
      pretriageQueueCount: 5,
      lookupQueryEmpty: false,
      hasDraftComplaint: false,
    }),
  },
];

describe('Reception desk executable actions contract', () => {
  it('skill strip labels cover every primaryCta kind', () => {
    for (const cta of ALL_CTAS) {
      expect(RECEPTION_SKILL_CTA_LABELS[cta], cta).toBeTruthy();
      expect(RECEPTION_SKILL_CTA_LABELS[cta].length).toBeGreaterThan(3);
    }
  });

  it('every CTA fixture resolves to that CTA with a label', () => {
    for (const fixture of CTA_FIXTURES) {
      const action = resolveReceptionNextBestAction(fixture.ctx);
      expect(action.primaryCta, `fixture→${fixture.cta}`).toBe(fixture.cta);
      expect(RECEPTION_SKILL_CTA_LABELS[action.primaryCta!]).toBeTruthy();
    }
  });

  it('registration clerk has the full executable skill pack', () => {
    const required: ReceptionSkillId[] = [
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
    ];
    for (const id of required) {
      expect(CLERK_SKILLS).toContain(id);
      expect(RECEPTION_SKILLS[id].clerkBehavior.length).toBeGreaterThan(10);
    }
  });

  it('volunteer greeter has zero registration skills (no create chrome)', () => {
    expect(RECEPTION_ARCHETYPE_SKILLS.volunteer_greeter).toHaveLength(0);
    const profile = resolveReceptionProfileForRole('volunteer_greeter');
    expect(profile.skillIds).toHaveLength(0);
    expect(profile.allowedActions).toHaveLength(0);
  });

  it('all reception profiles map to a desk route and skill list shape', () => {
    for (const profile of listReceptionUserProfiles()) {
      expect(profile.defaultRoute).toBe(CANONICAL_ROUTES.emergencyReception);
      expect(Array.isArray(profile.skillIds)).toBe(true);
      expect(profile.personalization).toBeTruthy();
    }
  });

  it('role → archetype resolution covers clerk strings', () => {
    expect(resolveReceptionArchetypeFromRole('registration_clerk')).toBe('registration_clerk');
    expect(resolveReceptionArchetypeFromRole('emergency_receptionist')).toBe('registration_clerk');
    expect(resolveReceptionArchetypeFromRole('admissions_officer')).toBe('admissions_officer');
  });
});

describe('Reception prompt → open catalog (desk assist)', () => {
  const PERMS = ['use_ai_chat', 'view_phi', 'view_operations'] as const;

  it('desk-critical open prompts resolve to executable intents', () => {
    const cases = [
      { q: 'Open reception desk', id: 'nav-reception' },
      { q: 'focus patient lookup', id: 'panel-reception-lookup' },
      { q: 'Show OCR document scan', id: 'panel-reception-ocr' },
      { q: 'open shift clearance', id: 'panel-reception-shift-clearance' },
      { q: 'Open the whiteboard', id: 'nav-whiteboard' },
    ];
    for (const c of cases) {
      const intent = resolvePromptNavigationIntent(c.q, {
        role: 'registration_clerk',
        permissions: PERMS,
      });
      expect(intent?.id, c.q).toBe(c.id);
    }
  });

  it('every catalog entry has path or panelEvent and apply does not invent routes', () => {
    const catalog = listPromptNavigationCatalog();
    expect(catalog.length).toBeGreaterThan(10);
    for (const entry of catalog) {
      if (entry.toolName === 'open_panel') {
        expect(entry.panelEvent).toBeTruthy();
        const navigate = viNavigate();
        applyNavigationProposal(
          {
            toolName: 'open_panel',
            validatedArguments: {
              path: entry.path,
              panelEvent: entry.panelEvent,
              label: entry.label,
            },
          },
          {
            navigate,
            currentPath: CANONICAL_ROUTES.emergencyReception,
            dispatchDocumentEvent: () => undefined,
          },
        );
        // on reception: panel only
        expect(navigate.calls).toHaveLength(0);
      } else {
        expect(entry.path?.startsWith('/')).toBe(true);
      }
    }
  });

  it('clerk cannot open clinical HEART score from prompt', () => {
    expect(
      resolvePromptNavigationIntent('open HEART score', {
        role: 'registration_clerk',
        permissions: PERMS,
      }),
    ).toBeNull();
  });
});

function viNavigate() {
  const calls: string[] = [];
  return Object.assign((path: string) => {
    calls.push(path);
  }, { calls });
}
