import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in PsychiatryAssistantPage.tsx but were only reachable nested under
 * /emergency/tools/psychiatry/:toolId.
 */
const CARDS = [
  {
    to: '/emergency/tools/psychiatry/suicide-risk-workflow-assistant',
    title: 'Suicide-risk workflow assistant',
    description:
      'PHQ-9 item 9, Columbia workflow flags, intent/plan/behavior context, protective factors, direct handoff.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/psychiatry/mental-health-screening-assistant',
    title: 'Mental health screening assistant',
    description:
      'PHQ-9, GAD-7, PCL-5, MDQ, sleepiness, substance-use, cognitive, and missing-data review.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/psychiatry/substance-use-screening-assistant',
    title: 'Substance-use screening assistant',
    description:
      'AUDIT-C, CAGE, withdrawal/intoxication context, co-ingestion concerns, local referral prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/psychiatry/cognitive-screening-assistant',
    title: 'Cognitive screening assistant',
    description:
      'MMSE score entry, MoCA governance readiness, delirium flags, accommodations, collateral history.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/psychiatry/crisis-escalation-audit-log',
    title: 'Crisis escalation audit log',
    description:
      'PHQ-9 item 9, Columbia workflow flags, crisis-resource display, direct-review status, timestamps.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/psychiatry/behavioral-analytics-dashboard',
    title: 'Behavioral analytics dashboard',
    description:
      'Screening volumes, positive-screen queues, follow-up status, and safety-review gaps.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/psychiatry/screening-trend-engine',
    title: 'Screening trend engine',
    description:
      'Serial PHQ-9, GAD-7, PCL-5, MDQ, substance-use, sleepiness, and cognitive screening trends.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/psychiatry/psychiatry-monitoring-dashboard',
    title: 'Psychiatry monitoring dashboard',
    description:
      'Review queues, unresolved safety flags, repeated screens, and care-team handoff status.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/psychiatry/population-screening-dashboard',
    title: 'Population screening dashboard',
    description:
      'Panel-level screening completion, overdue follow-up, positive-screen queues, equity checks.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function PsychiatryDashboard() {
  useRouteChromeRegistration({ title: 'Psychiatry' });
  return (
    <SpecialtyHubLayout
      className="psychiatry-page"
      iconKey="psychiatry"
      title="Psychiatry"
      description="Suicide risk, screening, substance-use, and cognitive decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
