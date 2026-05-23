import { useNavigate } from 'react-router-dom';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './OperatingWorkspace.css';

const PATIENT_ACTIONS = Object.freeze([
  {
    title: 'Summarize active case',
    body: 'Build a clinician-reviewed problem, medication, lab, alert, and risk summary.',
    path: '/tools/patient-summary-ai',
    icon: CHROME_ICONS.clipboardList,
    label: 'Open summary AI',
  },
  {
    title: 'Review clinical timeline',
    body: 'Organize encounters, trends, and abnormal progression into a timeline workspace.',
    path: '/tools/timeline-ai',
    icon: CHROME_ICONS.clock,
    label: 'Open timeline AI',
  },
  {
    title: 'Draft documentation',
    body: 'Use ambient scribe and documentation workflows while keeping clinician review explicit.',
    path: '/tools/ambient-scribe',
    icon: CHROME_ICONS.fileEdit,
    label: 'Open documentation AI',
  },
  {
    title: 'Prepare orders',
    body: 'Generate order-set suggestions with safety limits, protocol pathways, and explainability.',
    path: '/tools/order-set-ai',
    icon: CHROME_ICONS.clipboardList,
    label: 'Open order set AI',
  },
]);

export default function Patients() {
  const navigate = useNavigate();

  return (
    <main className="operating-workspace" aria-labelledby="patients-title">
      <section className="operating-hero">
        <div className="operating-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.users} size={28} />
        </div>
        <div className="operating-hero__copy">
          <p className="operating-eyebrow">Patient context</p>
          <h1 id="patients-title">Patients</h1>
          <p>
            Start from the active case, then bring summaries, timelines, notes, and order workflows into Assistant.
          </p>
        </div>
        <button type="button" className="operating-primary-action" onClick={() => navigate('/assistant')}>
          Ask Assistant
        </button>
      </section>

      <section className="operating-section" aria-labelledby="patient-actions-title">
        <div className="operating-section__header">
          <h2 id="patient-actions-title">Case workflows</h2>
          <p>Patient-facing AI stays reviewable and routes through existing protected tool surfaces.</p>
        </div>
        <div className="operating-card-grid">
          {PATIENT_ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              className="operating-card"
              onClick={() => navigate(action.path)}
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
    </main>
  );
}
