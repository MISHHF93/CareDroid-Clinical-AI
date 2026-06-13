import { useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './OperatingWorkspace.css';

const PATIENT_ACTIONS = Object.freeze([
  {
    title: 'Open patient context',
    body: 'Review imported context, timeline, risk score history, documentation, and care-plan state.',
    path: '/patients/demo-patient/workspace',
    icon: CHROME_ICONS.users,
    label: 'Open patient',
  },
  {
    title: 'Import EHR patient context',
    body: 'Preview patient, lab, medication, observation, and vitals imports before any writeback.',
    path: '/patients/import',
    icon: CHROME_ICONS.upload,
    label: 'Open import preview',
  },
  {
    title: 'Summarize active patient',
    body: 'Build a clinician-reviewed problem, medication, lab, alert, and risk summary.',
    path: '/patients/demo-patient/summary',
    icon: CHROME_ICONS.clipboardList,
    label: 'Open summary AI',
  },
  {
    title: 'Review clinical timeline',
    body: 'Organize encounters, trends, and abnormal progression into a patient timeline.',
    path: '/patients/demo-patient/timeline',
    icon: CHROME_ICONS.clock,
    label: 'Open timeline AI',
  },
  {
    title: 'Draft documentation',
    body: 'Use ambient scribe and documentation workflows while keeping clinician review explicit.',
    path: '/patients/demo-patient/documentation',
    icon: CHROME_ICONS.fileEdit,
    label: 'Open documentation',
  },
  {
    title: 'Build AI workflows',
    body: 'Route existing tools into patient-aware, cited, auditable workflows.',
    path: '/patients/demo-patient/workflows',
    icon: CHROME_ICONS.clipboardList,
    label: 'Open workflows',
  },
]);

export default function Patients() {
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();

  const launchAction = (action) => {
    if (!action.toolId) {
      navigate(action.path);
      return;
    }

    applyRegistryToolLaunch(action.toolId, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
    });
  };

  return (
    <section className="operating-workspace" aria-labelledby="patients-title">
      <section className="operating-hero">
        <div className="operating-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.users} size={28} />
        </div>
        <div className="operating-hero__copy">
          <p className="operating-eyebrow">Patient context</p>
          <h1 id="patients-title">Patients</h1>
          <p>
            Start from the active patient, then bring summaries, timelines, notes, and order workflows into Assistant.
          </p>
        </div>
        <button type="button" className="operating-primary-action" onClick={() => navigate('/assistant')}>
          Ask Assistant
        </button>
      </section>

      <section className="operating-section" aria-labelledby="patient-actions-title">
        <div className="operating-section__header">
          <h2 id="patient-actions-title">Patient workflows</h2>
          <p>Patient-facing AI stays reviewable and routes through existing protected tool surfaces.</p>
        </div>
        <div className="operating-card-grid">
          {PATIENT_ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              className="operating-card"
              onClick={() => launchAction(action)}
            >
              <span className="operating-card__icon" aria-hidden>
                <NavIcon icon={action.icon} size={22} />
              </span>
              <span className="operating-card__title">{action.title}</span>
              <span className="operating-card__body">{action.body}</span>
              <span className="operating-card__action">{action.label}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
