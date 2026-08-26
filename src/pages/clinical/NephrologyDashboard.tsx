import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in NephrologyAssistantPage.tsx but were only reachable nested under
 * /emergency/tools/nephrology/:toolId. This gives Nephrology its own
 * hospital-wide department home without moving or duplicating that content.
 */
const CARDS = [
  {
    to: '/emergency/tools/nephrology/aki-staging-assistant',
    title: 'AKI staging assistant',
    description: 'Creatinine change, urine output context, timing, and escalation prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/nephrology/dialysis-readiness-helper',
    title: 'Dialysis readiness helper',
    description: 'Access status, symptoms, labs, volume context, and nephrology handoff.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/nephrology/electrolyte-disorder-assistant',
    title: 'Electrolyte disorder assistant',
    description: 'Pattern review, severity flags, missing data, and monitoring prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/nephrology/renal-monitoring-dashboard',
    title: 'Renal monitoring dashboard',
    description: 'Creatinine, eGFR, urine output, electrolyte, and acid-base review queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/nephrology/ckd-progression-predictor',
    title: 'CKD progression predictor',
    description: 'eGFR slope, albuminuria context, KFRE inputs, and longitudinal review.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/nephrology/dialysis-utilization-tracker',
    title: 'Dialysis utilization tracker',
    description: 'Schedule adherence, access context, missed treatments, and capacity review.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/nephrology/electrolyte-trend-engine',
    title: 'Electrolyte trend engine',
    description: 'Sodium, potassium, bicarbonate, osmolality, and serial lab context.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/nephrology/fluid-balance-monitor',
    title: 'Fluid balance monitor',
    description: 'Intake/output, weight change, urine output, and volume-status documentation.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function NephrologyDashboard() {
  useRouteChromeRegistration({ title: 'Nephrology' });
  return (
    <SpecialtyHubLayout
      className="nephrology-page"
      iconKey="nephrology"
      title="Nephrology"
      description="AKI, dialysis, electrolyte, and CKD decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
