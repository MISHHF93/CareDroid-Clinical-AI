import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from './ThemeContext';
import { useToolPreferences } from './ToolPreferencesContext';
import { useUser } from './UserContext';
import { useTenantContext } from './TenantContext';
import { useWorkspace } from './WorkspaceContext';
import { UserIdentityApi } from '../services/userIdentityApi';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { readLocalClientProfile } from '../config/workspace.config';
import { fetchMemoryFabricContext, LOCAL_MEMORY_FABRIC_CONTEXT } from '../services/memoryApi';
import { setPlatformEntitlementContext } from '../data/assetEntitlements';
import logger from '../utils/logger';
import { enrichDemoIdentityFallback } from '../config/demoPersonaModel';
import type { UserProfileAccessSummary } from '../config/userProfileCatalog';

const BACKEND_TO_LOCAL_WORKSPACE = {
  personal: 'emergency',
  hospital: 'operations',
  emergency: 'emergency',
  icu: 'icu',
  cardiology: 'cardiology',
  laboratory: 'laboratory',
  pharmacy: 'pharmacy',
  operations: 'operations',
  fleet: 'fleet',
  'medical-iot': 'medical-iot',
  education: 'education',
  research: 'research',
  governance: 'governance',
  admin: 'governance',
};

const DEFAULT_SAAS_PROFILE = Object.freeze({
  organizationType: 'hospital',
  role: 'student',
  defaultWorkspace: 'emergency',
  allowedWorkspaces: ['emergency', 'icu', 'cardiology', 'laboratory', 'operations'],
  permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  subscriptionEntitlements: ['core-platform'],
  enabledAssetPacks: ['core-platform'],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
  preferredAIStyle: 'concise',
  themePreference: 'light',
  density: 'standard',
  compactMode: false,
  onboardingStatus: 'complete',
});

// ---------------------------------------------------------------------------
// Sub-interfaces used by UserIdentityContextValue
// ---------------------------------------------------------------------------

/** Accessibility toggles within user preferences. */
interface AccessibilitySettings {
  /** Reduce motion effects for users with vestibular disorders. */
  reduceMotion?: boolean;
  /** Enable high-contrast colour scheme. */
  highContrast?: boolean;
  /** UI scale factor or preset label (e.g. 'default', 'large'). */
  fontScale?: string;
}

/** Calculator-level user preferences. */
interface CalculatorPreferences {
  /** IDs of calculators the user has pinned to quick access. */
  pinnedCalculatorIds?: string[];
  /** Default unit system — 'metric' or 'imperial'. */
  defaultUnits?: string;
  /** Whether the calculator should remember previous inputs. */
  rememberInputs?: boolean;
}

/** Per-tool preference overrides. */
interface ToolPreferencesProfile {
  /** IDs of tools the user has marked as favourites. */
  favoriteToolIds?: string[];
  /** IDs of tools pinned to quick access. */
  pinnedToolIds?: string[];
  /** IDs of recently used tools. */
  recentToolIds?: string[];
  /** IDs of tools the user has hidden. */
  hiddenToolIds?: string[];
  /** IDs of assets the user has hidden (alternate accessor). */
  hiddenAssetIds?: string[];
  /** IDs of assets pinned to quick access (alternate accessor). */
  pinnedAssetIds?: string[];
  /** IDs of recently accessed assets (alternate accessor). */
  recentAssetIds?: string[];
  /** Arbitrary per-tool settings keyed by tool ID. */
  profileSettings?: Record<string, unknown>;
}

/** AI assistant personalisation options. */
interface AiAssistantPreferences {
  /** Response verbosity — 'concise', 'detailed', etc. */
  responseStyle?: string;
  /** How many citations to include — 'none', 'standard', 'full'. */
  citationLevel?: string;
  /** Clinical safety tone — 'standard', 'empathetic', etc. */
  safetyTone?: string;
}

/** User display & workflow preferences. */
interface UserPreferences {
  /** Active UI theme — 'light', 'dark', 'system'. */
  theme?: string;
  /** Preferred language code (e.g. 'en'). */
  language?: string;
  /** Default dashboard landing page. */
  defaultDashboard?: string;
  /** Density preset — 'compact' or 'standard'. */
  density?: string;
  /** Whether compact mode is enabled. */
  compactMode?: boolean;
  /** Accessibility overrides. */
  accessibility?: AccessibilitySettings;
  /** Calculator preferences. */
  calculatorPreferences?: CalculatorPreferences;
  /** Per-tool preference overrides. */
  toolPreferences?: ToolPreferencesProfile;
  /** AI assistant options. */
  aiAssistantPreferences?: AiAssistantPreferences;
  /** Notification delivery preferences keyed by channel/type. */
  notificationSettings?: Record<string, unknown>;
}

/** User account / identity card. */
interface UserAccount {
  /** Internal user identifier. */
  userId: string;
  /** Displayed name (may include title). */
  displayName: string;
  /** Primary email address. */
  email: string;
  /** URL of the user's avatar image. */
  avatarUrl?: string;
  /** Professional discipline (e.g. 'Emergency Medicine'). */
  profession?: string;
  /** Clinical specialty. */
  specialty?: string;
  /** Organisation or institution name. */
  organization?: string;
  /** Department within the organisation. */
  department?: string;
  /** Backend role key (e.g. 'student', 'physician'). */
  role: string;
  /** Hospital-specific role label. */
  hospitalRole?: string;
  /** Emergency-department role identifier. */
  emergencyRoleId?: string;
  /** SaaS-level role key. */
  saasRole?: string;
  /** Catalogue role-profile ID. */
  roleProfileId?: string;
  /** Country code or name. */
  country?: string;
  /** IANA timezone string. */
  timezone?: string;
  /** Preferred language code. */
  language?: string;
  /** Whether the user's email has been verified. */
  verified: boolean;
  /** Trust / reputation score (0-100). */
  trustScore?: number;
}

/** Professional credentials and specialisation metadata. */
interface ProfessionalProfile {
  /** Active credentials / licences. */
  credentials?: string[];
  /** Board certifications. */
  certifications?: string[];
  /** Clinical specialties. */
  specialties?: string[];
  /** Experience tier — 'junior', 'mid', 'senior'. */
  experienceLevel?: string;
  /** Areas of clinical research interest. */
  clinicalInterests?: string[];
  /** Licence / registration number. */
  licenseNumber?: string;
}

/** Workspace definition. */
interface Workspace {
  /** Canonical workspace identifier. */
  id: string;
  /** Workspace category — 'personal', 'hospital', 'fleet', etc. */
  type: string;
  /** Human-readable workspace name. */
  name: string;
  /** Alternate key used by the SaaS layer. */
  workspaceKey?: string;
  /** Branding overrides for the workspace. */
  branding?: {
    /** Display name shown in chrome. */
    displayName?: string;
  };
  /** Workspace-level defaults. */
  settings?: {
    /** Default dashboard view for this workspace. */
    defaultDashboard?: string;
    /** Tool IDs enabled in this workspace. */
    enabledToolIds?: string[];
    /** Module IDs enabled in this workspace. */
    enabledModules?: string[];
  };
  /** Full workspace profile from the registry. */
  workspaceProfile?: {
    /** Workspace description. */
    description?: string;
    /** Default dashboard widgets for this workspace. */
    defaultDashboardWidgets?: string[];
    /** Additional workspace-profile fields. */
    [key: string]: unknown;
  };
  /** Default dashboard widgets (alternate accessor). */
  defaultDashboardWidgets?: string[];
}

/** Workspace-level identity state. */
interface WorkspaceState {
  /** Currently active workspace ID. */
  activeWorkspaceId: string;
  /** Ordered list of recently visited workspace IDs. */
  recentWorkspaceIds?: string[];
  /** All workspaces available to the user. */
  workspaces?: Workspace[];
  /** The currently active workspace object. */
  activeWorkspace?: Workspace;
  /** Team / group memberships in the workspace. */
  memberships?: unknown[];
  /** Permission keys effective in the active workspace. */
  effectivePermissions?: string[];
  /** Teams linked to the user in this workspace. */
  linkedTeams?: unknown[];
}

/** A single activity item (recent tool, chat, etc.). */
interface ActivityItem {
  /** Unique identifier of the item. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Optional route for deep-linking. */
  route?: string;
  /** Arbitrary metadata (e.g. toolId). */
  metadata?: Record<string, unknown>;
  /** ISO-8601 timestamp of when the activity occurred. */
  occurredAt?: string;
}

/** User activity across the platform. */
interface UserActivity {
  /** Recently used calculators. */
  recentCalculators?: ActivityItem[];
  /** Recently used tools. */
  recentTools?: ActivityItem[];
  /** Recent AI assistant conversations. */
  recentAiChats?: ActivityItem[];
  /** Recent fleet-management activity. */
  recentFleetActivity?: ActivityItem[];
  /** Recent medical-IoT activity. */
  recentIotActivity?: ActivityItem[];
}

/** A recommended workflow item. */
interface RecommendedWorkflow {
  /** Unique workflow identifier. */
  id?: string;
  /** Display title. */
  title?: string;
  /** Why this workflow is recommended. */
  reason?: string;
  /** Additional workflow metadata. */
  [key: string]: unknown;
}

/** AI copilot personalisation state. */
interface AiPersonalization {
  /** Preferred copilot behaviour mode. */
  preferredBehavior?: string;
  /** User-saved prompt templates. */
  savedPrompts?: unknown[];
  /** Recently used prompts. */
  recentPrompts?: unknown[];
  /** Tool IDs recommended by the AI for this user. */
  suggestedTools?: string[];
  /** Workflow templates recommended to the user. */
  recommendedWorkflows?: RecommendedWorkflow[];
}

/** Security context for the current user. */
interface SecurityContext {
  /** Whether the user's email is verified. */
  emailVerified?: boolean;
  /** Effective role key. */
  role?: string;
  /** Whether multi-factor authentication is enabled. */
  mfaEnabled?: boolean;
  /** ISO-8601 timestamp of the last successful login. */
  lastLoginAt?: string;
}

/** A single audit-log event. */
interface AuditEvent {
  /** Unique event identifier. */
  id: string;
  /** Action type (e.g. 'PHI_ACCESS', 'LOGIN'). */
  action?: string;
  /** ISO-8601 timestamp. */
  timestamp?: string;
  /** Whether the event involved protected health information. */
  phiAccessed?: boolean;
}

/** Audit state exposed to the UI. */
interface AuditState {
  /** Most recent audit events. */
  recentEvents?: AuditEvent[];
}

/** SaaS-level profile projection. */
interface SaasProfile {
  /** Internal user ID. */
  userId?: string;
  /** Organisation identifier (UUID). */
  organizationId?: string | null;
  /** Organisation category — 'hospital', 'emergency', etc. */
  organizationType?: string;
  /** Name displayed in UI chrome. */
  displayName?: string;
  /** Contact email. */
  email?: string;
  /** SaaS role key (e.g. 'emergency-physician'). */
  role?: string;
  /** SaaS role key (alternate accessor — some backend shapes use this). */
  saasRole?: string;
  /** Clinical specialty label. */
  specialty?: string;
  /** Department label. */
  department?: string;
  /** Default workspace ID for this user. */
  defaultWorkspace?: string;
  /** Workspace IDs the user may access. */
  allowedWorkspaces?: string[];
  /** Top-level permission keys. */
  permissions?: string[];
  /** Entitled subscription SKUs. */
  subscriptionEntitlements?: string[];
  /** Enabled asset-pack IDs. */
  enabledAssetPacks?: string[];
  /** Pinned asset IDs for quick access. */
  pinnedAssets?: string[];
  /** Hidden asset IDs. */
  hiddenAssets?: string[];
  /** Recently accessed asset IDs. */
  recentAssets?: string[];
  /** Preferred AI response style. */
  preferredAIStyle?: string;
  /** UI theme preference. */
  themePreference?: string;
  /** Density preset — 'compact' or 'standard'. */
  density?: string;
  /** Whether compact mode is active. */
  compactMode?: boolean;
  /** Onboarding completion status. */
  onboardingStatus?: string;
}

/** Minimal shape for the effective profile returned by the backend. */
interface EffectiveProfile {
  /** SaaS role key derived from the backend. */
  saasRole?: string;
  /** Emergency-department role ID, if resolved. */
  emergencyRoleId?: string;
  /** Additional fields returned by the backend are permitted. */
  [key: string]: unknown;
}

/** Platform context returned by the platform-assets API. */
interface PlatformContext {
  /** Organisation record. */
  organization?: {
    /** Organisation UUID. */
    id?: string;
    /** Organisation name. */
    name?: string;
    /** Organisation type (e.g. 'hospital'). */
    type?: string;
    /** Organisation type (alternate accessor used by some consumers). */
    organizationType?: string;
    /** Slug for URL-friendly identification. */
    slug?: string;
    /** Additional fields from the backend. */
    [key: string]: unknown;
  } | null;
  /** Active role-profile projection. */
  roleProfile?: {
    /** Role-profile identifier. */
    id?: string;
    /** Asset IDs hidden by this role profile. */
    hiddenAssetIds?: string[];
    /** Pack IDs allowed by this role profile. */
    allowedPacks?: string[];
    /** Additional role-profile fields. */
    [key: string]: unknown;
  } | null;
  /** Asset IDs the user is entitled to. */
  entitledAssetIds?: string[];
  /** Pack IDs the user is entitled to. */
  entitledPackIds?: string[];
  /** Entitled pack objects (full records, not just IDs). */
  entitledPacks?: Array<{ id?: string; name?: string; [key: string]: unknown }>;
  /** All available packs in the platform. */
  availablePacks?: Array<{ id?: string; name?: string; enabled?: boolean; assetIds?: string[]; [key: string]: unknown }>;
  /** Default AI agent ID for the platform context. */
  defaultAiAgentId?: string;
  /** AI agents available in the platform context. */
  aiAgents?: Array<{ id?: string; name?: string; title?: string; [key: string]: unknown }>;
  /** Membership metadata from the platform. */
  membership?: {
    /** Role-profile ID from the membership. */
    roleProfileId?: string;
    /** Additional membership fields. */
    [key: string]: unknown;
  };
  /** Resolved SaaS role from the platform context. */
  saasRole?: string;
  /** Whether strict SaaS entitlement enforcement is active. */
  strictSaasEntitlements?: boolean;
  /** Any additional platform-context fields. */
  [key: string]: unknown;
}

/** Memory-fabric context from the memory API. */
interface MemoryFabricContext {
  /** ISO-8601 timestamp of context generation. */
  generatedAt: string | null;
  /** Tenant-level memory. */
  tenant?: Record<string, unknown>;
  /** Organisation-wide memory (common searches, workflows, etc.). */
  organizationMemory?: {
    commonSearches?: unknown[];
    successfulWorkflows?: unknown[];
    accessibleAssetCount?: number;
    enabledPackCount?: number;
  };
  /** Workspace-scoped memory. */
  workspaceMemory?: {
    recentAssets?: unknown[];
    visibleAssetIds?: string[];
  };
  /** Role-scoped memory. */
  roleMemory?: {
    role?: string | null;
    roleProfileId?: string | null;
    preferredAssetIds?: string[];
  };
  /** User-specific memory (preferences, pinned assets, etc.). */
  userMemory?: {
    preferences?: Record<string, unknown>;
    pinnedAssets?: string[];
    recentAssets?: string[];
    savedWorkflows?: unknown[];
  };
  /** AI-specific memory (short-term context, chat history). */
  aiMemory?: {
    shortTerm?: Record<string, unknown>;
    recentAiChats?: unknown[];
    savedPromptCount?: number;
    recentPromptCount?: number;
  };
  /** Artifact / reference memory. */
  artifactMemory?: {
    references?: unknown[];
  };
  /** Memory-engine rules and flags. */
  rules?: {
    tenantIsolated?: boolean;
    permissionAware?: boolean;
    auditable?: boolean;
    rawPromptIncluded?: boolean;
    rawSearchIncluded?: boolean;
  };
  /** Whether the context was fetched successfully (API result only). */
  ok?: boolean;
  /** Error message if the fetch failed (API result only). */
  message?: string;
}

/** Operational profile — the full identity record from the backend or local fallback. */
interface OperationalProfile {
  /** User account card. */
  account?: UserAccount | null;
  /** Professional credentials and specialisation. */
  professional?: ProfessionalProfile | null;
  /** User display & workflow preferences. */
  preferences?: UserPreferences | null;
  /** AI copilot personalisation. */
  aiPersonalization?: AiPersonalization | null;
  /** Workspace-level identity state. */
  workspace?: WorkspaceState | null;
  /** User activity across the platform. */
  activity?: UserActivity | null;
  /** Security context. */
  security?: SecurityContext | null;
  /** Audit state. */
  audit?: AuditState | null;
  /** SaaS profile projection. */
  saasProfile?: SaasProfile | null;
  /** Backend-resolved effective profile. */
  effectiveProfile?: EffectiveProfile | null;
  /** Backend-resolved access summary. */
  accessSummary?: UserProfileAccessSummary | null;
  /** Allow additional backend fields without breaking. */
  [key: string]: unknown;
}

/** API response wrapper from identity services. */
interface ApiResult<T = unknown> {
  /** Whether the request succeeded. */
  ok: boolean;
  /** Response payload (null on failure). */
  data: T | null;
  /** Error or status message. */
  message: string;
}

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

type UserIdentityContextValue = {
  /** Full operational profile (backend or fallback). */
  operationalProfile: OperationalProfile | null;
  /** User account / identity card. */
  account: UserAccount | null;
  /** User display & workflow preferences. */
  preferences: UserPreferences | null;
  /** Workspace-level identity state. */
  workspaceState: WorkspaceState;
  /** Currently active workspace. */
  activeWorkspace: Workspace | null;
  /** All workspaces available to the user. */
  workspaces: Workspace[];
  /** User activity across the platform. */
  activity: UserActivity | null;
  /** AI copilot personalisation state. */
  aiPersonalization: AiPersonalization | null;
  /** Security context for the current user. */
  security: SecurityContext | null;
  /** Audit state exposed to the UI. */
  audit: AuditState | null;
  /** SaaS-level profile projection. */
  saasProfile: SaasProfile;
  /** Backend-resolved effective profile (null in demo/offline). */
  effectiveProfile: EffectiveProfile | null;
  /** Backend-resolved access summary (null in demo/offline). */
  accessSummary: UserProfileAccessSummary | null;
  /** Whether the identity is still loading. */
  isLoading: boolean;
  /** Error message from the last identity fetch. */
  error: string;
  /** Re-fetch the full identity from the backend. */
  refreshIdentity: () => Promise<OperationalProfile | null>;
  /** Switch the active workspace and re-normalise the profile. */
  switchWorkspace: (workspaceId: string) => Promise<ApiResult<WorkspaceState | null>>;
  /** Persist preference updates and refresh local state. */
  savePreferences: (updates: Partial<UserPreferences>) => Promise<ApiResult<UserPreferences>>;
  /** Push profile field updates to the backend. */
  updateProfile: (updates: Record<string, unknown>) => Promise<ApiResult<OperationalProfile>>;
  /** Record a user activity event. */
  recordActivity: (activity: Record<string, unknown>) => Promise<{ ok: boolean; message: string }>;
  /** Check whether the active workspace includes a given permission. */
  hasEffectivePermission: (permission: string) => boolean;
  /** Enriched platform context (platform API + saasProfile merge). */
  platformContext: PlatformContext | null;
  /** Re-fetch the platform asset / entitlement context. */
  refreshPlatformContext: () => Promise<PlatformContext | null>;
  /** Memory-fabric context from the memory API. */
  memoryFabricContext: MemoryFabricContext;
  /** Re-fetch the memory-fabric context. */
  refreshMemoryFabricContext: () => Promise<MemoryFabricContext>;
  /** Organisation record from the platform context. */
  organization: PlatformContext['organization'] | null;
  /** Role-profile from the platform context. */
  roleProfile: PlatformContext['roleProfile'] | null;
  /** Asset IDs the user is entitled to. */
  entitledAssetIds: string[];
  /** Pack IDs the user is entitled to. */
  entitledPackIds: string[];
  /** Workspace IDs the user may access (from saasProfile). */
  allowedWorkspaces: string[];
  /** Enabled asset-pack IDs (from saasProfile). */
  enabledAssetPacks: string[];
  /** Pinned asset IDs for quick access (from saasProfile). */
  pinnedAssets: string[];
  /** Hidden asset IDs (from saasProfile). */
  hiddenAssets: string[];
  /** Recently accessed asset IDs (from saasProfile). */
  recentAssets: string[];
};

const UserIdentityContext = createContext<UserIdentityContextValue>({
  operationalProfile: null,
  account: null,
  preferences: null,
  workspaceState: { activeWorkspaceId: '' },
  activeWorkspace: null,
  workspaces: [],
  activity: null,
  aiPersonalization: null,
  security: null,
  audit: null,
  saasProfile: DEFAULT_SAAS_PROFILE,
  effectiveProfile: null,
  accessSummary: null,
  isLoading: false,
  error: '',
  refreshIdentity: async () => null,
  switchWorkspace: async () => ({ ok: false, data: null, message: 'Not initialised' } as ApiResult<WorkspaceState | null>),
  savePreferences: async () => ({ ok: false, data: null, message: 'Not initialised' }),
  updateProfile: async () => ({ ok: false, data: null, message: 'Not initialised' }),
  recordActivity: async () => ({ ok: false, message: 'Not initialised' }),
  hasEffectivePermission: () => false,
  platformContext: null,
  refreshPlatformContext: async () => null,
  memoryFabricContext: LOCAL_MEMORY_FABRIC_CONTEXT as MemoryFabricContext,
  refreshMemoryFabricContext: async () => LOCAL_MEMORY_FABRIC_CONTEXT as MemoryFabricContext,
  organization: null,
  roleProfile: null,
  entitledAssetIds: [],
  entitledPackIds: [],
  allowedWorkspaces: [],
  enabledAssetPacks: [],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
});

export const useUserIdentity = () => {
  const context = useContext(UserIdentityContext);
  if (!context) {
    throw new Error('useUserIdentity must be used within UserIdentityProvider');
  }
  return context;
};

function buildFallbackProfile({
  user,
  localWorkspaces,
  activeWorkspaceId,
  themePreference,
  toolPrefs,
}: {
  user: any;
  localWorkspaces: any[] | null | undefined;
  activeWorkspaceId: string | undefined;
  themePreference: string | undefined;
  toolPrefs: {
    favorites?: string[];
    pinned?: string[];
    recentTools?: string[];
    hiddenTools?: string[];
    profileSettings?: Record<string, unknown>;
  };
}) {
  const clientProfile = readLocalClientProfile();
  const profile = user?.profile || {};
  const caredroidProfile = user?.caredroidProfile || {};
  const workspaces = (localWorkspaces || []).map((workspace) => ({
    id: workspace.id,
    type: workspace.id === 'fleet' ? 'fleet' : workspace.id === 'hospital-operations' ? 'hospital' : 'personal',
    name: workspace.name,
    branding: { displayName: workspace.name },
    settings: {
      defaultDashboard: 'command',
      enabledToolIds: workspace.toolIds || [],
      enabledModules: ['dashboard', 'tools'],
    },
  }));
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];

  const saasProfile = {
    ...DEFAULT_SAAS_PROFILE,
    userId: user?.id || '',
    organizationId: clientProfile?.organizationId || caredroidProfile.organizationId || profile.organizationId || null,
    organizationType: clientProfile?.organizationType || profile.organizationType || DEFAULT_SAAS_PROFILE.organizationType,
    displayName: caredroidProfile.fullName || user?.fullName || user?.name || profile.fullName || user?.email || 'CareDroid User',
    email: user?.email || '',
    role: caredroidProfile.saasRole || profile.saasRole || profile.roleProfileId || user?.role || DEFAULT_SAAS_PROFILE.role,
    specialty: profile.specialty || caredroidProfile.specialties?.[0] || '',
    department: caredroidProfile.department || profile.department || '',
    defaultWorkspace:
      clientProfile?.defaultWorkspace || activeWorkspace?.id || activeWorkspaceId || DEFAULT_SAAS_PROFILE.defaultWorkspace,
    allowedWorkspaces: clientProfile?.enabledWorkspaces || workspaces.map((workspace) => workspace.id),
    subscriptionEntitlements: clientProfile?.enabledAssetPacks || DEFAULT_SAAS_PROFILE.subscriptionEntitlements,
    enabledAssetPacks: clientProfile?.enabledAssetPacks || DEFAULT_SAAS_PROFILE.enabledAssetPacks,
    pinnedAssets: toolPrefs.pinned || [],
    hiddenAssets: toolPrefs.hiddenTools || [],
    recentAssets: toolPrefs.recentTools || [],
    themePreference: themePreference || DEFAULT_SAAS_PROFILE.themePreference,
    density: DEFAULT_SAAS_PROFILE.density,
    compactMode: false,
  };

  return enrichDemoIdentityFallback(user, {
    userId: user?.id || '',
    saasProfile,
    account: {
      userId: user?.id || '',
      displayName: caredroidProfile.fullName || user?.fullName || user?.name || profile.fullName || user?.email || 'CareDroid User',
      email: user?.email || '',
      avatarUrl: caredroidProfile.avatarUrl || profile.avatarUrl,
      profession: profile.profession || caredroidProfile.title || 'Clinician',
      specialty: profile.specialty || caredroidProfile.specialties?.[0],
      organization: user?.institution || profile.institution || caredroidProfile.networkId,
      department: caredroidProfile.department || profile.department,
      role: caredroidProfile.backendRole || user?.role || 'student',
      hospitalRole: caredroidProfile.role,
      emergencyRoleId: caredroidProfile.emergencyRoleId,
      saasRole: caredroidProfile.saasRole,
      roleProfileId: caredroidProfile.roleProfileId || profile.roleProfileId,
      country: profile.country,
      timezone: profile.timezone,
      language: profile.languagePreference,
      verified: Boolean(profile.verified),
      trustScore: profile.trustScore || 0,
    },
    professional: {
      credentials: caredroidProfile.credentials || [],
      certifications: [],
      specialties: caredroidProfile.specialties || (profile.specialty ? [profile.specialty] : []),
      experienceLevel: 'mid',
      clinicalInterests: [],
    },
    preferences: {
      theme: themePreference || 'light',
      language: profile.languagePreference || 'en',
      defaultDashboard: 'command',
      density: DEFAULT_SAAS_PROFILE.density,
      compactMode: false,
      accessibility: { reduceMotion: false, highContrast: false, fontScale: 'default' },
      calculatorPreferences: { pinnedCalculatorIds: [], defaultUnits: 'metric', rememberInputs: false },
      toolPreferences: {
        favoriteToolIds: toolPrefs.favorites,
        pinnedToolIds: toolPrefs.pinned,
        recentToolIds: toolPrefs.recentTools,
        hiddenToolIds: toolPrefs.hiddenTools,
        profileSettings: toolPrefs.profileSettings,
      },
      aiAssistantPreferences: {
        responseStyle: 'concise',
        citationLevel: 'standard',
        safetyTone: 'standard',
      },
      notificationSettings: {},
    },
    aiPersonalization: {
      preferredBehavior: 'clinical_copilot',
      savedPrompts: [],
      recentPrompts: [],
      suggestedTools: ['calculators', 'drug-check', 'lab-interp'],
      recommendedWorkflows: [],
    },
    workspace: {
      activeWorkspaceId: activeWorkspace?.id || 'all',
      recentWorkspaceIds: activeWorkspace ? [activeWorkspace.id] : [],
      workspaces,
      activeWorkspace,
      memberships: [],
      effectivePermissions: [],
      linkedTeams: [],
    },
    activity: {
      recentCalculators: [],
      recentTools: (toolPrefs.recentTools || []).map((toolId) => ({
        id: toolId,
        label: toolId,
        metadata: { toolId },
        occurredAt: new Date().toISOString(),
      })),
      recentAiChats: [],
      recentFleetActivity: [],
      recentIotActivity: [],
    },
    security: {
      emailVerified: Boolean(user?.emailVerified),
      role: user?.role || 'student',
      mfaEnabled: false,
      lastLoginAt: user?.lastLoginAt,
    },
    audit: { recentEvents: [] },
  });
}

/** Raw profile shape before normalisation (from backend or local builder). */
interface RawProfileForNormalization {
  userId?: string;
  account?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  saasProfile?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Raw workspace state before normalisation. */
interface RawWorkspaceState {
  activeWorkspace?: Workspace;
  workspaces?: Workspace[];
  [key: string]: unknown;
}

function normalizeSaasProfile(
  profile: any,
  workspaceState: any,
): SaasProfile {
  const account = profile?.account || {};
  const preferences = profile?.preferences || {};
  const toolPreferences = preferences.toolPreferences || {};
  const saasPreferences = toolPreferences.saasProfile || {};
  const activeWorkspace = workspaceState?.activeWorkspace;
  const requestedDensity =
    profile?.saasProfile?.density ||
    preferences.density ||
    (profile?.saasProfile?.compactMode ?? preferences.compactMode ? 'compact' : 'standard');
  const density = requestedDensity === 'compact' ? 'compact' : 'standard';
  return {
    ...DEFAULT_SAAS_PROFILE,
    ...saasPreferences,
    ...(profile?.saasProfile || {}),
    userId: profile?.userId || account.userId || '',
    organizationId: profile?.saasProfile?.organizationId || account.organizationId || null,
    displayName: profile?.saasProfile?.displayName || account.displayName || 'CareDroid User',
    email: profile?.saasProfile?.email || account.email || '',
    role: profile?.saasProfile?.role || account.saasRole || account.role || DEFAULT_SAAS_PROFILE.role,
    specialty: profile?.saasProfile?.specialty || account.specialty || '',
    department: profile?.saasProfile?.department || account.department || '',
    defaultWorkspace:
      profile?.saasProfile?.defaultWorkspace ||
      saasPreferences.defaultWorkspace ||
      activeWorkspace?.workspaceKey ||
      activeWorkspace?.type ||
      DEFAULT_SAAS_PROFILE.defaultWorkspace,
    allowedWorkspaces:
      profile?.saasProfile?.allowedWorkspaces ||
      saasPreferences.allowedWorkspaces ||
      (workspaceState?.workspaces || []).map((workspace) => workspace.workspaceKey || workspace.type || workspace.id),
    pinnedAssets:
      profile?.saasProfile?.pinnedAssets ||
      toolPreferences.pinnedAssetIds ||
      toolPreferences.pinnedToolIds ||
      [],
    hiddenAssets:
      profile?.saasProfile?.hiddenAssets ||
      toolPreferences.hiddenAssetIds ||
      toolPreferences.hiddenToolIds ||
      [],
    recentAssets:
      profile?.saasProfile?.recentAssets ||
      toolPreferences.recentAssetIds ||
      toolPreferences.recentToolIds ||
      [],
    preferredAIStyle:
      profile?.saasProfile?.preferredAIStyle ||
      preferences.aiAssistantPreferences?.responseStyle ||
      DEFAULT_SAAS_PROFILE.preferredAIStyle,
    themePreference: profile?.saasProfile?.themePreference || preferences.theme || DEFAULT_SAAS_PROFILE.themePreference,
    density,
    compactMode: density === 'compact',
  };
}

export const UserIdentityProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, authToken } = useUser();
  const { refreshTenantContext } = useTenantContext();
  const { workspaces: localWorkspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const toolPrefs = useToolPreferences();
  const { preference: themePreference } = useTheme();
  const [operationalProfile, setOperationalProfile] = useState<OperationalProfile | null>(null);
  const [platformContext, setPlatformContext] = useState<PlatformContext | null>(null);
  const [memoryFabricContext, setMemoryFabricContext] = useState<MemoryFabricContext>(LOCAL_MEMORY_FABRIC_CONTEXT as MemoryFabricContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fallbackProfile = useMemo(
    () =>
      buildFallbackProfile({
        user,
        localWorkspaces,
        activeWorkspaceId,
        themePreference,
        toolPrefs,
      }),
    [activeWorkspaceId, localWorkspaces, themePreference, toolPrefs, user],
  );

  const normalizeProfile = useCallback((profile: any): OperationalProfile | null => {
    if (!profile) return null;
    const workspaceState = profile.workspace || {};
    const workspaces = workspaceState.workspaces || [];
    const activeWorkspace =
      workspaceState.activeWorkspace ||
      workspaces.find((workspace) => workspace.id === workspaceState.activeWorkspaceId) ||
      workspaces[0];

    const normalized = {
      ...profile,
      workspace: {
        ...workspaceState,
        workspaces,
        activeWorkspace,
        activeWorkspaceId: activeWorkspace?.id || workspaceState.activeWorkspaceId,
      },
    };
    return {
      ...normalized,
      saasProfile: normalizeSaasProfile(normalized, normalized.workspace),
    } as OperationalProfile;
  }, []);

  // Called concurrently from several independent triggers on Admin/Organization
  // pages (the identity-bootstrap effect, a manual "Refresh platform context"
  // button, createOrganization/saveOrganization, togglePack, onboarding submit) --
  // unlike the sibling switchWorkspace below (given a staleness-token guard
  // specifically for this reason), this had none, so a slower, in-flight response
  // (e.g. bootstrap's own refreshIdentity()) could resolve AFTER a faster, more
  // recent one (e.g. a pack toggle) and silently overwrite it with stale
  // entitledPackIds/entitledAssetIds -- a just-enabled pack could appear to
  // "revert" itself with no error and no visible cause.
  const refreshPlatformContextTokenRef = useRef(0);

  const refreshPlatformContext = useCallback(async () => {
    const token = ++refreshPlatformContextTokenRef.current;
    if (!isAuthenticated && !authToken) {
      if (refreshPlatformContextTokenRef.current === token) {
        setPlatformContext(null);
        setPlatformEntitlementContext(null);
      }
      return null;
    }
    try {
      const ctx = await PlatformAssetsApi.getContext();
      if (refreshPlatformContextTokenRef.current !== token) return null;
      setPlatformContext(ctx);
      setPlatformEntitlementContext(ctx);
      return ctx;
    } catch (platformError: any) {
      logger.warn('Platform context unavailable', { message: platformError?.message });
      if (refreshPlatformContextTokenRef.current === token) {
        setPlatformContext(null);
        setPlatformEntitlementContext(null);
      }
      return null;
    }
  }, [authToken, isAuthenticated]);

  const refreshMemoryFabricContext = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setMemoryFabricContext(LOCAL_MEMORY_FABRIC_CONTEXT);
      return LOCAL_MEMORY_FABRIC_CONTEXT;
    }
    const result = await fetchMemoryFabricContext();
    if (!result.ok) {
      logger.warn('Memory fabric context unavailable', { message: result.message });
      setMemoryFabricContext(LOCAL_MEMORY_FABRIC_CONTEXT);
      return LOCAL_MEMORY_FABRIC_CONTEXT;
    }
    setMemoryFabricContext(result);
    return result;
  }, [authToken, isAuthenticated]);

  const refreshIdentity = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setOperationalProfile(null);
      setPlatformContext(null);
      setPlatformEntitlementContext(null);
      setMemoryFabricContext(LOCAL_MEMORY_FABRIC_CONTEXT);
      setError('');
      return null;
    }
    setIsLoading(true);
    const [result] = await Promise.all([
      UserIdentityApi.fetchOperationalProfile(),
      refreshPlatformContext(),
      refreshMemoryFabricContext(),
    ]);
    setIsLoading(false);
    if (!result.ok) {
      logger.warn('Operational profile backend unavailable; using local identity fallback', {
        message: result.message,
      });
      setError(result.message);
      setOperationalProfile(fallbackProfile);
      return fallbackProfile;
    }
    const normalized = normalizeProfile(result.data);
    setOperationalProfile(normalized);
    setError('');
    return normalized;
  }, [
    authToken,
    fallbackProfile,
    isAuthenticated,
    normalizeProfile,
    refreshMemoryFabricContext,
    refreshPlatformContext,
  ]);

  // Depending on [refreshIdentity] re-ran this effect (and thus refetched the whole
  // operational profile) every time ANY of refreshIdentity's own dependencies got a new
  // reference -- including fallbackProfile, which is rebuilt whenever localWorkspaces/
  // toolPrefs/themePreference change upstream, none of which should re-trigger an identity
  // fetch. The actual intent is "bootstrap on mount, refetch when auth state changes" --
  // depend on the real signals directly and read the latest refreshIdentity via a ref so
  // the effect doesn't need it in its dependency array (same pattern as UserContext's
  // userRef/authTokenRef above). Contributed to MB-P0-4/HEAL-082's app-wide render churn.
  const refreshIdentityRef = useRef(refreshIdentity);
  useEffect(() => {
    refreshIdentityRef.current = refreshIdentity;
  }, [refreshIdentity]);
  useEffect(() => {
    refreshIdentityRef.current();
  }, [authToken, isAuthenticated]);

  const rawProfile = operationalProfile || fallbackProfile;
  // operationalProfile comes straight from the real backend (GET /api/profile/me) and, for
  // the dev-bypass/demo-persona session, carries the backend service account's literal raw
  // name ("Dev Clinician") -- never meant to be user-facing. fallbackProfile already masks
  // this via enrichDemoIdentityFallback (see buildFallbackProfile above), but operationalProfile
  // did not go through the same masking, so the displayed clinician identity silently flipped
  // between "Dr. Cara George" (before the async /api/profile/me fetch resolved) and "Dev
  // Clinician" (after) with no user action -- the same two-sources-disagree bug shape as
  // HEAL-098/HEAL-114, just for identity instead of an alert count. Re-applying the same
  // masking here keeps both sources in agreement regardless of fetch timing.
  const profile = useMemo(
    () => enrichDemoIdentityFallback(user, rawProfile) as OperationalProfile,
    [user, rawProfile],
  );
  // profile?.workspace and normalizeSaasProfile(...) both fall back to freshly-constructed
  // object literals when unset (the common demo/dev-profile case), so without memoizing
  // here `workspaceState`/`saasProfile` were new references every render — poisoning the
  // `value` useMemo below (both are its dependencies) and cascading through every consumer
  // of this context on every unrelated render, anywhere in the tree. That churn was a
  // contributing cause of MB-P0-4/HEAL-082 (/emergency/patients permanently stuck on its
  // route-level Suspense fallback): a freshly-mounting lazy route's render kept losing the
  // race to a self-sustaining app-wide re-render storm and never got to commit.
  const workspaceState = useMemo(
    () => (profile?.workspace || { activeWorkspaceId: '' }) as WorkspaceState,
    [profile?.workspace],
  );
  const activeWorkspace = workspaceState.activeWorkspace;
  const saasProfile: SaasProfile = useMemo(
    () => profile?.saasProfile || normalizeSaasProfile(profile, workspaceState),
    [profile, profile?.saasProfile, workspaceState],
  );
  const enrichedPlatformContext = useMemo(
    () =>
      platformContext
        ? {
            ...platformContext,
            saasProfile,
            preferences: profile?.preferences,
            pinnedAssetIds: saasProfile.pinnedAssets,
            hiddenAssetIds: saasProfile.hiddenAssets,
            recentAssetIds: saasProfile.recentAssets,
            enabledAssetPacks: saasProfile.enabledAssetPacks,
          }
        : null,
    [platformContext, profile?.preferences, saasProfile],
  );

  useEffect(() => {
    const localWorkspaceId = BACKEND_TO_LOCAL_WORKSPACE[activeWorkspace?.type as keyof typeof BACKEND_TO_LOCAL_WORKSPACE];
    if (localWorkspaceId && localWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(localWorkspaceId);
    }
  }, [activeWorkspace?.type, activeWorkspaceId, setActiveWorkspaceId]);

  // HEAL-235: two sequential awaits (UserIdentityApi.switchWorkspace then
  // refreshTenantContext), with setOperationalProfile firing after only
  // the first, unconditionally. Called in parallel with
  // WorkspaceContext.tsx's own switchWorkspace (HEAL-234's fix) via
  // Promise.all in ProfileWorkspaces.tsx -- switching workspace A then
  // quickly re-switching to B can let A's slower response resolve after
  // B's, silently reverting operationalProfile.workspace (the source
  // activeWorkspace/workspaceState reads everywhere in the app) back to
  // A even though the user is now on B.
  const switchWorkspaceTokenRef = useRef(0);

  const switchWorkspace = useCallback(
    async (workspaceId: string): Promise<ApiResult<WorkspaceState | null>> => {
      if (!workspaceId) return { ok: false, data: null, message: 'Workspace is required.' };
      const token = ++switchWorkspaceTokenRef.current;
      const result = await UserIdentityApi.switchWorkspace(workspaceId);
      if (switchWorkspaceTokenRef.current !== token) {
        return { ok: false, data: null, message: 'Superseded by a newer workspace switch.' };
      }
      if (!result.ok) {
        setError(result.message);
        return { ok: false, data: null, message: result.message };
      }
      const normalized = normalizeProfile(result.data);
      if (!normalized) {
        return { ok: false, data: null, message: 'Failed to normalise profile.' };
      }
      setOperationalProfile((current) => ({
        ...(current || fallbackProfile),
        workspace: normalized.workspace,
      }));
      await refreshTenantContext();
      if (switchWorkspaceTokenRef.current === token) setError('');
      return { ok: true, data: (normalized.workspace ?? null) as WorkspaceState | null, message: '' };
    },
    [fallbackProfile, normalizeProfile, refreshTenantContext],
  );

  const savePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (updates?.theme) updates.theme = 'light';
      const result = await UserIdentityApi.updatePreferences(updates);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      setOperationalProfile((current) => ({
        ...(current || fallbackProfile),
        preferences: result.data,
      }));
      setError('');
      return result;
    },
    [fallbackProfile],
  );

  const updateProfile = useCallback(
    async (updates: Record<string, unknown>) => {
      const result = await UserIdentityApi.updateOperationalProfile(updates);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      setOperationalProfile(normalizeProfile(result.data));
      setError('');
      return result;
    },
    [normalizeProfile],
  );

  const recordActivity = useCallback(async (activity: Record<string, unknown>) => {
    const result = await UserIdentityApi.recordActivity({
      workspaceId: workspaceState.activeWorkspaceId,
      ...activity,
    });
    if (!result.ok) {
      logger.warn('Failed to record safe user activity', { message: result.message });
    }
    return result;
  }, [workspaceState.activeWorkspaceId]);

  const hasEffectivePermission = useCallback(
    (permission: string) => Boolean(workspaceState.effectivePermissions?.includes(permission)),
    [workspaceState.effectivePermissions],
  );

  const value = useMemo<UserIdentityContextValue>(
    () => ({
      operationalProfile: profile as OperationalProfile | null,
      account: (profile as OperationalProfile | null)?.account || null,
      preferences: (profile as OperationalProfile | null)?.preferences || null,
      workspaceState,
      activeWorkspace: activeWorkspace ?? null,
      workspaces: workspaceState.workspaces || [],
      activity: (profile as OperationalProfile | null)?.activity || null,
      aiPersonalization: (profile as OperationalProfile | null)?.aiPersonalization || null,
      security: (profile as OperationalProfile | null)?.security || null,
      audit: (profile as OperationalProfile | null)?.audit || null,
      saasProfile,
      effectiveProfile: (profile as OperationalProfile | null)?.effectiveProfile || null,
      accessSummary: (profile as OperationalProfile | null)?.accessSummary || null,
      isLoading,
      error,
      refreshIdentity,
      switchWorkspace,
      savePreferences,
      updateProfile,
      recordActivity,
      hasEffectivePermission,
      platformContext: enrichedPlatformContext,
      refreshPlatformContext,
      memoryFabricContext,
      refreshMemoryFabricContext,
      organization: enrichedPlatformContext?.organization || null,
      roleProfile: enrichedPlatformContext?.roleProfile || null,
      entitledAssetIds: enrichedPlatformContext?.entitledAssetIds || [],
      entitledPackIds: enrichedPlatformContext?.entitledPackIds || [],
      allowedWorkspaces: saasProfile.allowedWorkspaces || [],
      enabledAssetPacks: saasProfile.enabledAssetPacks || [],
      pinnedAssets: saasProfile.pinnedAssets || [],
      hiddenAssets: saasProfile.hiddenAssets || [],
      recentAssets: saasProfile.recentAssets || [],
    }),
    [
      activeWorkspace,
      error,
      hasEffectivePermission,
      isLoading,
      memoryFabricContext,
      enrichedPlatformContext,
      profile,
      recordActivity,
      refreshIdentity,
      refreshMemoryFabricContext,
      refreshPlatformContext,
      savePreferences,
      saasProfile,
      switchWorkspace,
      updateProfile,
      workspaceState,
    ],
  );

  return <UserIdentityContext.Provider value={value}>{children}</UserIdentityContext.Provider>;
};

export default UserIdentityContext;
