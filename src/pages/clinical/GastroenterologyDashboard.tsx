import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import SpecialtyHubLayout from '../../components/clinical/SpecialtyHubLayout';

/**
 * Same pattern as CardiologyDashboard: real workflow assistants already
 * exist in GastroenterologyAssistantPage.tsx but were only reachable nested
 * under /emergency/tools/gastroenterology/:toolId. This gives GI its own
 * hospital-wide department home without moving or duplicating that content.
 */
const CARDS = [
  {
    to: '/emergency/tools/gastroenterology/gi-command-center',
    title: 'GI command center',
    description: 'Bleed, liver, pancreatitis, endoscopy, and surveillance queues in one view.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/gi-bleed-workflow-assistant',
    title: 'GI bleed workflow assistant',
    description: 'Glasgow-Blatchford/Rockall context, hemodynamics, medications, and handoff prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/liver-disease-assistant',
    title: 'Liver disease assistant',
    description: 'Child-Pugh, MELD/MELD-Na, Maddrey DF, FIB-4/APRI, trends, and missing data.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/pancreatitis-workflow-assistant',
    title: 'Pancreatitis workflow assistant',
    description: 'Ranson, BISAP, organ-failure context, trends, and missing-data prompts.',
    tier: 'Tier B' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/gi-surveillance-dashboard',
    title: 'GI surveillance dashboard',
    description: 'Endoscopy follow-up, pathology gaps, recall queues, and human review tracking.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/hepatic-trend-analytics',
    title: 'Hepatic trend analytics',
    description: 'Synthetic function, cholestasis, platelets, MELD/Child-Pugh inputs, and missing labs.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/endoscopy-workflow-assistant',
    title: 'Endoscopy workflow assistant',
    description: 'Indication, preparation status, risk context, documentation, and follow-up queues.',
    tier: 'Tier C' as const,
  },
  {
    to: '/emergency/tools/gastroenterology/cirrhosis-monitoring-engine',
    title: 'Cirrhosis monitoring engine',
    description: 'Decompensation features, liver scores, surveillance gaps, and review queues.',
    tier: 'Tier C' as const,
  },
];

const ACTIONS = [
  { to: CANONICAL_ROUTES.dashboard, label: 'Command dashboard' },
  { to: CANONICAL_ROUTES.laboratory, label: 'Laboratory' },
  { to: CANONICAL_ROUTES.tools, label: 'Tools overview' },
];

export default function GastroenterologyDashboard() {
  useRouteChromeRegistration({ title: 'Gastroenterology' });
  return (
    <SpecialtyHubLayout
      className="gastroenterology-page"
      iconKey="gastroenterology"
      title="Gastroenterology"
      description="GI bleed, liver disease, pancreatitis, and endoscopy decision support in one place."
      actions={ACTIONS}
      cards={CARDS}
    />
  );
}
