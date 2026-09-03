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

const PULMONOLOGY_WORKFLOW_DETAIL = Object.freeze({
  'asthma-exacerbation-assistant': {
    tier: 'Tier B',
    lead: 'Structured asthma exacerbation review for severity features, reassessment prompts, and safety handoff.',
    checkpoints: [
      'Life-threatening features require urgent pathways',
      'Trend response over time',
      'No medication or disposition directives',
    ],
  },
  'ventilator-support-assistant': {
    tier: 'Tier B',
    lead: 'Ventilator support review for mode context, oxygenation/ventilation checks, alarms, and escalation prompts.',
    checkpoints: [
      'Bedside clinician and RT review required',
      'No autonomous ventilator setting changes',
      'Escalate shock or severe hypoxemia',
    ],
  },
  'oxygen-escalation-helper': {
    tier: 'Tier B',
    lead: 'Oxygen escalation checklist support across device context, work of breathing, ROX/PF ratio, and local policy.',
    checkpoints: [
      'Do not delay urgent oxygen escalation',
      'Local protocol governs device choice',
      'Serial reassessment required',
    ],
  },
  'copd-workflow-assistant': {
    tier: 'Tier B',
    lead: 'COPD workflow support for GOLD context, exacerbation concerns, oxygen safety, and handoff prompts.',
    checkpoints: [
      'Acute respiratory distress takes priority',
      'No inhaler, steroid, antibiotic, or oxygen prescriptions',
      'Confirm spirometry context',
    ],
  },
  'ventilator-monitoring-dashboard': {
    tier: 'Tier C',
    lead: 'Ventilator monitoring dashboard concept for oxygenation, ventilation, alarms, trends, and human review queues.',
    checkpoints: [
      'Does not change ventilator settings',
      'Requires RT/clinician sign-off',
      'Flags unresolved alarms and missing data',
    ],
  },
  'respiratory-telemetry-dashboard': {
    tier: 'Tier C',
    lead: 'Respiratory telemetry dashboard for SpO2, respiratory rate, oxygen device context, and deterioration signals.',
    checkpoints: [
      'No autonomous triage',
      'Escalate sustained desaturation locally',
      'Surface gaps and artifact',
    ],
  },
  'sleep-apnea-analytics': {
    tier: 'Tier C',
    lead: 'Sleep apnea analytics workspace for STOP-BANG context, symptoms, adherence trends, and review queues.',
    checkpoints: [
      'Screening analytics only',
      'Does not diagnose OSA',
      'No CPAP or device recommendations',
    ],
  },
  'pulmonary-trend-engine': {
    tier: 'Tier C',
    lead: 'Pulmonary trend support for oxygenation indices, symptoms, spirometry context, and serial respiratory observations.',
    checkpoints: [
      'Trend support only',
      'Acute deterioration needs immediate review',
      'Avoid diagnostic certainty from trends alone',
    ],
  },
  'respiratory-command-center': {
    tier: 'Tier C',
    lead: 'Respiratory command-center view for oxygen, ventilator, COPD/asthma, and sleep-review operational queues.',
    checkpoints: [
      'Human review required',
      'No automated orders or bed moves',
      'Summarize bottlenecks and unresolved alerts',
    ],
  },
});

export default function PulmonologyAssistantPage() {
  const { toolId } = useParams();
  const { profileNavigate } = useProfileNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = PULMONOLOGY_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Pulmonology tool not found"
        description="This pulmonology assistant route is not registered in the clinical tool catalog."
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
          <h2>{detail.tier} pulmonology workflow</h2>
          <p>{detail.lead}</p>
        </div>
        <div className="clinical-audit-summary-grid">
          {detail.checkpoints.map((checkpoint) => (
            <div key={checkpoint} className="clinical-audit-summary-card">
              <strong>{checkpoint}</strong>
              <span>
                Clinical decision support only; clinician review and local protocol remain required.
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <div className="tool-section-header">
          <h2>Safety Scope</h2>
          <p>
            This catalog-backed route seeds Assistant with pulmonology-specific warnings through{' '}
            <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not a treatment recommendation, and not a replacement for emergency
            respiratory, oxygen, ventilator, pneumonia, asthma, COPD, or sleep medicine pathways.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
