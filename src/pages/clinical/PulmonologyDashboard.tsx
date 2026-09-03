import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in PulmonologyAssistantPage.tsx but were only reachable nested under
 * /emergency/tools/pulmonology/:toolId.
 */
const CARDS = [
  {
    to: '/emergency/tools/pulmonology/respiratory-command-center',
    title: 'Respiratory command center',
    description: 'Oxygen, ventilator, COPD/asthma, and sleep-review operational queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pulmonology/asthma-exacerbation-assistant',
    title: 'Asthma exacerbation assistant',
    description: 'Severity features, reassessment prompts, and safety handoff.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pulmonology/ventilator-support-assistant',
    title: 'Ventilator support assistant',
    description: 'Mode context, oxygenation/ventilation checks, alarms, and escalation prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pulmonology/oxygen-escalation-helper',
    title: 'Oxygen escalation helper',
    description: 'Device context, work of breathing, ROX/PF ratio, and local policy.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pulmonology/copd-workflow-assistant',
    title: 'COPD workflow assistant',
    description: 'GOLD context, exacerbation concerns, oxygen safety, and handoff prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pulmonology/ventilator-monitoring-dashboard',
    title: 'Ventilator monitoring dashboard',
    description: 'Oxygenation, ventilation, alarms, trends, and human review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pulmonology/respiratory-telemetry-dashboard',
    title: 'Respiratory telemetry dashboard',
    description: 'SpO2, respiratory rate, oxygen device context, and deterioration signals.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pulmonology/sleep-apnea-analytics',
    title: 'Sleep apnea analytics',
    description: 'STOP-BANG context, symptoms, adherence trends, and review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pulmonology/pulmonary-trend-engine',
    title: 'Pulmonary trend engine',
    description:
      'Oxygenation indices, symptoms, spirometry context, and serial respiratory observations.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function PulmonologyDashboard() {
  useRouteChromeRegistration({ title: 'Pulmonology' });
  return (
    <SpecialtyHubLayout
      className="pulmonology-page"
      iconKey="pulmonology"
      title="Pulmonology"
      description="Asthma, ventilator, oxygen, and COPD decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
