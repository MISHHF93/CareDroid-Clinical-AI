/**
 * Profile & copilot chrome design language — single source for shell sections,
 * overview card copy, and role-aware copilot labels across all user profiles.
 */
import { CAREDROID_PRODUCT } from './caredroidProduct.config';
import { CANONICAL_ROUTES } from './routes.config';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import type { ProfileCopyStack, ProfileFunctionId } from './userProfileCopyModel';

export type ProfileShellSectionId =
  | 'overview'
  | 'settings'
  | 'preferences'
  | 'tools'
  | 'workspaces'
  | 'security'
  | 'activity';

export type ProfileShellSection = Readonly<{
  id: ProfileShellSectionId;
  label: string;
  path: string;
  pageTitle: string;
  pageSubtitle: string;
}>;

export const PROFILE_SHELL_SECTIONS: readonly ProfileShellSection[] = Object.freeze([
  {
    id: 'overview',
    label: 'Overview',
    path: CANONICAL_ROUTES.profile,
    pageTitle: 'Profile overview',
    pageSubtitle: 'Account snapshot, workspace context, and role-assigned capabilities.',
  },
  {
    id: 'settings',
    label: 'Identity',
    path: CANONICAL_ROUTES.profileSettings,
    pageTitle: 'Identity',
    pageSubtitle: 'Clinical profile and institutional details. Role assignment stays administrator-controlled.',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    path: '/profile/preferences',
    pageTitle: 'Preferences',
    pageSubtitle: 'Theme, density, AI style, citations, and notification preferences.',
  },
  {
    id: 'tools',
    label: 'Tools',
    path: CANONICAL_ROUTES.profileToolPreferences,
    pageTitle: 'Tool preferences',
    pageSubtitle: 'Pin or hide tools within your assigned role. Workspace access is administrator-controlled.',
  },
  {
    id: 'workspaces',
    label: 'Workspaces',
    path: '/profile/workspaces',
    pageTitle: 'Workspaces',
    pageSubtitle: 'Switch active workspace and set your default clinical workspace.',
  },
  {
    id: 'security',
    label: 'Security',
    path: '/profile/security',
    pageTitle: 'Security',
    pageSubtitle: 'Account security summary and sign-in posture.',
  },
  {
    id: 'activity',
    label: 'Activity',
    path: '/profile/activity',
    pageTitle: 'Activity',
    pageSubtitle: 'Safe recent activity across tools, calculators, AI, fleet, and Medical IoT.',
  },
]);

export type ProfileOverviewCardId =
  | 'identity'
  | 'recentTools'
  | 'competency'
  | 'savedTools'
  | 'preferences'
  | 'activity'
  | 'phiVisibility'
  | 'copilot';

export type ProfileOverviewCardCopy = Readonly<{
  title: string;
  subtitle?: string;
  empty?: string;
  ctaLabel?: string;
  ctaPath?: string;
  badge?: string;
}>;

export const PROFILE_OVERVIEW_CARDS: Readonly<Record<ProfileOverviewCardId, ProfileOverviewCardCopy>> =
  Object.freeze({
    identity: Object.freeze({
      title: 'Identity snapshot',
      subtitle: 'Review account details, workspace, and role visibility for your operational profile.',
    }),
    recentTools: Object.freeze({
      title: 'Recent tools',
      empty: 'No recent tools yet.',
      ctaLabel: 'View activity',
      ctaPath: '/profile/activity',
    }),
    competency: Object.freeze({
      title: 'Competency readiness',
      subtitle: 'Training, credentials, and simulation gaps tracked for your role.',
      ctaLabel: 'View competencies',
      ctaPath: '/competencies',
    }),
    savedTools: Object.freeze({
      title: 'Saved tools',
      empty: 'Favorite or pin tools to save them here.',
      ctaLabel: 'Tool preferences',
      ctaPath: CANONICAL_ROUTES.profileToolPreferences,
    }),
    preferences: Object.freeze({
      title: 'Preferences',
      ctaLabel: 'Edit preferences',
      ctaPath: '/profile/preferences',
    }),
    activity: Object.freeze({
      title: 'Recent activity',
      subtitle:
        'Recent account activity comes from your protected audit log endpoint. Admin-only audit logs remain behind role-based access control.',
      badge: 'My logs',
    }),
    phiVisibility: Object.freeze({
      title: 'PHI access visibility',
      subtitle:
        'PHI-marked events and compliance visibility for roles with audit access.',
    }),
    copilot: Object.freeze({
      title: 'CareDroid Copilot',
      subtitle: 'Role-aware capture and workflow assistance.',
      ctaLabel: 'Open CareDroid Copilot',
    }),
  });

export type CopilotChromeLabels = Readonly<{
  productName: string;
  shortName: string;
  openAriaLabel: string;
  openTitle: string;
  navLabel: string;
  unavailableAriaLabel: string;
  unavailableTitle: string;
  placeholder: string;
  messageAriaLabel: string;
  sendAriaLabel: string;
  welcomeCompact: string;
  welcomeFull: string;
}>;

export type ProfileIdentityCardCopy = Readonly<{
  eyebrow: string;
  switchWorkspaceLabel: string;
  syncingLabel: string;
}>;

export type ProfileSettingsIdentityCopy = Readonly<{
  sectionTitle: string;
  sectionDescription: string;
  saveSuccessMessage: string;
}>;

const COPILOT_PRODUCT_NAME = CAREDROID_PRODUCT.copilotName;
const COPILOT_SHORT_NAME = CAREDROID_PRODUCT.copilotBadge;

function resolveRoleCopilotIntro(profileCopy?: ProfileCopyStack | null): string {
  const intro = profileCopy?.copilotIntro?.trim();
  if (intro && !/not available/i.test(intro)) {
    return intro;
  }
  return CAREDROID_PRODUCT.copilotIntro;
}

export function resolveProfileShellSection(
  sectionId: ProfileShellSectionId,
): ProfileShellSection {
  const section = PROFILE_SHELL_SECTIONS.find((item) => item.id === sectionId);
  if (!section) {
    throw new Error(`Unknown profile shell section: ${sectionId}`);
  }
  return section;
}

export function resolveProfileOverviewCard(cardId: ProfileOverviewCardId): ProfileOverviewCardCopy {
  return PROFILE_OVERVIEW_CARDS[cardId];
}

export function resolveProfileIdentityCard(
  profileCopy?: ProfileCopyStack | null,
): ProfileIdentityCardCopy {
  return Object.freeze({
    eyebrow: profileCopy?.workspaceEyebrow || 'Operational profile',
    switchWorkspaceLabel: 'Switch workspace',
    syncingLabel: 'Syncing identity...',
  });
}

export function resolveProfileSettingsIdentityCopy(): ProfileSettingsIdentityCopy {
  return Object.freeze({
    sectionTitle: 'Clinical profile',
    sectionDescription: 'Backend-backed clinical profile and institutional details.',
    saveSuccessMessage:
      'Operational profile saved. Profile, workspace, and audit surfaces now use the latest details.',
  });
}

export function resolveCopilotChromeLabels(
  profileCopy?: ProfileCopyStack | null,
  options: { compactLayout?: boolean } = {},
): CopilotChromeLabels {
  const roleIntro = resolveRoleCopilotIntro(profileCopy);
  const compactLayout = options.compactLayout === true;

  const welcomeCompact = `${roleIntro} Ask about patients, queues, or capacity. ${HUMAN_REVIEW_DISCLAIMER}`;
  const welcomeFull = `${COPILOT_PRODUCT_NAME} is ready. ${roleIntro}`;

  return Object.freeze({
    productName: COPILOT_PRODUCT_NAME,
    shortName: COPILOT_SHORT_NAME,
    openAriaLabel: `Open ${COPILOT_PRODUCT_NAME}`,
    openTitle: `Open ${COPILOT_PRODUCT_NAME} (C)`,
    navLabel: COPILOT_PRODUCT_NAME,
    unavailableAriaLabel: `${COPILOT_PRODUCT_NAME} unavailable`,
    unavailableTitle: `${COPILOT_PRODUCT_NAME} unavailable`,
    placeholder: `Ask ${COPILOT_PRODUCT_NAME}...`,
    messageAriaLabel: `Message ${COPILOT_PRODUCT_NAME}`,
    sendAriaLabel: `Send ${COPILOT_PRODUCT_NAME} message`,
    welcomeCompact: compactLayout ? welcomeCompact : welcomeFull,
    welcomeFull,
  });
}

export function getProfileCopilotWelcomeMessage(
  compactLayout: boolean,
  profileCopy?: ProfileCopyStack | null,
): string {
  const labels = resolveCopilotChromeLabels(profileCopy, { compactLayout });
  return compactLayout ? labels.welcomeCompact : labels.welcomeFull;
}

export function profileHasCopilotCapture(
  profileCopy?: ProfileCopyStack | null,
): boolean {
  return (
    profileCopy?.primaryFunctions?.some(
      (fn) => (fn.id as ProfileFunctionId) === 'copilot-capture',
    ) ?? false
  );
}

export function resolveProfileShellEyebrow(profileCopy?: ProfileCopyStack | null): string {
  return profileCopy?.workspaceEyebrow || 'User profile';
}