import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in NeurologyAssistantPage.tsx but were only reachable nested under
 * /emergency/tools/neurology/:toolId. This gives Neurology its own
 * hospital-wide department home without moving or duplicating that content.
 */
const CARDS = [
  {
    to: '/emergency/tools/neurology/stroke-command-center',
    title: 'Stroke command center',
    description:
      'Activation queues, last-known-well, imaging milestones, handoff status, unresolved review items.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/neurology/stroke-workflow-assistant',
    title: 'Stroke workflow assistant',
    description:
      'Last-known-well, deficits, NIHSS context, imaging status, contraindication prompts, handoff.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/neurology/seizure-assistant',
    title: 'Seizure assistant',
    description:
      'Witnessed events, recovery, triggers, antiseizure medication context, and missing data.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/neurology/headache-red-flag-assistant',
    title: 'Headache red-flag assistant',
    description:
      'Thunderclap onset, neuro deficits, infection, pregnancy/postpartum, cancer, trauma, age context.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/neurology/vertigo-hints-assistant',
    title: 'Vertigo / HINTS assistant',
    description: 'Continuous vertigo, nystagmus, head impulse, skew, hearing, and gait context.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/neurology/neuro-exam-assistant',
    title: 'Neuro exam assistant',
    description:
      'Mental status, cranial nerves, motor, sensory, coordination, gait, reflexes, localization prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/neurology/neuro-telemetry-dashboard',
    title: 'Neuro telemetry dashboard',
    description: 'Neuro checks, GCS/NIHSS trends, seizures, ICP/EVD context, and gaps.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/neurology/neuro-monitoring-engine',
    title: 'Neuro monitoring engine',
    description:
      'Serial exams, consciousness scores, pupillary data, ICP context, and review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/neurology/eeg-trend-dashboard',
    title: 'EEG trend dashboard',
    description:
      'EEG status, seizure burden context, artifact, report freshness, and review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/neurology/neurology-timeline-ai',
    title: 'Neurology timeline AI',
    description: 'Symptom onset, exams, imaging, EEG, interventions, and handoff chronology.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function NeurologyDashboard() {
  useRouteChromeRegistration({ title: 'Neurology' });
  return (
    <SpecialtyHubLayout
      className="neurology-page"
      iconKey="neurology"
      title="Neurology"
      description="Stroke, seizure, headache, and neuro-exam decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
