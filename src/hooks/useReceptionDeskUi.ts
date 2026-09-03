import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveReceptionDeskUi } from '../config/receptionDeskUiModel';
import {
  resolveReceptionProfileForRole,
  type ReceptionUserProfileDefinition,
} from '../config/receptionUserProfile';
import { getSkillsForArchetype } from '../config/receptionSkillModel';
import { getPersonaUxProfile } from '../design-system/personas/personaUxProfiles';
import type { HospitalRole } from '../lib/users/userTypes';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import useRouteScreenMode from './useRouteScreenMode';

/** Map emergency role ids onto HospitalRole keys used by HPEF persona profiles. */
function personaRoleForEmergencyRole(role: string | null | undefined): HospitalRole | null {
  const normalized = String(role || '')
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized === 'registration_clerk' || normalized === 'emergency_receptionist') {
    return 'registration_clerk';
  }
  if (normalized === 'triage_nurse') return 'triage_nurse';
  if (normalized === 'charge_nurse') return 'charge_nurse';
  if (normalized === 'registered_nurse' || normalized === 'nurse') return 'registered_nurse';
  if (
    normalized === 'emergency_physician' ||
    normalized === 'physician' ||
    normalized === 'attending'
  ) {
    return 'emergency_physician';
  }
  if (normalized === 'paramedic' || normalized === 'ems_user') return 'paramedic';
  if (normalized === 'dispatcher') return 'dispatcher';
  return null;
}

export type ReceptionDeskUiState = ReturnType<typeof resolveReceptionDeskUi> & {
  slim: boolean;
  informationDensity: string;
  personaAiStyle?: string;
  personaPrimaryConcerns: readonly string[];
  showInlineCopilot: boolean;
  showNestedEscalationQuickActions: boolean;
  /** Runtime reception job profile (skills, personalization). */
  staffProfile: ReceptionUserProfileDefinition;
  skillDefinitions: ReturnType<typeof getSkillsForArchetype>;
  lookupBeforeCreateDefault: boolean;
  labelAssistAsDeskNotAi: boolean;
  canUseRegistrationSkills: boolean;
};

export function useReceptionDeskUi(): ReceptionDeskUiState {
  const { role } = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();
  const location = useLocation();
  const isReceptionRoute = location.pathname.startsWith(CANONICAL_ROUTES.emergencyReception);

  return useMemo(() => {
    const desk = resolveReceptionDeskUi({ role, isReceptionRoute, screenMode });
    const staffProfile = resolveReceptionProfileForRole(role);
    const personaRole = personaRoleForEmergencyRole(role);
    const persona = personaRole ? getPersonaUxProfile(personaRole) : undefined;

    const densityFromProfile = staffProfile.personalization.density === 'compact';
    const densityForcedSlim = persona?.informationDensity === 'compact' || densityFromProfile;
    const densityForcedFull =
      persona?.informationDensity === 'spacious' ||
      staffProfile.personalization.density === 'standard'
        ? staffProfile.personalization.density === 'standard' && !densityFromProfile
        : false;
    const slim = densityForcedFull ? false : densityForcedSlim ? true : desk.slim;

    // Volunteers have no registration skills — never show create-oriented chrome.
    const canUseRegistrationSkills = staffProfile.skillIds.length > 0;
    const showCopilot =
      canUseRegistrationSkills &&
      staffProfile.personalization.showInlineCopilot &&
      !slim &&
      desk.showInlineCopilot;

    return {
      ...desk,
      slim,
      informationDensity:
        persona?.informationDensity ||
        staffProfile.personalization.density ||
        (slim ? 'compact' : 'standard'),
      personaAiStyle: persona?.aiInteractionStyle || staffProfile.aiAssistanceLevel,
      personaPrimaryConcerns: persona?.primaryConcerns || staffProfile.responsibilities.slice(0, 4),
      showInlineCopilot: showCopilot,
      showNestedEscalationQuickActions:
        canUseRegistrationSkills && !slim && desk.showNestedEscalationQuickActions,
      staffProfile,
      skillDefinitions: getSkillsForArchetype(staffProfile.id),
      lookupBeforeCreateDefault: staffProfile.personalization.lookupBeforeCreateDefault,
      labelAssistAsDeskNotAi: staffProfile.personalization.labelAssistAsDeskNotAi,
      canUseRegistrationSkills,
    };
  }, [isReceptionRoute, role, screenMode]);
}

export default useReceptionDeskUi;
