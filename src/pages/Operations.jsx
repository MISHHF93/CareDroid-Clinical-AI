import { useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './OperatingWorkspace.css';

const OPERATION_AREAS = Object.freeze([
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
    path: '/hospital-map',
    toolId: 'hospital-map',
    icon: CHROME_ICONS.hospital,
    label: 'Open map',
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
  {
    title: 'Analytics',
    body: 'Track usage and performance indicators for clinical and operational workflows.',
    path: '/analytics',
    icon: CHROME_ICONS.lineChart,
    label: 'Open analytics',
  },
  {
    title: 'Audit logs',
    body: 'Review access and trust events without exposing audit tooling as a clinician catalog.',
    path: '/audit-logs',
    icon: CHROME_ICONS.shield,
    label: 'Open audit',
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
    <main className="operating-workspace" aria-labelledby="operations-title">
      <section className="operating-hero">
        <div className="operating-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.tools} size={28} />
        </div>
        <div className="operating-hero__copy">
          <p className="operating-eyebrow">Operational command</p>
          <h1 id="operations-title">Operations</h1>
          <p>
            Fleet, alerts, analytics, and audit surfaces live together here so operations feels like one system.
          </p>
        </div>
        <button type="button" className="operating-primary-action" onClick={() => navigate('/assistant')}>
          Ask Assistant
        </button>
      </section>

      <section className="operating-section" aria-labelledby="operation-areas-title">
        <div className="operating-section__header">
          <h2 id="operation-areas-title">Operational areas</h2>
          <p>Each card preserves existing routes while reducing top-level navigation sprawl.</p>
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
    </main>
  );
}
