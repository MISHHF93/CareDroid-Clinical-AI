import { useNavigate } from 'react-router-dom';
import ContextInsightCard from '../components/ContextInsightCard';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './OperatingWorkspace.css';

const OPERATION_AREAS = Object.freeze([
  {
    title: 'Digital Twin',
    body: 'Open the operational twin for capacity, occupancy, device status, fleet readiness, and predictive signals.',
    path: CANONICAL_ROUTES.digitalTwin,
    icon: CHROME_ICONS.brain,
    label: 'Open twin',
  },
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
    icon: CHROME_ICONS.tools,
    label: 'Open devices',
  },
  {
    title: 'Medical IoT',
    body: 'Monitor connected medical devices, telemetry parameters, stale readings, and demo/device alert status.',
    path: CANONICAL_ROUTES.medicalIot,
    toolId: 'medical-iot-dashboard',
    icon: CHROME_ICONS.lineChart,
    label: 'Open IoT',
  },
  {
    title: 'Fleet map',
    body: 'Track mobile units and route status as a detail view under the unified Operations hub.',
    path: CANONICAL_ROUTES.fleetMap,
    toolId: 'fleet-live-map',
    icon: CHROME_ICONS.truck,
    label: 'Open fleet map',
  },
  {
    title: 'Live tracking map',
    body: 'Open the unified map for fleet, hospital device, and Medical IoT markers with demo tracking labels.',
    path: CANONICAL_ROUTES.liveMap,
    toolId: 'live-tracking-map',
    icon: CHROME_ICONS.shareLink,
    label: 'Open live map',
  },
  {
    title: 'Telemetry',
    body: 'Review telemetry freshness, stale readings, device signals, and operational monitoring context.',
    path: CANONICAL_ROUTES.medicalIot,
    toolId: 'telemetry-monitoring',
    icon: CHROME_ICONS.lineChart,
    label: 'Open telemetry',
  },
  {
    title: 'Fleet command',
    body: 'Monitor vehicle state, dispatch readiness, and live operational bottlenecks.',
    path: '/fleet/command',
    toolId: 'fleet-command',
    icon: CHROME_ICONS.tools,
    label: 'Open command',
  },
  {
    title: 'Route optimizer',
    body: 'Plan route sequencing while preserving human approval for dispatch decisions.',
    path: '/fleet/route-optimizer',
    toolId: 'route-optimizer',
    icon: CHROME_ICONS.shareLink,
    label: 'Optimize routes',
  },
  {
    title: 'Predictive maintenance',
    body: 'Inspect maintenance risk and fleet health signals in one operational area.',
    path: '/fleet/predictive-maintenance',
    toolId: 'predictive-maintenance',
    icon: CHROME_ICONS.alert,
    label: 'View maintenance',
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
          <NavIcon icon={CHROME_ICONS.tools} size={28} />
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
          onClick={() => navigate(CANONICAL_ROUTES.assistant)}
        >
          Ask Assistant
        </button>
      </section>

      <section className="operating-insights" aria-label="Operations context insights">
        <ContextInsightCard
          title="Suggested operations view"
          message="Start with the operational twin when you need a cross-module picture."
          source="Operations navigation"
          status="action-required"
          actionLabel="Open twin"
          actionRoute={CANONICAL_ROUTES.digitalTwin}
        />
        <ContextInsightCard
          title="Telemetry actions"
          message="Device, fleet, map, and telemetry routes are available as separate source views."
          source="Canonical routes"
          status="generated"
          actionLabel="Open live map"
          actionRoute={CANONICAL_ROUTES.liveMap}
        />
      </section>

      <section className="operating-section" aria-labelledby="operation-areas-title">
        <div className="operating-section__header">
          <h2 id="operation-areas-title">Operational areas</h2>
          <p>
            Detail pages remain available, but this hub is the single user-facing way to find
            operational maps, telemetry, alerts, and maintenance workflows.
          </p>
        </div>
        <div className="operating-card-grid">
          {OPERATION_AREAS.map((area) => (
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
    </section>
  );
}
