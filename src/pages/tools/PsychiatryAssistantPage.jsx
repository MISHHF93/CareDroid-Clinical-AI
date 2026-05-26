import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ToolPageLayout from './ToolPageLayout';
import ToolNotFound from './ToolNotFound';
import { useConversation } from '../../contexts/ConversationContext';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { clinicalIntentToolsById } from '../../data/clinicalIntentToolCatalog';
import { toolRegistryById } from '../../data/toolRegistry';
import { CRISIS_SENSITIVE_SAFETY_MESSAGE } from '../../utils/psychiatryScreeningCalculators';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';

const PSYCHIATRY_WORKFLOW_DETAIL = Object.freeze({
  'mental-health-screening-assistant': {
    tier: 'Tier B',
    lead: 'Guided behavioral-health screening workflow for PHQ-9, GAD-7, PCL-5, MDQ, sleepiness, substance-use, cognitive, and missing-data review.',
    checkpoints: ['No diagnosis', 'No medication or therapy advice', 'Crisis and human review checks required'],
  },
  'suicide-risk-workflow-assistant': {
    tier: 'Tier B',
    lead: 'Suicide-risk workflow support for PHQ-9 item 9, Columbia workflow flags, intent/plan/behavior context, protective factors, and direct handoff.',
    checkpoints: ['Immediate safety assessment priority', 'No risk clearance', 'Direct clinician/crisis review required'],
  },
  'substance-use-screening-assistant': {
    tier: 'Tier B',
    lead: 'Substance-use screening workflow for AUDIT-C, CAGE, withdrawal/intoxication context, co-ingestion concerns, and local referral prompts.',
    checkpoints: ['No substance-use diagnosis', 'No detox or medication advice', 'Withdrawal/intoxication pathways take priority'],
  },
  'cognitive-screening-assistant': {
    tier: 'Tier B',
    lead: 'Cognitive screening workflow for MMSE score entry, MoCA governance readiness, delirium flags, accommodations, collateral history, and review planning.',
    checkpoints: ['No dementia diagnosis', 'No capacity determination', 'Acute confusion pathways take priority'],
  },
  'behavioral-analytics-dashboard': {
    tier: 'Tier C',
    lead: 'Behavioral analytics dashboard concept for screening volumes, positive-screen queues, follow-up status, and safety-review gaps.',
    checkpoints: ['Population visibility only', 'No automated diagnosis', 'Human review required'],
  },
  'screening-trend-engine': {
    tier: 'Tier C',
    lead: 'Screening trend engine concept for serial PHQ-9, GAD-7, PCL-5, MDQ, substance-use, sleepiness, and cognitive screening trends.',
    checkpoints: ['Trend visibility only', 'No treatment recommendation', 'Clinician interpretation required'],
  },
  'psychiatry-monitoring-dashboard': {
    tier: 'Tier C',
    lead: 'Psychiatry monitoring dashboard concept for review queues, unresolved safety flags, repeated screens, and care-team handoff status.',
    checkpoints: ['Monitoring support only', 'No autonomous escalation', 'Crisis pathways remain primary'],
  },
  'crisis-escalation-audit-log': {
    tier: 'Tier C',
    lead: 'Crisis escalation audit log concept for PHQ-9 item 9, Columbia workflow flags, crisis-resource display, direct-review status, and audit timestamps.',
    checkpoints: ['Audit visibility only', 'No risk clearance', 'Immediate safety workflows take priority'],
  },
  'population-screening-dashboard': {
    tier: 'Tier C',
    lead: 'Population screening dashboard concept for panel-level screening completion, overdue follow-up, positive-screen queues, and equity/data-quality checks.',
    checkpoints: ['Population health visibility only', 'No individual diagnosis', 'Human review required'],
  },
});

export default function PsychiatryAssistantPage() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = PSYCHIATRY_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Psychiatry screening tool not found"
        description="This psychiatry and screening assistant route is not registered in the clinical tool catalog."
        showCatalogLink
      />
    );
  }

  const startAssistant = () => {
    selectTool?.(tool.id);
    setActiveTool?.(tool.id);
    if (launch.chatSeed) addMessage?.(launch.chatSeed, 'user');
    navigate('/assistant');
  };

  return (
    <ToolPageLayout
      tool={tool}
      actions={
        <button type="button" className="btn-primary btn-primary--with-icon" onClick={startAssistant}>
          <NavIcon icon={CHROME_ICONS.message} size={16} aria-hidden />
          <span>Start guided assistant</span>
        </button>
      }
    >
      <section className="tool-section">
        <div className="tool-section-header">
          <h2>{detail.tier} psychiatry and screening workflow</h2>
          <p>{detail.lead}</p>
        </div>
        <div className="clinical-audit-summary-grid">
          {detail.checkpoints.map((checkpoint) => (
            <div key={checkpoint} className="clinical-audit-summary-card">
              <strong>{checkpoint}</strong>
              <span>Mental-health decision support only; qualified human review and local protocols remain required.</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <div className="tool-section-header">
          <h2>Safety Scope</h2>
          <p>
            This catalog-backed route seeds Assistant with psychiatry and suicide-safety guardrails through{' '}
            <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not medication advice, not psychotherapy advice, not a capacity determination, not risk
            clearance, and not autonomous monitoring. Human clinical review is required for every result.
          </p>
          <p className="calc-disclaimer-detail">{CRISIS_SENSITIVE_SAFETY_MESSAGE}</p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
