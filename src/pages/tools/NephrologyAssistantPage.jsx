import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ToolPageLayout from './ToolPageLayout';
import ToolNotFound from './ToolNotFound';
import { useConversation } from '../../contexts/ConversationContext';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { clinicalIntentToolsById } from '../../data/clinicalIntentToolCatalog';
import { toolRegistryById } from '../../data/toolRegistry';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';

const NEPHROLOGY_WORKFLOW_DETAIL = Object.freeze({
  'aki-staging-assistant': {
    tier: 'Tier B',
    lead: 'Structured AKI staging review for creatinine change, urine output context, timing, and escalation prompts.',
    checkpoints: ['KDIGO criteria context only', 'Verify baseline creatinine and timing', 'No fluid, diuretic, or dialysis directives'],
  },
  'dialysis-readiness-helper': {
    tier: 'Tier B',
    lead: 'Dialysis readiness checklist support for access status, symptoms, labs, volume context, and nephrology handoff.',
    checkpoints: ['Human nephrology review required', 'No autonomous dialysis initiation', 'Escalate emergencies through local pathways'],
  },
  'electrolyte-disorder-assistant': {
    tier: 'Tier B',
    lead: 'Electrolyte disorder assistant for pattern review, severity flags, missing data, and monitoring prompts.',
    checkpoints: ['Symptomatic or severe abnormalities need urgent review', 'No replacement or correction-rate orders', 'Medication dosing is out of scope'],
  },
  'renal-monitoring-dashboard': {
    tier: 'Tier C',
    lead: 'Renal monitoring dashboard concept for creatinine, eGFR, urine output, electrolyte, and acid-base review queues.',
    checkpoints: ['Trend support only', 'Surface missing data and rapid changes', 'No automated orders or escalation decisions'],
  },
  'ckd-progression-predictor': {
    tier: 'Tier C',
    lead: 'CKD progression workspace for eGFR slope, albuminuria context, KFRE inputs, and longitudinal review.',
    checkpoints: ['Prediction support only', 'Does not diagnose CKD chronicity', 'No transplant, referral, or therapy directives'],
  },
  'dialysis-utilization-tracker': {
    tier: 'Tier C',
    lead: 'Dialysis utilization tracker for schedule adherence, access context, missed treatments, and capacity review.',
    checkpoints: ['Operations visibility only', 'Does not change dialysis prescriptions', 'Requires dialysis team sign-off'],
  },
  'electrolyte-trend-engine': {
    tier: 'Tier C',
    lead: 'Electrolyte trend engine for sodium, potassium, bicarbonate, osmolality, and serial lab context.',
    checkpoints: ['Trend support only', 'No automated replacement or correction plans', 'Flag severe or symptomatic derangements'],
  },
  'fluid-balance-monitor': {
    tier: 'Tier C',
    lead: 'Fluid balance monitor for intake/output, weight change, urine output, and volume-status documentation.',
    checkpoints: ['Monitoring support only', 'No IV fluid or diuretic orders', 'Escalate shock, overload, or oliguria locally'],
  },
});

export default function NephrologyAssistantPage() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = NEPHROLOGY_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Nephrology tool not found"
        description="This nephrology assistant route is not registered in the clinical tool catalog."
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
          <h2>{detail.tier} nephrology workflow</h2>
          <p>{detail.lead}</p>
        </div>
        <div className="clinical-audit-summary-grid">
          {detail.checkpoints.map((checkpoint) => (
            <div key={checkpoint} className="clinical-audit-summary-card">
              <strong>{checkpoint}</strong>
              <span>Clinical decision support only; clinician review and local protocol remain required.</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <div className="tool-section-header">
          <h2>Safety Scope</h2>
          <p>
            This catalog-backed route seeds Assistant with nephrology-specific warnings through{' '}
            <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not dialysis authorization, not fluid prescription, and not medication dosing automation.
            Local AKI, electrolyte, acid-base, toxicology, critical-care, and nephrology pathways take priority.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
