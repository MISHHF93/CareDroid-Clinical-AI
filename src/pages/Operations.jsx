import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardGrid,
  DashboardSection,
  InsightCard,
  PageShell,
  StatusBadge,
} from '../components/ui/CareDroidPrimitives';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import {
  buildWorkspaceAssistantPrompt,
  getWorkspaceExperienceProfile,
} from '../data/workspaceExperience';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  filterOperationAreas,
  resolveOperationsResonanceDescription,
  resolveOperationsResonanceTitle,
} from '../config/operationsProfileModel';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import useProfileNavigate from '../hooks/useProfileNavigate';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getWorkspaceIcon } from '../navigation/iconRegistry';
import './OperatingWorkspace.css';

const PRIMARY_OPERATION_AREAS = Object.freeze([
  {
    title: 'Clinical alerts',
    body: 'Review priority clinical signals and route the next action into Assistant when needed.',
    path: '/clinical/alerts',
    icon: CHROME_ICONS.siren,
    label: 'Review alerts',
  },
  {
    title: 'Hospital map',
    body: 'View floors, rooms, beds, medical devices, telemetry freshness, alerts, and maintenance context.',
    path: CANONICAL_ROUTES.hospitalMap,
    toolId: 'hospital-map',
    icon: CHROME_ICONS.hospital,
    label: 'Open map',
  },
  {
    title: 'Device fleet management',
    body: 'Review medical device inventory, assignment, maintenance, calibration, firmware, battery, and demo-only action states.',
    path: CANONICAL_ROUTES.devices,
    toolId: 'device-fleet-management',
    icon: CHROME_ICONS.smartphone,
    label: 'Open devices',
  },
  {
    title: 'Medical IoT',
    body: 'Monitor connected devices, telemetry parameters, stale readings, and demo/device alert status.',
    path: CANONICAL_ROUTES.medicalIot,
    toolId: 'medical-iot-dashboard',
    icon: CHROME_ICONS.activity,
    label: 'Open IoT',
  },
]);

const OPERATION_DRILLDOWNS = Object.freeze([
  {
    title: 'Fleet Map',
    body: 'Track mobile units and route status as a detail view under the unified Operations hub.',
    path: CANONICAL_ROUTES.fleetMap,
    toolId: 'fleet-live-map',
    icon: CHROME_ICONS.truck,
    label: 'Open fleet map',
  },
  {
    title: 'Live Map',
    body: 'Open the unified map for fleet, hospital device, and Medical IoT markers with demo tracking labels.',
    path: CANONICAL_ROUTES.liveMap,
    toolId: 'live-tracking-map',
    icon: CHROME_ICONS.shareLink,
    label: 'Open live map',
  },
  {
    title: 'Fleet Command',
    body: 'Monitor vehicle state, dispatch readiness, and live operational bottlenecks.',
    path: '/fleet/command',
    toolId: 'fleet-command',
    icon: CHROME_ICONS.truck,
    label: 'Open command',
  },
  {
    title: 'Route Optimizer',
    body: 'Plan route sequencing while preserving human approval for dispatch decisions.',
    path: '/fleet/route-optimizer',
    toolId: 'route-optimizer',
    icon: CHROME_ICONS.route,
    label: 'Optimize routes',
  },
  {
    title: 'Predictive Maintenance',
    body: 'Inspect maintenance risk and fleet health signals in one operational area.',
    path: '/fleet/predictive-maintenance',
    toolId: 'predictive-maintenance',
    icon: CHROME_ICONS.alert,
    label: 'View maintenance',
  },
]);

const OPERATION_INTELLIGENCE = Object.freeze([
  {
    title: 'Workflow Mining',
    body: 'Find repeated journeys, operational bottlenecks, and workflow improvement opportunities.',
    path: CANONICAL_ROUTES.workflowMining,
    icon: CHROME_ICONS.clipboardList,
    label: 'Mine workflows',
  },
  {
    title: 'Workspace Graph',
    body: 'Trace dependencies between workspaces, routes, tools, and operating context.',
    path: CANONICAL_ROUTES.workspaceDependencyGraph,
    icon: CHROME_ICONS.shareLink,
    label: 'Open graph',
  },
  {
    title: 'Twin Intelligence',
    body: 'Review digital twin insights, bottlenecks, and cross-system intelligence.',
    path: CANONICAL_ROUTES.digitalTwinIntelligence,
    icon: CHROME_ICONS.brain,
    label: 'Open twin AI',
  },
  {
    title: 'Usage',
    body: 'Inspect usage, adoption, and route-level activity for operational accountability.',
    path: CANONICAL_ROUTES.usage,
    icon: CHROME_ICONS.barChart,
    label: 'Open usage',
  },
]);

const OPERATION_CONTINUATIONS = Object.freeze([
  {
    title: 'Build operations workflow',
    body: 'Turn an alert, device, map, or fleet route into a reviewable workflow chain.',
    path: `${CANONICAL_ROUTES.workflows}?source=operations`,
    icon: CHROME_ICONS.clipboardList,
  },
  {
    title: 'Review operation results',
    body: 'Open the unified timeline for workflow, telemetry, fleet, and alert result trails.',
    path: `${CANONICAL_ROUTES.timeline}?kind=workflow`,
    icon: CHROME_ICONS.clock,
  },
  {
    title: 'Recommended next action',
    body: 'Choose the next best operational action from recommendations.',
    path: `${CANONICAL_ROUTES.recommendations}?source=operations`,
    icon: CHROME_ICONS.sparkles,
  },
  {
    title: 'Ask Assistant',
    body: 'Ask Assistant to connect operational context to the next workflow or result review.',
    path: CANONICAL_ROUTES.assistant,
    icon: CHROME_ICONS.bot,
  },
]);

const WORKSPACE_OPERATION_PRIORITIES = Object.freeze({
  emergency: ['Clinical alerts', 'Hospital map', 'Medical IoT', 'Device fleet management'],
  'medical-iot': ['Medical IoT', 'Device fleet management', 'Hospital map', 'Live Map'],
  operations: ['Hospital map', 'Device fleet management', 'Medical IoT', 'Clinical alerts'],
  fleet: ['Fleet Map', 'Fleet Command', 'Route Optimizer', 'Predictive Maintenance'],
});

function cssToken(value = 'default') {
  return String(value || 'default').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function workspaceThemeStyle(experience) {
  return {
    '--workspace-os-accent': experience.theme?.accent,
    '--workspace-os-surface': experience.theme?.surface,
    '--workspace-os-border': experience.theme?.border,
  };
}

function getWorkspaceOperationAreas(workspaceId) {
  const itemByTitle = Object.fromEntries(
    [...PRIMARY_OPERATION_AREAS, ...OPERATION_DRILLDOWNS].map((area) => [area.title, area])
  );
  const priorityTitles = WORKSPACE_OPERATION_PRIORITIES[workspaceId] || WORKSPACE_OPERATION_PRIORITIES.operations;
  return priorityTitles.map((title) => itemByTitle[title]).filter(Boolean);
}

export default function Operations() {
  const { profileNavigate } = useProfileNavigate();
  const { saasRole } = useEffectiveUserProfile();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const workspaceExperience = useMemo(
    () => getWorkspaceExperienceProfile(activeWorkspace),
    [activeWorkspace]
  );
  const workspaceOperationAreas = useMemo(
    () => getWorkspaceOperationAreas(workspaceExperience.id || activeWorkspaceId),
    [activeWorkspaceId, workspaceExperience.id]
  );
  const workspaceOperationTitles = useMemo(
    () => new Set(workspaceOperationAreas.map((area) => area.title)),
    [workspaceOperationAreas]
  );
  const workspaceDrilldowns = useMemo(
    () => OPERATION_DRILLDOWNS.filter((area) => !workspaceOperationTitles.has(area.title)).slice(0, 3),
    [workspaceOperationTitles]
  );
  const WorkspaceIcon = useMemo(
    () => getWorkspaceIcon(activeWorkspace?.icon || activeWorkspace?.workspaceProfile?.icon),
    [activeWorkspace?.icon, activeWorkspace?.workspaceProfile?.icon]
  );

  const visiblePrimaryAreas = useMemo(
    () => filterOperationAreas(saasRole, workspaceOperationAreas),
    [saasRole, workspaceOperationAreas],
  );
  const visibleDrilldowns = useMemo(
    () => filterOperationAreas(saasRole, workspaceDrilldowns),
    [saasRole, workspaceDrilldowns],
  );
  const visibleIntelligence = useMemo(
    () => filterOperationAreas(saasRole, OPERATION_INTELLIGENCE),
    [saasRole],
  );
  const visibleContinuations = useMemo(
    () => filterOperationAreas(saasRole, OPERATION_CONTINUATIONS),
    [saasRole],
  );
  const operationsTitle = useMemo(() => resolveOperationsResonanceTitle(saasRole), [saasRole]);
  const operationsDescription = useMemo(
    () => resolveOperationsResonanceDescription(saasRole),
    [saasRole],
  );

  const launchArea = (area) => {
    if (!area.toolId) {
      profileNavigate(area.path);
      return;
    }

    applyRegistryToolLaunch(area.toolId, {
      navigate: profileNavigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      context: { saasRole },
    });
  };

  const launchWorkspaceAssistant = () => {
    addMessage(
      buildWorkspaceAssistantPrompt(
        `What should operations focus on next in ${workspaceExperience.label}?`,
        workspaceExperience
      ),
      'user'
    );
    profileNavigate(CANONICAL_ROUTES.assistant);
  };

  return (
    <PageShell
      className={`operating-workspace operating-workspace--${cssToken(workspaceExperience.tone)} operating-workspace--workspace-${cssToken(workspaceExperience.id)}`}
      contentClassName="cd-page-stack cd-page-stack--compact operating-workspace__content"
      data-workspace-os={workspaceExperience.id}
      style={workspaceThemeStyle(workspaceExperience)}
      eyebrow={operationsTitle}
      title={`${workspaceExperience.shortLabel} Operations`}
      description={operationsDescription || workspaceExperience.modeSummary}
      actions={
        <button
          type="button"
          className="operating-primary-action"
          onClick={launchWorkspaceAssistant}
        >
          Ask {workspaceExperience.assistantTitle}
        </button>
      }
    >
      <DashboardGrid className="operating-insights" aria-label="Operations context insights">
        <InsightCard
          eyebrow={workspaceExperience.environment}
          title={`${workspaceExperience.shortLabel} priority`}
          description={(workspaceExperience.operatingBrief || [workspaceExperience.dashboardSubtitle])[0]}
          badge={<StatusBadge status="warning">Action</StatusBadge>}
        />
        <InsightCard
          eyebrow="Workspace context"
          title={workspaceExperience.dashboardTitle}
          description={workspaceExperience.dashboardSubtitle}
          badge={<StatusBadge status="generated">Generated</StatusBadge>}
        />
      </DashboardGrid>

      <DashboardSection
        className="operating-section"
        aria-labelledby="operation-areas-title"
        titleId="operation-areas-title"
        leadingIcon={<NavIcon icon={WorkspaceIcon} size={22} />}
          title={`${workspaceExperience.shortLabel} operational areas`}
          description="These are the first operational actions for the active workspace. Other maps, telemetry, and fleet views stay available as drill-downs."
      >
        <DashboardGrid className="operating-card-grid">
          {visiblePrimaryAreas.map((area) => (
            <button
              key={area.title}
              type="button"
              className="operating-card"
              onClick={() => launchArea(area)}
            >
              <span className="operating-card__icon" aria-hidden>
                <NavIcon icon={area.icon} size={22} />
              </span>
              <span className="operating-card__title">{area.title}</span>
              <span className="operating-card__body">{area.body}</span>
              <span className="operating-card__action">{area.label}</span>
            </button>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="operating-section"
        aria-labelledby="operation-drilldowns-title"
        titleId="operation-drilldowns-title"
        title="Drill-downs"
        description={`Lower-level routes stay reachable without competing with ${workspaceExperience.shortLabel} priorities.`}
      >
        <DashboardGrid className="operating-drilldown-list">
          {visibleDrilldowns.map((area) => (
            <button
              key={area.title}
              type="button"
              className="operating-drilldown"
              onClick={() => launchArea(area)}
            >
              <span className="operating-drilldown__icon" aria-hidden>
                <NavIcon icon={area.icon} size={18} />
              </span>
              <span>
                <strong>{area.title}</strong>
                <small>{area.label}</small>
              </span>
            </button>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="operating-section"
        aria-labelledby="operation-intelligence-title"
        titleId="operation-intelligence-title"
        title="Operations intelligence"
        description="Analysis routes from the operations sidebar stay discoverable from the hub."
      >
        <DashboardGrid className="operating-drilldown-list">
          {visibleIntelligence.slice(0, 2).map((area) => (
            <button
              key={area.title}
              type="button"
              className="operating-drilldown"
              onClick={() => launchArea(area)}
            >
              <span className="operating-drilldown__icon" aria-hidden>
                <NavIcon icon={area.icon} size={18} />
              </span>
              <span>
                <strong>{area.title}</strong>
                <small>{area.label}</small>
              </span>
            </button>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="operating-section"
        aria-labelledby="operation-continuations-title"
        titleId="operation-continuations-title"
        title={`Continue from ${workspaceExperience.shortLabel} Operations`}
        description="Continue into workspace-aware workflows, result review, recommendations, or Assistant."
      >
        <DashboardGrid className="operating-drilldown-list">
          {visibleContinuations.map((action) => (
            <Link
              key={action.title}
              className="operating-drilldown"
              to={action.path}
            >
              <span className="operating-drilldown__icon" aria-hidden>
                <NavIcon icon={action.icon} size={18} />
              </span>
              <span>
                <strong>{action.title}</strong>
                <small>{action.body}</small>
              </span>
            </Link>
          ))}
        </DashboardGrid>
      </DashboardSection>
    </PageShell>
  );
}
