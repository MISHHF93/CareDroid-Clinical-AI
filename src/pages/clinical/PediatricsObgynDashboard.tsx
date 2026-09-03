import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in PediatricsObgynAssistantPage.tsx but were only reachable nested
 * under /emergency/tools/pediatrics/:toolId.
 */
const CARDS = [
  {
    to: '/emergency/tools/pediatrics/pediatric-command-center',
    title: 'Pediatric command center',
    description:
      'PEWS/deterioration, sepsis context, BP screening, growth trends, unresolved review items.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pediatrics/pediatric-sepsis-assistant',
    title: 'Pediatric sepsis assistant',
    description:
      'Infection concern, age-adjusted vitals, perfusion, mental status, labs, and missing data.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pediatrics/pregnancy-workflow-assistant',
    title: 'Pregnancy workflow assistant',
    description:
      'Gestational age, dating, maternal symptoms, fetal movement, bleeding/fluid context, labs, handoff.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pediatrics/neonatal-assessment-assistant',
    title: 'Neonatal assessment assistant',
    description:
      'Apgar, temperature, feeding, glucose, bilirubin, growth percentiles, screenings, and red flags.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pediatrics/ob-triage-assistant',
    title: 'OB triage assistant',
    description:
      'Symptoms, gestational age, fetal concerns, bleeding, fluid leakage, contractions, severe features.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/pediatrics/neonatal-dashboard',
    title: 'Neonatal dashboard',
    description:
      'Vitals, feeding, weight, bilirubin, growth, screening, data freshness, and review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pediatrics/maternal-monitoring-dashboard',
    title: 'Maternal monitoring dashboard',
    description:
      'Vitals, symptoms, labs, fetal context, postpartum/antepartum status, and review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pediatrics/growth-trend-analytics',
    title: 'Growth trend analytics',
    description:
      'Serial anthropometrics, percentile changes, corrected age context, and measurement quality.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/pediatrics/perinatal-risk-dashboard',
    title: 'Perinatal risk dashboard',
    description:
      'Maternal, fetal, delivery, neonatal, bilirubin/growth follow-up, and handoff queues.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function PediatricsObgynDashboard() {
  useRouteChromeRegistration({ title: 'Pediatrics & OB/GYN' });
  return (
    <SpecialtyHubLayout
      className="pediatrics-obgyn-page"
      iconKey="pediatrics-obgyn"
      title="Pediatrics & OB/GYN"
      description="Pediatric sepsis, pregnancy, neonatal, and OB triage decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
