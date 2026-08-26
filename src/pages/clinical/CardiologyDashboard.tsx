import { Link } from 'react-router-dom';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './CardiologyDashboard.css';

type CardiologyCard = Readonly<{
  to: string;
  title: string;
  description: string;
}>;

/**
 * Fifth clinical department workspace, and the first built for a genuinely
 * new reason: real cardiology content already exists (10 workflow assistants
 * in CardiologyAssistantPage.tsx — ECG interpretation, STEMI pathway, ACS
 * workflow, AFib, heart failure, telemetry, arrhythmia risk, remote
 * monitoring, command center) but is only reachable nested under
 * /emergency/tools/cardiology/:toolId, i.e. trapped inside the ED tool
 * catalog rather than having a hospital-wide home. This hub gives cardiology
 * its own department entry point without moving or duplicating that content —
 * every card links to the real, existing route. Backed by a concrete 2026
 * signal: the Hospital OPPS Final Rule established CMS reimbursement for
 * AI-assisted cardiac analysis with new CPT Category I codes for AI-enabled
 * cardiac imaging interpretation, making cardiology the highest-signal next
 * specialty to surface as a first-class department.
 */
const CARDIOLOGY_CARDS: readonly CardiologyCard[] = [
  {
    to: '/emergency/tools/cardiology/cardiology-command-center',
    title: 'Cardiology command center',
    description: 'Cardiology queues, telemetry risk, ACS/stroke-adjacent alerts, and pending human review.',
  },
  {
    to: '/emergency/tools/cardiology/ecg-interpretation-assistant',
    title: 'ECG interpretation assistant',
    description: 'Structured rhythm, rate, intervals, ischemia flags, and urgent-care reminders.',
  },
  {
    to: '/emergency/tools/cardiology/stemi-pathway-assistant',
    title: 'STEMI pathway assistant',
    description: 'Recognition, activation, contraindication review, and handoff preparation.',
  },
  {
    to: '/emergency/tools/cardiology/acs-workflow-assistant',
    title: 'ACS workflow assistant',
    description: 'ECG, biomarkers, serial reassessment, and risk-score selection (HEART/TIMI/GRACE).',
  },
  {
    to: '/emergency/tools/cardiology/atrial-fibrillation-assistant',
    title: 'Atrial fibrillation assistant',
    description: 'Stability review, stroke/bleeding score selection (CHA2DS2-VASc, HAS-BLED), handoff prompts.',
  },
  {
    to: '/emergency/tools/cardiology/heart-failure-assistant',
    title: 'Heart failure assistant',
    description: 'Staging, congestion context, telemetry concerns, and escalation prompts.',
  },
  {
    to: '/emergency/tools/cardiology/cardiac-telemetry-analyzer',
    title: 'Cardiac telemetry analyzer',
    description: 'Rhythm events, sustained alerts, gaps, and human-reviewed escalation summaries.',
  },
  {
    to: '/emergency/tools/cardiology/arrhythmia-risk-classifier',
    title: 'Arrhythmia risk classifier',
    description: 'Concern-level classification from symptoms, telemetry, and comorbidity context.',
  },
  {
    to: '/emergency/tools/cardiology/remote-cardiology-monitoring-dashboard',
    title: 'Remote monitoring dashboard',
    description: 'Patient-reported symptoms, vitals, alerts, and review queues.',
  },
];

export default function CardiologyDashboard() {
  useRouteChromeRegistration({ title: 'Cardiology' });

  return (
    <main className="cardiology-page" aria-label="Cardiology dashboard">
      <header className="cardiology-page__header">
        <div className="cardiology-page__title-row">
          <GraphicIconBadge iconKey="cardiology" accent="brand" size="md" />
          <div>
            <p className="cardiology-page-title-text" data-testid="cd-page-title-text">Cardiology</p>
            <p>ECG, ACS, arrhythmia, and heart-failure decision support in one place.</p>
          </div>
        </div>
        <div className="cardiology-page__actions">
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.tools}>Risk calculators (HEART, GRACE, TIMI...)</Link>
        </div>
      </header>

      <section className="cardiology-page__grid" aria-label="Cardiology destinations">
        {CARDIOLOGY_CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="cardiology-page__card">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
