import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in EndocrineMetabolicAssistantPage.tsx but were only reachable
 * nested under /emergency/tools/endocrine/:toolId.
 */
const CARDS = [
  {
    to: '/emergency/tools/endocrine/continuous-glucose-command-center',
    title: 'CGM command center',
    description: 'Telemetry freshness, hypo/hyperglycemia patterns, sensor gaps, and unresolved queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/endocrine/diabetes-care-assistant',
    title: 'Diabetes care assistant',
    description: 'Glucose trends, A1c context, safety flags, complications, and missing data.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/endocrine/dka-pathway-assistant',
    title: 'DKA pathway assistant',
    description: 'Glucose, ketones, anion gap, bicarbonate, osmolality, potassium, and handoff prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/endocrine/thyroid-disorder-assistant',
    title: 'Thyroid disorder assistant',
    description: 'TSH/T4 context, symptoms, pregnancy/medication caveats, red flags, and follow-up gaps.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/endocrine/metabolic-syndrome-assistant',
    title: 'Metabolic syndrome assistant',
    description: 'Waist, glucose, blood pressure, triglycerides, HDL, and missing-data prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/endocrine/glucose-telemetry-dashboard',
    title: 'Glucose telemetry dashboard',
    description: 'CGM/point-of-care glucose trends, freshness, and review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/endocrine/insulin-trend-engine',
    title: 'Insulin trend engine',
    description: 'Documented administrations and glucose response context, without dose recommendations.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/endocrine/endocrine-monitoring-system',
    title: 'Endocrine monitoring system',
    description: 'Glucose, thyroid, calcium, sodium/osmolality, anthropometrics, and critical-value queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/endocrine/metabolic-analytics',
    title: 'Metabolic analytics',
    description: 'Anthropometrics, glucose/lipid context, metabolic syndrome factors, and review queues.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function EndocrinologyDashboard() {
  useRouteChromeRegistration({ title: 'Endocrinology' });
  return (
    <SpecialtyHubLayout
      className="endocrinology-page"
      iconKey="endocrinology"
      title="Endocrinology"
      description="Diabetes, DKA, thyroid, and metabolic decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
