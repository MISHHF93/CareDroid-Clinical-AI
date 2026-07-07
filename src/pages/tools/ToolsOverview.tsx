import { Component, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import ClinicalCalculatorHub from '../../components/ClinicalCalculatorHub';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getUnifiedClinicalToolsProfile } from '../../services/unifiedClinicalToolsBridge';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import {
  buildProfileToolGraph,
  buildUserToolProfile,
  filterToolsForProfileGraph,
} from '../../data/profileToolSegmentation';
import {
  getUserFacingToolRegistryProjection,
  TOOL_LAUNCH_TYPES,
  TOOL_LIFECYCLE_LABELS,
  TOOL_SURFACES,
} from '../../data/toolInventory';
import {
  ASSET_ACCESS_STATES,
  filterVisibleTools,
  getAssetAwareToolProjection,
  groupToolsByAccessView,
} from '../../data/assetAccess';
import {
  buildRoleIntelligenceProfile,
  getRoleIntelligenceAssetRecommendations,
} from '../../data/roleIntelligenceLayer';
import { getWorkspaceExperienceProfile } from '../../data/workspaceExperience';
import { FEATURE_FLAGS } from '../../config/featureFlags.config';
import { applyRegistryToolLaunch } from '../../navigation/registryToolLaunch';
import { navigateProfileAware } from '../../navigation/profileRouteLaunch';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import {
  trackRoleAssetUsage,
  trackRoleSearchBehavior,
} from '../../services/roleIntelligenceTelemetry';
import { fetchToolExecutorCatalog } from '../../services/clinicalToolsApi';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safety/policy';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { PILOT_CUSTOMER_MODE } from '../../config/unified-navigation.config';
import { CareDroidPage } from '../../components/ui/CareDroidPrimitives';
import { CAREDROID_PRODUCT } from '../../config/caredroidProduct.config';
import './ToolsOverview.css';

const EmbeddedCalculators = lazy(() => import('./Calculators'));
const DrugChecker = lazy(() => import('./DrugChecker'));
const LabInterpreter = lazy(() => import('./LabInterpreter'));
const Protocols = lazy(() => import('./Protocols'));
const DiagnosisAssistant = lazy(() => import('./DiagnosisAssistant'));
const ProcedureGuide = lazy(() => import('./ProcedureGuide'));
const CalculatorRecommender = lazy(() => import('./CalculatorRecommender'));
const AmbientScribe = lazy(() => import('./AmbientScribe'));
const GuidelineRag = lazy(() => import('./GuidelineRag'));
const DifferentialAi = lazy(() => import('./DifferentialAi'));
const TimelineAi = lazy(() => import('./TimelineAi'));
const PatientSummaryAi = lazy(() => import('./PatientSummaryAi'));
const OrderSetAi = lazy(() => import('./OrderSetAi'));
const AiExplainability = lazy(() => import('./AiExplainability'));
const ClinicalAudit = lazy(() => import('./ClinicalAudit'));

const EMBEDDED_TOOL_COMPONENTS = Object.freeze({
  'drug-check': DrugChecker,
  'lab-interp': LabInterpreter,
  protocols: Protocols,
  diagnosis: DiagnosisAssistant,
  procedures: ProcedureGuide,
  'calculator-recommender-ai': CalculatorRecommender,
  'ambient-scribe': AmbientScribe,
  'guideline-rag': GuidelineRag,
  'differential-ai': DifferentialAi,
  'timeline-ai': TimelineAi,
  'patient-summary-ai': PatientSummaryAi,
  'order-set-ai': OrderSetAi,
  'ai-explainability': AiExplainability,
  'clinical-audit': ClinicalAudit,
});

const EXECUTION_MODE_LEGEND = Object.freeze([
  {
    tone: 'local',
    label: 'Runs in this browser',
    detail: 'Deterministic forms and calculators run locally with human review.',
  },
  {
    tone: 'server',
    label: 'Uses server validation',
    detail: 'Forms can submit to registered backend executor APIs when available.',
  },
  {
    tone: 'chat',
    label: 'Copilot-guided, human-reviewed',
    detail: 'Seeds a guarded Copilot workflow; clinicians confirm context and next steps.',
  },
  {
    tone: 'platform',
    label: 'Platform service',
    detail: 'Uses a platform or clinical-intelligence API rather than a tool executor.',
  },
]);

const TOOL_FILTER_OPTIONS = Object.freeze([
  { value: 'recommended', label: 'Recommended' },
  { value: 'all', label: 'All' },
  { value: 'calculator', label: 'Calculators' },
  { value: 'clinical-tools', label: 'Clinical Tools' },
  { value: 'ai-workflows', label: 'AI Workflows' },
  { value: 'simulations', label: 'Simulations' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'maps-iot', label: 'Maps & IoT' },
  { value: 'operations', label: 'Operations' },
  { value: 'governance', label: 'Governance' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'recent', label: 'Recent' },
]);

const COMMON_TOOL_FILTER_VALUES = new Set(['recommended', 'all', 'calculator', 'ai-workflows', 'operations']);
const PILOT_TOOL_FILTER_VALUES = new Set(['recommended', 'all', 'calculator', 'clinical-tools', 'ai-workflows']);
const TOOL_FILTER_OPTION_VALUES = new Set(TOOL_FILTER_OPTIONS.map((option) => option.value));

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function toolSearchBlob(tool) {
  const mountedCapability = tool.mountedCapability || {};
  return [
    tool.id,
    tool.canonicalInventoryId,
    tool.name,
    tool.label,
    tool.description,
    tool.category,
    tool.surface,
    tool.launchType,
    tool.tier,
    tool.lifecycleState,
    tool.lifecycleLabel,
    tool.nluToolId,
    tool.executorStatus,
    tool.shortcut,
    tool.path,
    tool.route,
    tool.navigationPath,
    tool.searchText,
    mountedCapability.capabilityId,
    mountedCapability.title,
    mountedCapability.description,
    mountedCapability.route,
    ...(tool.features || []),
    ...(tool.useCases || []),
    ...(tool.aliases || []),
    ...(tool.aiAliases || []),
    ...(tool.workspaceTags || []),
    ...(tool.packIds || []),
    ...(tool.productIds || []),
    ...(mountedCapability.aiAliases || []),
    ...(mountedCapability.workspaceIds || []),
    ...(mountedCapability.roleIds || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesToolFilter(tool, filter) {
  if (
    !filter ||
    [
      'recommended',
      'favorites',
      'recent',
      'workspace',
      'department',
      'role',
      'asset-packs',
      'permitted',
      'locked',
      'hidden',
      'all',
    ].includes(filter)
  ) {
    return true;
  }
  if (filter === 'simulations') {
    return /simulation|scenario|competenc/i.test(`${tool.name} ${tool.description} ${tool.id}`);
  }
  if (filter === 'laboratory') {
    return tool.category === 'Laboratory' || /lab|laboratory/i.test(`${tool.name} ${tool.path}`);
  }
  if (filter === 'governance') {
    return /audit|governance|privacy|regulatory|compliance/i.test(
      `${tool.name} ${tool.description} ${tool.category}`
    );
  }
  if (filter === 'calculator') {
    return (
      tool.surface !== 'hub' &&
      (tool.category === 'Calculator' || tool.surface === 'calculator-form')
    );
  }
  if (filter === 'clinical-tools') {
    return (
      ['Calculator', 'Diagnostic', 'Reference', 'Clinical'].includes(tool.category) ||
      tool.category === 'Diagnostic' ||
      /diagnos|differential|triage|risk|score|protocol|drug|lab|clinical/i.test(
        `${tool.name} ${tool.description} ${tool.path}`
      )
    );
  }
  if (filter === 'ai-workflows') {
    return (
      ['AI Tools', 'Diagnostic'].includes(tool.category) ||
      tool.launchType === 'chat-assisted' ||
      tool.launchType === 'backend-backed' ||
      /ai|assistant|workflow|scribe|summary|order set|timeline/i.test(
        `${tool.name} ${tool.description}`
      )
    );
  }
  if (filter === 'maps-iot') {
    return (
      tool.category === 'IoT' ||
      tool.surface === 'iot-dashboard' ||
      tool.path === '/hospital-map' ||
      tool.path === '/live-map' ||
      /map|iot|device|telemetry|digital twin/i.test(`${tool.name} ${tool.description}`)
    );
  }
  if (filter === 'operations') {
    return (
      ['Fleet', 'IoT', 'Hospital Operations'].includes(tool.category) ||
      ['fleet-page', 'iot-dashboard', 'hospital-operations'].includes(tool.surface) ||
      /fleet|operations|dispatch|device|hospital map|live map|digital twin/i.test(
        `${tool.name} ${tool.description}`
      )
    );
  }
  return true;
}

function primaryActionLabel(tool) {
  if (tool.accessState === ASSET_ACCESS_STATES.DISABLED) return 'Unavailable';
  if (tool.accessState === ASSET_ACCESS_STATES.LOCKED) return 'Request access';
  if (tool.accessState === ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED) return 'Upgrade plan';
  if (tool.accessState === ASSET_ACCESS_STATES.RESTRICTED) return 'Restricted';
  if (
    tool.accessState === ASSET_ACCESS_STATES.ADMIN_ONLY ||
    tool.accessState === ASSET_ACCESS_STATES.REQUIRES_ADMIN
  )
    return 'Admin only';
  if (tool.surface === 'chat-assisted' || tool.launchType === 'chat-assisted')
    return 'Ask Assistant';
  if (tool.category === 'Calculator' || tool.surface === 'calculator-form')
    return 'Open';
  if (
    ['fleet-page', 'iot-dashboard', 'hospital-operations'].includes(tool.surface) ||
    ['Fleet', 'IoT', 'Hospital Operations'].includes(tool.category)
  ) {
    return 'Open';
  }
  return 'Open';
}

function hasMeaningfulAssistantAction(tool) {
  return tool.surface !== 'chat-assisted' && tool.launchType !== 'chat-assisted';
}

function lifecycleLabel(tool) {
  return tool.lifecycleLabel || TOOL_LIFECYCLE_LABELS[tool.lifecycleState] || 'Active';
}

function accessRestrictionCopy(tool) {
  if (
    !tool.accessState ||
    [ASSET_ACCESS_STATES.ALLOWED, ASSET_ACCESS_STATES.BETA, ASSET_ACCESS_STATES.EXPERIMENTAL].includes(
      tool.accessState
    )
  )
    return '';
  if (tool.accessState === ASSET_ACCESS_STATES.DISABLED) {
    return 'This feature is disabled for the current rollout.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.LOCKED) {
    return 'This asset is not included in the current organization packs.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED) {
    return 'This asset requires a higher subscription plan.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.RESTRICTED) {
    if (tool.accessReasons?.includes('workspace')) {
      return 'This asset is outside the active workspace.';
    }
    if (tool.accessReasons?.includes('permission')) {
      return 'Your current role or workspace is missing the required permission.';
    }
    return 'This asset is restricted in the current context.';
  }
  if (
    tool.accessState === ASSET_ACCESS_STATES.ADMIN_ONLY ||
    tool.accessState === ASSET_ACCESS_STATES.REQUIRES_ADMIN
  ) {
    return 'This asset is available to administrators only.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.HIDDEN) {
    return 'This asset is hidden by your role or preferences.';
  }
  return tool.accessLabel || '';
}

function toolIdentityValues(tool) {
  const mountedCapability = tool?.mountedCapability || {};
  return [
    tool?.id,
    tool?.canonicalInventoryId,
    tool?.nluToolId,
    tool?.orchestratorToolId,
    tool?.calculatorSlug,
    tool?.label,
    tool?.name,
    tool?.route,
    tool?.navigationPath,
    mountedCapability.capabilityId,
    ...(tool?.aliases || []),
    ...(tool?.nluProfileIds || []),
    ...(tool?.aiAliases || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
}

function resolveActiveTool(tools, queryValue, filteredTools = [] as any[]) {
  const normalized = normalizeSearch(queryValue);
  if (!normalized) return null;
  const exactTool = tools.find((tool) => toolIdentityValues(tool).includes(normalized));
  if (exactTool) return exactTool;
  const slug = normalized.replace(/^\/+|\/+$/g, '').split('/').pop();
  if (slug && slug !== normalized) {
    const slugTool = tools.find((tool) => toolIdentityValues(tool).includes(slug));
    if (slugTool) return slugTool;
  }
  return null;
}

function isCalculatorTool(tool) {
  return (
    tool?.id === 'calculators' ||
    tool?.category === 'Calculator' ||
    tool?.surface === TOOL_SURFACES.CALCULATOR_FORM ||
    Boolean(tool?.calculatorSlug)
  );
}

function isToolAccessible(tool) {
  if (!tool || tool.isLaunchable === false || tool.restrictionReason) return false;
  return [
    ASSET_ACCESS_STATES.ALLOWED,
    ASSET_ACCESS_STATES.BETA,
    ASSET_ACCESS_STATES.EXPERIMENTAL,
    ASSET_ACCESS_STATES.DEMO_ONLY,
  ].includes(tool.accessState || ASSET_ACCESS_STATES.ALLOWED);
}

function executionModeForTool(tool, executorCatalog) {
  if (!tool) {
    return {
      label: 'Catalog',
      detail: 'Select a tool to view launch and execution details.',
      tone: 'catalog',
    };
  }

  const registryExecutor = executorCatalog?.registryIdToExecutor?.[tool.id];
  const executorId = registryExecutor || tool.orchestratorToolId;
  const registeredExecutorIds = new Set(executorCatalog?.registeredExecutorToolIds || []);
  const unsupportedExecutorIds = new Set(
    (executorCatalog?.unsupportedTools || []).flatMap((entry) =>
      [entry?.registryId, entry?.nluToolId, entry?.toolId].filter(Boolean)
    )
  );
  const markedUnsupported = unsupportedExecutorIds.has(tool.id) || unsupportedExecutorIds.has(tool.nluToolId);

  if (tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED || tool.surface === 'chat-assisted') {
    return {
      label: 'Copilot-guided, human-reviewed',
      detail: 'Launches Copilot with a guarded clinical decision-support prompt. Human review is required before action.',
      tone: 'chat',
    };
  }
  if (!markedUnsupported && (tool.executorStatus === 'registered' || (executorId && registeredExecutorIds.has(executorId)))) {
    return {
      label: isCalculatorTool(tool) ? 'Server-validated calculator' : 'Uses server validation',
      detail: executorId
        ? `Uses the local Medical Tools surface and can execute through /api/tools/${executorId}/execute.`
        : 'Uses the local Medical Tools surface with registered backend validation.',
      tone: 'server',
    };
  }
  if (tool.executorStatus === 'platform' || (tool.endpoint && tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED)) {
    return {
      label: 'Platform service',
      detail: tool.endpoint ? `Uses ${tool.endpoint}.` : 'Uses a platform API client when launched.',
      tone: 'platform',
    };
  }
  if (isCalculatorTool(tool)) {
    return {
      label: 'Runs in this browser',
      detail: 'Runs in the browser with the built-in calculator form; no fake backend executor is called.',
      tone: 'local',
    };
  }
  return {
    label: 'Catalog launch',
    detail: tool.endpoint ? `Connected endpoint: ${tool.endpoint}.` : 'Launches through the Medical Tools catalog.',
    tone: 'catalog',
  };
}

class ActiveToolSurfaceErrorBoundary extends Component<any, any> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const { toolName, onClose } = this.props;
      return (
        <div className="tools-active-surface__fallback" role="alert">
          <strong className="tools-active-surface__fallback-title">Tool surface unavailable</strong>
          <p>
            {toolName} could not render in this session. Return to the catalog or launch a different
            clinical tool while the issue is reviewed.
          </p>
          <button type="button" className="btn-open-tool" onClick={onClose}>
            Back to catalog
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ActiveToolSurface({
  tool,
  executorCatalog,
  onClose,
  onAssistantLaunch,
  onToolLaunch,
}) {
  if (!tool) return null;

  const executionMode = executionModeForTool(tool, executorCatalog);
  const embeddedComponent = EMBEDDED_TOOL_COMPONENTS[tool.id];
  const calculatorId = tool.calculatorSlug || (tool.id !== 'calculators' ? tool.id : '');
  const accessible = isToolAccessible(tool);
  const chatAssisted = tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED || tool.surface === 'chat-assisted';

  let body: any = null;
  if (!accessible) {
    body = (
      <div className="tools-active-surface__fallback" role="status">
        <strong className="tools-active-surface__fallback-title">{tool.label || tool.name}</strong>
        <p>Unavailable: {tool.restrictionReason || accessRestrictionCopy(tool)}</p>
      </div>
    );
  } else if (tool.id === 'calculators') {
    body = <ClinicalCalculatorHub />;
  } else if (chatAssisted) {
    body = (
      <div className="tools-active-surface__fallback">
        <strong className="tools-active-surface__fallback-title">{tool.label || tool.name}</strong>
        <p>{tool.description}</p>
        <button
          type="button"
          className="btn-open-tool"
          onClick={() => onAssistantLaunch(tool)}
        >
          Ask Assistant
        </button>
      </div>
    );
  } else if (isCalculatorTool(tool)) {
    body = (
      <EmbeddedCalculators
        embedded
        initialCalculatorId={calculatorId}
        onCloseEmbedded={onClose}
      />
    );
  } else if (embeddedComponent) {
    const Component = embeddedComponent;
    body = <Component embedded onCloseEmbedded={onClose} />;
  } else {
    body = (
      <div className="tools-active-surface__fallback">
        <strong className="tools-active-surface__fallback-title">{tool.label || tool.name}</strong>
        <p>{tool.description}</p>
        <button
          type="button"
          className="btn-open-tool"
          onClick={() => onToolLaunch(tool)}
        >
          Open from catalog
        </button>
      </div>
    );
  }

  return (
    <section className="tools-active-surface" aria-label="Active Medical Tools surface">
      <header className="tools-active-surface__header">
        <div>
          <span className={`tools-execution-badge tools-execution-badge--${executionMode.tone}`}>
            {executionMode.label}
          </span>
          <h2>{tool.label || tool.name}</h2>
          <p>{executionMode.detail}</p>
          <p className="tools-active-surface__safety">{HUMAN_REVIEW_DISCLAIMER}</p>
        </div>
        <button type="button" className="tools-active-surface__close" onClick={onClose}>
          Back to catalog
        </button>
      </header>
      <Suspense fallback={<div className="tools-active-surface__loading">Loading tool surface...</div>}>
        <ActiveToolSurfaceErrorBoundary
          key={tool.id}
          toolName={tool.label || tool.name || 'This tool'}
          onClose={onClose}
        >
          {body}
        </ActiveToolSurfaceErrorBoundary>
      </Suspense>
    </section>
  );
}

function UnknownActiveToolSurface({ requestedTool, onClose }) {
  return (
    <section className="tools-active-surface" aria-label="Active Medical Tools surface">
      <header className="tools-active-surface__header">
        <div>
          <span className="tools-execution-badge tools-execution-badge--catalog">Not found</span>
          <h2>Tool not found</h2>
          <p>No Medical Tools entry matches “{requestedTool}”. Check the spelling or search the catalog below.</p>
        </div>
        <button type="button" className="tools-active-surface__close" onClick={onClose}>
          Back to catalog
        </button>
      </header>
    </section>
  );
}

const ToolsOverview = () => {
  const surfaces = usePractitionerSurfaceVisibility();
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFilter: any = searchParams.get('filter');
  const requestedSearch = searchParams.get('q') || searchParams.get('search') || '';
  const requestedSource = searchParams.get('source');
  const requestedOpenTool =
    searchParams.get('open') ||
    searchParams.get('tool') ||
    searchParams.get('calc') ||
    '';
  const routeDefaultFilter = location.pathname === CANONICAL_ROUTES.calculators ? 'calculator' : 'recommended';
  const [search, setSearch] = useState(requestedSearch);
  const [toolFilter, setToolFilter] = useState(
    TOOL_FILTER_OPTION_VALUES.has(requestedFilter) ? requestedFilter : routeDefaultFilter
  );
  const [executorCatalog, setExecutorCatalog] = useState({
    registeredExecutorToolIds: [],
    registryIdToExecutor: {},
    unsupportedTools: [],
    error: null,
  });

  useEffect(() => {
    setToolFilter(
      TOOL_FILTER_OPTION_VALUES.has(requestedFilter) ? requestedFilter : routeDefaultFilter
    );
  }, [requestedFilter, routeDefaultFilter]);

  useEffect(() => {
    setSearch(requestedSearch);
  }, [requestedSearch]);

  useEffect(() => {
    let alive = true;
    fetchToolExecutorCatalog().then((result) => {
      if (!alive) return;
      if (result.ok) {
        setExecutorCatalog({
          registeredExecutorToolIds: result.data?.registeredExecutorToolIds || [],
          registryIdToExecutor: result.data?.registryIdToExecutor || {},
          unsupportedTools: result.data?.unsupportedTools || [],
          error: null,
        });
        return;
      }
      setExecutorCatalog((previous) => ({ ...previous, error: result.error || 'Tool catalog unavailable' }));
    });
    return () => {
      alive = false;
    };
  }, []);

  const { selectTool, setActiveTool, addMessage } = useConversation();
  const toolPreferences = useToolPreferences();
  const {
    favorites,
    pinned,
    recentTools,
    hiddenTools,
    toggleFavorite,
    togglePinned,
    toggleHidden,
    recordToolAccess,
  } = toolPreferences;
  const {
    workspaces = [] as any[],
    activeWorkspaceId = 'emergency',
    setActiveWorkspaceId,
    activeWorkspace: workspaceContextActive,
    recommendations: workspaceRecommendations = [],
    switchWorkspace = setActiveWorkspaceId,
    visibleAssetIds = [] as any[],
    workspaceContext = null,
  } = useWorkspace();
  const { user } = useUser();
  const {
    account,
    preferences,
    activeWorkspace,
    workspaceState,
    platformContext,
    roleProfile,
    saasProfile,
    switchWorkspace: switchIdentityWorkspace,
  } = useUserIdentity();

  const accessContext = useMemo(
    () => ({
      ...(platformContext || {}),
      account,
      activeWorkspace,
      workspaceContextActive,
      preferences,
      workspaceState,
      visibleAssetIds,
      saasProfile,
      roleProfile,
      saasRole: roleProfile?.id || saasProfile?.role,
    }),
    [
      account,
      activeWorkspace,
      platformContext,
      preferences,
      saasProfile,
      visibleAssetIds,
      workspaceContextActive,
      workspaceState,
    ]
  );
  const accessRole = saasProfile?.role || platformContext?.membership?.role || account?.role || user?.role;

  const allToolsWithAccess = useMemo(() => {
    const projected = FEATURE_FLAGS.platformEntitlements
      && platformContext
      ? getAssetAwareToolProjection(accessContext, accessRole)
      : getUserFacingToolRegistryProjection();
    const locallyHidden = new Set([
      ...(hiddenTools || []),
      ...(preferences?.toolPreferences?.hiddenAssetIds || []),
      ...(preferences?.toolPreferences?.hiddenToolIds || []),
      ...(saasProfile?.hiddenAssets || []),
    ]);
    return projected.map((tool) => {
      const isHidden = locallyHidden.has(tool.id);
      return {
        ...tool,
        accessState: isHidden ? ASSET_ACCESS_STATES.HIDDEN : tool.accessState || ASSET_ACCESS_STATES.ALLOWED,
        accessLabel: isHidden ? 'Hidden' : tool.accessLabel || 'Available',
        isLaunchable: isHidden ? false : tool.isLaunchable !== false,
      };
    });
  }, [accessContext, accessRole, hiddenTools, platformContext, preferences?.toolPreferences, saasProfile?.hiddenAssets]);

  const compiledProfile = useMemo(
    () =>
      getUnifiedClinicalToolsProfile({
        saasRole: roleProfile?.id || saasProfile?.role || 'student',
        orgContext: {
          organizationType: platformContext?.organization?.type || 'hospital',
          entitledPackIds: platformContext?.entitledPackIds || [],
        },
        entitlementContext: accessContext,
        tools: allToolsWithAccess,
      }),
    [
      accessContext,
      allToolsWithAccess,
      platformContext?.entitledPackIds,
      platformContext?.organization?.type,
      roleProfile?.id,
      saasProfile?.role,
    ],
  );

  const tools = useMemo(() => {
    const visibleIds = new Set(compiledProfile.tools.visible.map((tool) => tool.id));
    return filterVisibleTools(allToolsWithAccess).filter((tool) => visibleIds.has(tool.id));
  }, [allToolsWithAccess, compiledProfile.tools.visible]);

  const toolById = useMemo(
    () => Object.fromEntries(allToolsWithAccess.map((tool) => [tool.id, tool])),
    [allToolsWithAccess]
  );
  const localActiveWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId),
    [activeWorkspaceId, workspaces]
  );
  const workspaceExperience = useMemo(
    () => getWorkspaceExperienceProfile(workspaceContextActive || activeWorkspace || localActiveWorkspace),
    [activeWorkspace, localActiveWorkspace, workspaceContextActive]
  );
  const isBackendWorkspaceContext = Boolean(workspaceContext?.workspace);
  const isAllToolsWorkspace =
    activeWorkspaceId === 'all' || (!isBackendWorkspaceContext && !localActiveWorkspace?.toolIds?.length);
  const profile = useMemo(
    () =>
      buildUserToolProfile({
        account,
        user,
        preferences,
        activeWorkspace: workspaceContextActive || activeWorkspace || localActiveWorkspace,
        activeWorkspaceId: isAllToolsWorkspace ? 'all' : workspaceState?.activeWorkspaceId || activeWorkspaceId,
        toolPreferences,
        permissions: workspaceState?.effectivePermissions || [],
      }),
    [
      account,
      activeWorkspace,
      activeWorkspaceId,
      isAllToolsWorkspace,
      localActiveWorkspace,
      preferences,
      toolPreferences,
      user,
      workspaceContextActive,
      workspaceState?.activeWorkspaceId,
      workspaceState?.effectivePermissions,
    ]
  );
  const roleIntelligenceProfile = useMemo(
    () =>
      buildRoleIntelligenceProfile({
        account,
        user,
        preferences,
        activeWorkspace: workspaceContextActive || activeWorkspace || localActiveWorkspace,
        workspaceState,
        toolPreferences,
        permissions: workspaceState?.effectivePermissions || [],
        profile,
        roleProfile,
        platformContext,
      }),
    [
      account,
      activeWorkspace,
      localActiveWorkspace,
      platformContext,
      preferences,
      profile,
      roleProfile,
      toolPreferences,
      user,
      workspaceContextActive,
      workspaceState,
    ]
  );
  const profileToolGraph = useMemo(
    () => ({
      ...buildProfileToolGraph({ tools, profile: compiledProfile.segmentationProfile }),
      visibleTools: compiledProfile.tools.visible,
      recommendedTools: compiledProfile.tools.recommended,
      restrictedTools: compiledProfile.tools.restricted,
      counts: {
        ...buildProfileToolGraph({ tools, profile: compiledProfile.segmentationProfile }).counts,
        visible: compiledProfile.tools.visible.length,
        recommended: compiledProfile.tools.recommended.length,
        restricted: compiledProfile.tools.restricted.length,
      },
    }),
    [compiledProfile, tools],
  );
  const roleAssetRecommendations = useMemo(() => {
    if (workspaceRecommendations.length) {
      return workspaceRecommendations.map((recommendation) => ({
        id: recommendation.assetId,
        reason: recommendation.reason,
      }));
    }
    return getRoleIntelligenceAssetRecommendations({
      tools,
      profile: roleIntelligenceProfile,
      limit: 24,
    });
  }, [roleIntelligenceProfile, tools, workspaceRecommendations]);
  const recommendedIds = useMemo(
    () => roleAssetRecommendations.map((recommendation) => recommendation.id),
    [roleAssetRecommendations]
  );
  const accessGroups = useMemo(
    () =>
      groupToolsByAccessView(allToolsWithAccess, {
        favorites,
        recent: recentTools,
        recommendedIds,
      }),
    [allToolsWithAccess, favorites, recentTools, recommendedIds]
  );
  const allToolIds = useMemo(() => tools.map((tool) => tool.id), [tools]);
  const workspaceToolIds = useMemo(
    () =>
      visibleAssetIds?.length
        ? visibleAssetIds
        : isAllToolsWorkspace
        ? allToolIds
        : localActiveWorkspace
          ? localActiveWorkspace.toolIds || []
          : allToolIds,
    [localActiveWorkspace, allToolIds, isAllToolsWorkspace, visibleAssetIds]
  );
  const workspaceToolIdSet = useMemo(() => new Set(workspaceToolIds), [workspaceToolIds]);
  const workspaceInventoryCount = useMemo(
    () =>
      isAllToolsWorkspace
        ? tools.length
        : tools.filter((tool) => workspaceToolIdSet.has(tool.id)).length,
    [isAllToolsWorkspace, tools, workspaceToolIdSet]
  );
  const pinnedToolIdSet = useMemo(() => new Set(pinned), [pinned]);
  const favoriteToolIdSet = useMemo(() => new Set(favorites), [favorites]);
  const hiddenToolIdSet = useMemo(() => new Set(hiddenTools), [hiddenTools]);
  const profileFilteredTools = useMemo(
    () =>
      [
        'recommended',
        'all',
        'calculator',
        'clinical-tools',
        'ai-workflows',
        'simulations',
        'laboratory',
        'maps-iot',
        'operations',
        'governance',
        'favorites',
        'recent',
      ].includes(toolFilter)
        ? tools
        : filterToolsForProfileGraph(profileToolGraph, toolFilter),
    [profileToolGraph, toolFilter, tools]
  );
  const workspaceTools = useMemo(
    () =>
      profileFilteredTools.filter((tool) => {
        return isAllToolsWorkspace || workspaceToolIdSet.has(tool.id);
      }),
    [isAllToolsWorkspace, profileFilteredTools, toolFilter, workspaceToolIdSet]
  );
  const workspaceRecommendedTools = useMemo(
    () =>
      profileToolGraph.recommendedTools.filter(
        (tool) => isAllToolsWorkspace || workspaceToolIdSet.has(tool.id)
      ),
    [isAllToolsWorkspace, profileToolGraph.recommendedTools, workspaceToolIdSet]
  );
  const searchQuery = normalizeSearch(search);
  const searchTokens = useMemo(() => searchQuery.split(/\s+/).filter(Boolean), [searchQuery]);
  const recentToolItems = useMemo(
    () =>
      recentTools
        .map((toolId) => toolById[toolId])
        .filter((tool) => tool && (isAllToolsWorkspace || workspaceToolIdSet.has(tool.id))),
    [isAllToolsWorkspace, recentTools, toolById, workspaceToolIdSet]
  );
  const handleWorkspaceChange = async (workspaceId) => {
    await switchWorkspace(workspaceId);
    await switchIdentityWorkspace?.(workspaceId);
  };
  const filteredTools = useMemo(() => {
    let base = workspaceTools;
    if (toolFilter === 'recommended') base = workspaceRecommendedTools;
    else if (toolFilter === 'all') base = isAllToolsWorkspace ? accessGroups.permitted : workspaceTools;
    else if (toolFilter === 'favorites') base = accessGroups.favorites;
    else if (toolFilter === 'recent') base = recentToolItems;

    return base.filter((tool) => {
      if (toolFilter !== 'all' && !matchesToolFilter(tool, toolFilter)) return false;
      if (!searchTokens.length) return true;
      const text = toolSearchBlob(tool);
      return searchTokens.every((token) => text.includes(token));
    });
  }, [
    workspaceTools,
    searchTokens,
    toolFilter,
    accessGroups,
    isAllToolsWorkspace,
    recentToolItems,
    workspaceRecommendedTools,
  ]);
  const activeToolRequest = requestedOpenTool || requestedSearch;
  const activeTool = useMemo(
    () => resolveActiveTool(allToolsWithAccess, activeToolRequest, filteredTools),
    [activeToolRequest, allToolsWithAccess, filteredTools]
  );
  const requestedActiveToolMissing = Boolean(requestedOpenTool && !activeTool);

  const closeActiveTool = () => {
    const params = new URLSearchParams(searchParams);
    const activeIdentities = new Set(toolIdentityValues(activeTool));
    const q = normalizeSearch(params.get('q'));
    const searchValue = normalizeSearch(params.get('search'));
    const qTool = resolveActiveTool(allToolsWithAccess, q);
    const searchTool = resolveActiveTool(allToolsWithAccess, searchValue);
    params.delete('open');
    params.delete('tool');
    params.delete('calc');
    if (activeIdentities.has(q) || qTool) params.delete('q');
    if (activeIdentities.has(searchValue) || searchTool) params.delete('search');
    setSearch(params.get('q') || params.get('search') || '');
    setSearchParams(params, { state: location.state });
  };

  const clearSearchAndFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('open');
    params.delete('tool');
    params.delete('calc');
    params.delete('q');
    params.delete('search');
    setSearch('');
    setToolFilter(routeDefaultFilter);
    setSearchParams(params, { state: location.state });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      trackRoleSearchBehavior({
        search,
        resultCount: filteredTools.length,
        filter: toolFilter,
        profile: roleIntelligenceProfile,
        source: 'tools-overview',
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [filteredTools.length, roleIntelligenceProfile, search, toolFilter]);

  const handleToolClick = (tool) => {
    if (tool.isLaunchable === false) return;
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      roleIntelligenceProfile,
      context: accessContext,
    });
  };

  const handleAssistantLaunch = (tool) => {
    if (tool.isLaunchable === false) return;
    const launch = resolveCatalogLaunch(tool.id);
    recordToolAccess(tool.id);
    trackRoleAssetUsage(
      { registryId: tool.id, mode: 'chat-assisted', pathname: CANONICAL_ROUTES.emergencyCopilot },
      { profile: roleIntelligenceProfile, source: 'tools-overview-assistant' }
    );
    selectTool(tool.id);
    setActiveTool(tool.id);
    addMessage(
      launch.chatSeed ||
        `Help me use ${tool.name} as clinical decision support only. Ask for any context needed before recommending next steps.`,
      'user'
    );
    navigateProfileAware(navigate, CANONICAL_ROUTES.emergencyCopilot, {
      emergencyRole,
      saasRole: roleProfile?.id || saasProfile?.role,
      context: accessContext,
    });
  };

  const orderedTools = useMemo(() => {
    const pinnedTools = [] as any[];
    const unpinnedTools = [] as any[];
    for (const tool of filteredTools) {
      if (pinnedToolIdSet.has(tool.id)) {
        pinnedTools.push(tool);
      } else {
        unpinnedTools.push(tool);
      }
    }
    return [...pinnedTools, ...unpinnedTools];
  }, [filteredTools, pinnedToolIdSet]);
  const showWorkspaceEmpty = !isAllToolsWorkspace && workspaceInventoryCount === 0;
  const showSearchEmpty = !showWorkspaceEmpty && filteredTools.length === 0;
  const visibleToolFilterValues = PILOT_CUSTOMER_MODE.enabled
    ? PILOT_TOOL_FILTER_VALUES
    : COMMON_TOOL_FILTER_VALUES;
  const filterTabs = TOOL_FILTER_OPTIONS.filter((option) => visibleToolFilterValues.has(option.value));
  const emptyStateCopy =
    hiddenTools.length > 0
      ? 'No tools match this view. Some tools are hidden by your preferences; restore them from Profile > Tool preferences or switch filters.'
      : 'No launchable tools match the current search and filter. Try a clinical alias or reset the filters.';
  const showCalculatorHub =
    !activeTool &&
    !requestedActiveToolMissing &&
    (toolFilter === 'calculator' ||
      requestedSource === 'calculators' ||
      searchParams.has('open') ||
      searchParams.has('tool') ||
      searchParams.has('calc'));

  const toolsDescription =
    roleIntelligenceProfile.toolsSubtitle ||
    workspaceExperience.toolsSubtitle ||
    'Calculators, clinical tools, and human-reviewed AI workflows for case review.';

  return (
    <div className={`tools-overview${PILOT_CUSTOMER_MODE.enabled ? ' tools-overview--compact' : ''}`}>
      <CareDroidPage
        eyebrow="Clinical decision support"
        title={roleIntelligenceProfile.toolsTitle || workspaceExperience.toolsTitle || 'Medical Tools'}
        description={surfaces.tools.showOverviewContextRow ? toolsDescription : CAREDROID_PRODUCT.safetyShort}
        leadingIcon={<NavIcon icon={CHROME_ICONS.tools} size={24} />}
        className="tools-overview-shell"
        contentClassName="tools-overview-shell__content"
      >
          {surfaces.tools.showOverviewContextRow ? (
          <div className="tools-overview-context-row">
            <div className="tools-workspace-os" aria-label="Active workspace operating mode">
              <strong>{workspaceExperience.operatingLabel}</strong>
              <span>{workspaceExperience.modeSummary}</span>
            </div>
            <div className="tools-profile-summary" aria-label="Profile tool graph summary">
              <span>{roleIntelligenceProfile.roleLabel}</span>
              <span>{workspaceExperience.shortLabel}</span>
              <span>{profile.specialty}</span>
              <span>{workspaceRecommendedTools.length} recommended</span>
            </div>
          </div>
          ) : null}
          {surfaces.tools.showOverviewExecutionLegend ? (
          <details className="tools-execution-legend tools-execution-legend--compact" aria-label="Technical and medical execution modes">
            <summary>How tools run</summary>
            <div className="tools-execution-legend__body">
              <p>Each mode connects the technical path to the medical safety boundary.</p>
              <div className="tools-execution-legend__items">
                {EXECUTION_MODE_LEGEND.map((mode) => (
                  <div key={mode.tone} className="tools-execution-legend__item">
                    <span className={`tools-execution-badge tools-execution-badge--${mode.tone}`}>
                      {mode.label}
                    </span>
                    <span>{mode.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
          ) : null}
          <div className="tools-workspace">
            <label htmlFor="workspaceSelect">Workspace</label>
            <select
              id="workspaceSelect"
              value={activeWorkspaceId}
              onChange={(e) => {
                void handleWorkspaceChange(e.target.value);
              }}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          <div
            className="tools-discovery-controls"
            role="search"
            aria-label="Search and filter all tools"
          >
            <label className="tools-search-field">
              <span>Search tools</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try pe-score, bleeding risk, kidney function…"
                aria-label="Search all tools"
              />
            </label>
            {!PILOT_CUSTOMER_MODE.enabled ? (
            <label className="tools-filter-field">
              <span>Filter</span>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                aria-label="Filter tools by type"
              >
                {TOOL_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            ) : null}
          </div>
          <div className="tools-filter-tabs" role="group" aria-label="Tool category filters">
            {filterTabs.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={toolFilter === option.value}
                aria-label={option.value === 'all' ? 'All' : option.label}
                className={`tools-filter-tab${toolFilter === option.value ? ' tools-filter-tab--active' : ''}`}
                onClick={() => setToolFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {surfaces.tools.showOverviewHeaderStats ? (
          <div className="header-stats">
            <div className="stat">
              <span className="stat-number">{profileToolGraph.counts.visible}</span>
              <span className="stat-label">Visible</span>
            </div>
            <div className="stat">
              <span className="stat-number">{filteredTools.length}</span>
              <span className="stat-label">
                {searchQuery || toolFilter !== 'all'
                  ? 'Matching'
                  : isAllToolsWorkspace
                    ? 'Shown'
                    : 'Workspace tools'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-number">{workspaceRecommendedTools.length}</span>
              <span className="stat-label">Recommended</span>
            </div>
          </div>
          ) : null}

      {activeTool ? (
        <ActiveToolSurface
          tool={activeTool}
          executorCatalog={executorCatalog}
          onClose={closeActiveTool}
          onAssistantLaunch={handleAssistantLaunch}
          onToolLaunch={handleToolClick}
        />
      ) : null}

      {requestedActiveToolMissing ? (
        <UnknownActiveToolSurface requestedTool={requestedOpenTool} onClose={closeActiveTool} />
      ) : null}

      {showCalculatorHub ? (
        <section
          className="tools-calculator-surface"
          aria-label="Clinical calculator launch surface"
        >
          <ClinicalCalculatorHub />
        </section>
      ) : null}

      <section className="tools-recent" aria-labelledby="tools-workflow-stitch-title">
        <div className="tools-recent-header">
          <h2 id="tools-workflow-stitch-title" className="tools-recent-title">
            <span className="tools-recent-title-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.clipboardList} size={22} />
            </span>
            <span>Continue into workflow</span>
          </h2>
          <p>Turn the current tool context into a workflow, result trail, or recommendation path.</p>
        </div>
        <div className="tools-recent-list">
          <button
            type="button"
            className="tools-recent-card"
            onClick={() =>
              navigateProfileAware(
                navigate,
                `${CANONICAL_ROUTES.emergencyTools}?source=workflows&filter=ai-workflows`,
                { emergencyRole, saasRole: roleProfile?.id || saasProfile?.role, context: accessContext },
              )
            }
          >
            <span className="tools-recent-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.clipboardList} size={22} />
            </span>
            <div className="tools-recent-info">
              <span className="tools-recent-name">Build workflow</span>
              <span className="tools-recent-category">Use selected tools as workflow blocks</span>
            </div>
            <span className="tools-recent-action">Continue →</span>
          </button>
          <button
            type="button"
            className="tools-recent-card"
            onClick={() =>
              navigateProfileAware(
                navigate,
                `${CANONICAL_ROUTES.emergencyTools}?source=recommendations&filter=recommended`,
                { emergencyRole, saasRole: roleProfile?.id || saasProfile?.role, context: accessContext },
              )
            }
          >
            <span className="tools-recent-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.sparkles} size={22} />
            </span>
            <div className="tools-recent-info">
              <span className="tools-recent-name">Recommended next action</span>
              <span className="tools-recent-category">Pick the next best route from this context</span>
            </div>
            <span className="tools-recent-action">Open →</span>
          </button>
        </div>
      </section>

      {recentToolItems.length > 0 && (
        <div className="tools-recent">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">
              <span className="tools-recent-title-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.clock} size={22} />
              </span>
              <span>Recent Tools</span>
            </h2>
            <p>Pick up where you left off with your most used tools.</p>
          </div>
          <div className="tools-recent-list">
            {recentToolItems.slice(0, 3).map((tool) => (
              <button
                key={tool.id}
                className="tools-recent-card"
                onClick={() => handleToolClick(tool)}
                type="button"
              >
                <span className="tools-recent-icon" aria-hidden>
                  <NavIcon icon={getToolIcon(tool.id)} size={22} />
                </span>
                <div className="tools-recent-info">
                  <span className="tools-recent-name">{tool.name}</span>
                  <span className="tools-recent-category">{tool.category}</span>
                </div>
                <span className="tools-recent-action">{primaryActionLabel(tool)} →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showWorkspaceEmpty ? (
        <div className="tools-recent">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">No tools in this workspace</h2>
            <p>This workspace does not include any launchable tools from the current inventory.</p>
          </div>
          <button
            type="button"
            className="btn-open-tool"
            onClick={() => setActiveWorkspaceId('all')}
          >
            Show all tools →
          </button>
        </div>
      ) : showSearchEmpty ? (
        <div className="tools-recent" role="status">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">No matching tools</h2>
            <p>{emptyStateCopy}</p>
          </div>
          <button
            type="button"
            className="btn-open-tool"
            onClick={clearSearchAndFilters}
          >
            Clear search and filters →
          </button>
        </div>
      ) : (
        <div className="tools-grid">
          {orderedTools.map((tool) => {
            const executionMode = executionModeForTool(tool, executorCatalog);
            return (
              <div
                key={tool.id}
                data-tool-id={tool.id}
                className="tool-card-large"
                aria-disabled={tool.isLaunchable === false}
              >
              <div className="tool-card-header">
                <div className="tool-icon">
                  <span aria-hidden>
                    <NavIcon icon={getToolIcon(tool.id)} size={28} />
                  </span>
                </div>
                <div className="tool-meta">
                  <h3>{tool.name}</h3>
                  <span className="tool-category">{tool.category}</span>
                  <span
                    className={`tool-category tool-category--lifecycle tool-category--lifecycle-${tool.lifecycleState}`}
                  >
                    {lifecycleLabel(tool)}
                  </span>
                  {tool.accessLabel ? (
                    <span
                      className={`tool-category tool-category--access tool-category--access-${tool.accessState}`}
                    >
                      {tool.accessLabel}
                    </span>
                  ) : null}
                  <span className={`tools-execution-badge tools-execution-badge--${executionMode.tone}`}>
                    {executionMode.label}
                  </span>
                  {tool.surface === 'chat-assisted' ? (
                    <span className="tool-category tool-category--guided">Guided</span>
                  ) : null}
                  {recommendedIds.includes(tool.id) ? (
                    <span className="tool-category tool-category--guided">
                      Recommended for {roleIntelligenceProfile.roleLabel}
                    </span>
                  ) : null}
                  {tool.restrictionReason ? (
                    <span className="tool-category tool-category--restricted">
                      {tool.restrictionReason}
                    </span>
                  ) : null}
                </div>
                <div className="tool-card-actions">
                  <button
                    className={`tool-card-action ${favoriteToolIdSet.has(tool.id) ? 'active' : ''}`}
                    title={
                      favoriteToolIdSet.has(tool.id) ? 'Remove from favorites' : 'Add to favorites'
                    }
                    aria-label={`${favoriteToolIdSet.has(tool.id) ? 'Remove' : 'Add'} ${tool.name} ${favoriteToolIdSet.has(tool.id) ? 'from' : 'to'} favorites`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(tool.id);
                    }}
                    type="button"
                  >
                    <NavIcon
                      icon={CHROME_ICONS.star}
                      size={16}
                      fill={favoriteToolIdSet.has(tool.id) ? 'currentColor' : 'none'}
                      aria-hidden
                    />
                  </button>
                  <button
                    className={`tool-card-action ${pinnedToolIdSet.has(tool.id) ? 'active' : ''}`}
                    title={pinnedToolIdSet.has(tool.id) ? 'Unpin tool' : 'Pin tool'}
                    aria-label={`${pinnedToolIdSet.has(tool.id) ? 'Unpin' : 'Pin'} ${tool.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinned(tool.id);
                    }}
                    type="button"
                  >
                    <NavIcon icon={CHROME_ICONS.pin} size={16} aria-hidden />
                  </button>
                  <button
                    className={`tool-card-action ${hiddenToolIdSet.has(tool.id) ? 'active' : ''}`}
                    title={
                      hiddenToolIdSet.has(tool.id)
                        ? 'Show tool by default'
                        : 'Hide from default views'
                    }
                    aria-label={`${hiddenToolIdSet.has(tool.id) ? 'Show' : 'Hide'} ${tool.name} by default`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(tool.id);
                    }}
                    type="button"
                  >
                    <NavIcon icon={CHROME_ICONS.close} size={16} aria-hidden />
                  </button>
                  <div className="tool-shortcut">
                    {tool.shortcut ? tool.shortcut.replace('Ctrl+', '⌘') : 'Open'}
                  </div>
                </div>
              </div>

              <p className="tool-description">{tool.description}</p>
              {tool.restrictionReason || tool.isLaunchable === false ? (
                <p className="tool-restriction-note">
                  Unavailable: {tool.restrictionReason || accessRestrictionCopy(tool)}
                </p>
              ) : null}

              <div className="tool-features">
                <h4>Key Features:</h4>
                <ul>
                  {(tool.features || []).slice(0, 3).map((feature, idx) => (
                    <li key={idx}>
                      <span className="feature-icon" aria-hidden>
                        <NavIcon icon={CHROME_ICONS.check} size={14} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="tool-use-cases">
                <h4>Use Cases:</h4>
                <div className="use-cases-tags">
                  {tool.useCases.slice(0, 3).map((useCase, idx) => (
                    <span key={idx} className="use-case-tag">
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>

              <div className="tool-actions">
                <button
                  className="btn-open-tool"
                  disabled={Boolean(tool.restrictionReason) || tool.isLaunchable === false}
                  aria-label={`${primaryActionLabel(tool)} ${tool.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToolClick(tool);
                  }}
                >
                  {primaryActionLabel(tool)} →
                </button>
                {hasMeaningfulAssistantAction(tool) &&
                !tool.restrictionReason &&
                tool.isLaunchable !== false ? (
                  <button
                    className="btn-chat-tool"
                    aria-label={`Ask Assistant about ${tool.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssistantLaunch(tool);
                    }}
                  >
                    Ask Assistant
                  </button>
                ) : null}
              </div>
              </div>
            );
          })}
        </div>
      )}

      {!PILOT_CUSTOMER_MODE.enabled ? (
      <div className="tools-tips">
        <h2 className="tools-tips-title">
          <NavIcon icon={CHROME_ICONS.lightbulb} size={28} />
          How to act
        </h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.checkCircle} size={32} />
            </span>
            <h3>Choose an action</h3>
            <p>Start from a card instead of learning route names or command phrasing.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.messageCircle} size={32} />
            </span>
            <h3>Ask Assistant</h3>
            <p>
              Send context to Assistant when you want guidance, preview, or confirmation before
              acting.
            </p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.download} size={32} />
            </span>
            <h3>Verify results</h3>
            <p>Outputs remain attached to the session so you can review, edit, share, or retry.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.bot} size={32} />
            </span>
            <h3>Power stays underneath</h3>
            <p>
              Existing backend commands and deterministic executors still run behind the simpler
              surface.
            </p>
          </div>
        </div>
      </div>
      ) : null}
      </CareDroidPage>
    </div>
  );
};

export default ToolsOverview;
