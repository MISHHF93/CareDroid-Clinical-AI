import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import ToolPageLayout from './ToolPageLayout';
import ToolNotFound from './ToolNotFound';
import { useConversation } from '../../contexts/ConversationContext';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { clinicalIntentToolsById } from '../../data/clinicalIntentToolCatalog';
import { toolRegistryById } from '../../data/toolRegistry';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';

const PEDIATRICS_OBGYN_WORKFLOW_DETAIL = Object.freeze({
  'pediatric-sepsis-assistant': {
    tier: 'Tier B',
    lead: 'Structured pediatric sepsis review for infection concern, age-adjusted vitals, perfusion, mental status, labs, and missing data.',
    checkpoints: [
      'No sepsis diagnosis',
      'No fluid, antibiotic, or vasopressor dosing',
      'Pediatric sepsis pathways take priority',
    ],
  },
  'pregnancy-workflow-assistant': {
    tier: 'Tier B',
    lead: 'Pregnancy workflow review for gestational age, dating, maternal symptoms, fetal movement, bleeding/fluid context, labs, and handoff.',
    checkpoints: [
      'No pregnancy complication diagnosis',
      'No delivery timing recommendation',
      'Urgent maternal/fetal evaluation takes priority',
    ],
  },
  'neonatal-assessment-assistant': {
    tier: 'Tier B',
    lead: 'Neonatal assessment checklist for Apgar, temperature, feeding, glucose, bilirubin, growth percentiles, screenings, and red flags.',
    checkpoints: [
      'Does not replace NRP',
      'No treatment or disposition recommendation',
      'Urgent newborn pathways take priority',
    ],
  },
  'ob-triage-assistant': {
    tier: 'Tier B',
    lead: 'OB triage review for symptoms, gestational age, fetal concerns, bleeding, fluid leakage, contractions, and severe-feature prompts.',
    checkpoints: [
      'No diagnosis or disposition',
      'No medication/procedure recommendation',
      'Urgent OB triage takes priority',
    ],
  },
  'neonatal-dashboard': {
    tier: 'Tier C',
    lead: 'Neonatal dashboard concept for vitals, feeding, weight, bilirubin, growth, screening, data freshness, and review queues.',
    checkpoints: [
      'Monitoring visibility only',
      'No phototherapy or feeding recommendation',
      'Clinician review required',
    ],
  },
  'maternal-monitoring-dashboard': {
    tier: 'Tier C',
    lead: 'Maternal monitoring dashboard concept for vitals, symptoms, labs, fetal context, postpartum/antepartum status, and review queues.',
    checkpoints: [
      'Trend visibility only',
      'No autonomous escalation',
      'Urgent OB pathways remain primary',
    ],
  },
  'pediatric-command-center': {
    tier: 'Tier C',
    lead: 'Pediatric command-center concept for PEWS/deterioration, sepsis context, BP screening, growth trends, and unresolved review items.',
    checkpoints: [
      'Operations visibility only',
      'No treatment or transfer recommendation',
      'Pediatric clinician review required',
    ],
  },
  'growth-trend-analytics': {
    tier: 'Tier C',
    lead: 'Growth trend analytics concept for serial anthropometrics, percentile changes, corrected age context, and measurement quality.',
    checkpoints: [
      'Trend review only',
      'No growth diagnosis',
      'No nutrition or medication recommendation',
    ],
  },
  'perinatal-risk-dashboard': {
    tier: 'Tier C',
    lead: 'Perinatal risk dashboard concept for maternal, fetal, delivery, neonatal, bilirubin/growth follow-up, and handoff queues.',
    checkpoints: [
      'Visibility only',
      'No delivery or treatment recommendation',
      'Maternal/fetal/neonatal urgent pathways take priority',
    ],
  },
});

export default function PediatricsObgynAssistantPage() {
  const { toolId } = useParams();
  const { profileNavigate } = useProfileNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = PEDIATRICS_OBGYN_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Pediatrics / OB-GYN tool not found"
        description="This pediatrics and OB-GYN assistant route is not registered in the clinical tool catalog."
        showCatalogLink
      />
    );
  }

  const startAssistant = () => {
    selectTool?.(tool.id);
    setActiveTool?.(tool.id);
    if (launch.chatSeed) addMessage?.(launch.chatSeed, 'user');
    profileNavigate('/assistant');
  };

  return (
    <ToolPageLayout
      tool={tool}
      actions={
        <button
          type="button"
          className="btn-primary btn-primary--with-icon"
          onClick={startAssistant}
        >
          <NavIcon icon={CHROME_ICONS.message} size={16} aria-hidden />
          <span>Start guided assistant</span>
        </button>
      }
    >
      <section className="tool-section">
        <div className="tool-section-header">
          <h2>{detail.tier} pediatrics / OB-GYN workflow</h2>
          <p>{detail.lead}</p>
        </div>
        <div className="clinical-audit-summary-grid">
          {detail.checkpoints.map((checkpoint) => (
            <div key={checkpoint} className="clinical-audit-summary-card">
              <strong>{checkpoint}</strong>
              <span>
                Pediatric/OB decision support only; clinician review and local protocol remain
                required.
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <div className="tool-section-header">
          <h2>Safety Scope</h2>
          <p>
            This catalog-backed route seeds Assistant with pediatrics and OB-GYN warnings through{' '}
            <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not medication dosing, not treatment or delivery timing, not
            disposition, not autonomous monitoring, and not a substitute for NRP, pediatric sepsis,
            obstetric triage, maternal emergency, fetal assessment, neonatal jaundice, trauma,
            airway, or local urgent-care pathways.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
