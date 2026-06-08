import { Link, useNavigate } from 'react-router-dom';
import { InsightCard, SectionHeader, StatusBadge } from '../components/ui/CareDroidPrimitives';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
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

export default function Operations() {
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();

  const launchArea = (area) => {
    if (!area.toolId) {
      navigate(area.path);
      return;
    }

    applyRegistryToolLaunch(area.toolId, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
    });
  };

  return (
    <section className="operating-workspace" aria-labelledby="operations-title">
      <section className="operating-hero">
        <div className="operating-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.activity} size={28} />
        </div>
        <div className="operating-hero__copy">
          <p className="operating-eyebrow">Operational command</p>
          <h1 id="operations-title">Operations</h1>
          <p>
            Digital Twin, Hospital Map, Medical IoT, Devices, Fleet, Live Map, Alerts, Telemetry,
            and Maintenance live together here so operations feels like one system.
          </p>
        </div>
        <button
          type="button"
          className="operating-primary-action"
          onClick={() => navigate(CANONICAL_ROUTES.digitalTwin)}
        >
          Open twin
        </button>
      </section>

      <section className="operating-insights" aria-label="Operations context insights">
        <InsightCard
          eyebrow="Recommended"
          title="Suggested operations view"
          description="Start with the operational twin when you need a cross-module picture."
          badge={<StatusBadge status="warning">Action</StatusBadge>}
        />
        <InsightCard
          eyebrow="Canonical routes"
          title="Telemetry actions"
          description="Device, fleet, map, and telemetry source views remain available as drill-downs from this hub."
          badge={<StatusBadge status="generated">Generated</StatusBadge>}
        />
      </section>

      <section className="operating-section" aria-labelledby="operation-areas-title">
        <SectionHeader
          id="operation-areas-title"
          title="Operational areas"
          description="Detail pages remain available, but this hub is the single user-facing way to find operational maps, telemetry, alerts, and maintenance workflows."
        />
        <div className="operating-card-grid">
          {PRIMARY_OPERATION_AREAS.map((area) => (
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
        </div>
      </section>

      <section className="operating-section" aria-labelledby="operation-drilldowns-title">
        <SectionHeader
          id="operation-drilldowns-title"
          title="Drill-downs"
          description="Lower-level map, fleet, routing, and maintenance tools stay reachable without becoming competing dashboard cards."
        />
        <div className="operating-drilldown-list">
          {OPERATION_DRILLDOWNS.slice(0, 3).map((area) => (
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
        </div>
      </section>

      <section className="operating-section" aria-labelledby="operation-intelligence-title">
        <SectionHeader
          id="operation-intelligence-title"
          title="Operations intelligence"
          description="Analysis routes from the operations sidebar stay discoverable from the hub."
        />
        <div className="operating-drilldown-list">
          {OPERATION_INTELLIGENCE.slice(0, 2).map((area) => (
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
        </div>
      </section>

      <section className="operating-section" aria-labelledby="operation-continuations-title">
        <SectionHeader
          id="operation-continuations-title"
          title="Continue from Operations"
          description="Operations does not end at a hub. Continue into workflow, result review, recommendations, or Assistant."
        />
        <div className="operating-drilldown-list">
          {OPERATION_CONTINUATIONS.map((action) => (
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
        </div>
      </section>
    </section>
  );
}
