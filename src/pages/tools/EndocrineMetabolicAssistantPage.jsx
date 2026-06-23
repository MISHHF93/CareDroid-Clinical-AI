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

const ENDOCRINE_METABOLIC_WORKFLOW_DETAIL = Object.freeze({
  'diabetes-care-assistant': {
    tier: 'Tier B',
    lead: 'Structured diabetes care review for glucose trends, A1c context, safety flags, complications, and missing data.',
    checkpoints: ['No diabetes diagnosis', 'No insulin or medication changes', 'Urgent hypo/DKA/HHS pathways take priority'],
  },
  'dka-pathway-assistant': {
    tier: 'Tier B',
    lead: 'DKA pathway checklist support for glucose, ketones, anion gap, bicarbonate, osmolality, potassium, and handoff prompts.',
    checkpoints: ['Emergency pathway support only', 'No insulin, potassium, bicarbonate, or fluid dosing', 'Do not delay DKA/HHS protocols'],
  },
  'thyroid-disorder-assistant': {
    tier: 'Tier B',
    lead: 'Thyroid disorder review for TSH/T4 context, symptoms, pregnancy/medication caveats, red flags, and follow-up gaps.',
    checkpoints: ['No thyroid diagnosis', 'No levothyroxine or antithyroid dosing', 'Thyroid storm and myxedema pathways take priority'],
  },
  'metabolic-syndrome-assistant': {
    tier: 'Tier B',
    lead: 'Metabolic syndrome review for waist, glucose, blood pressure, triglycerides, HDL, and missing-data prompts.',
    checkpoints: ['Risk-factor review only', 'No treatment plan generation', 'No medication or nutrition prescriptions'],
  },
  'glucose-telemetry-dashboard': {
    tier: 'Tier C',
    lead: 'Backend telemetry dashboard concept for CGM/point-of-care glucose trends, freshness, and review queues.',
    checkpoints: ['Backend telemetry visibility only', 'No autonomous insulin changes', 'Bedside assessment takes priority'],
  },
  'insulin-trend-engine': {
    tier: 'Tier C',
    lead: 'Insulin trend review surface for documented administrations and glucose response context without dose recommendations.',
    checkpoints: ['No insulin titration', 'Requires explicit governed protocols', 'Human clinician/pharmacy review required'],
  },
  'endocrine-monitoring-system': {
    tier: 'Tier C',
    lead: 'Endocrine monitoring workspace for glucose, thyroid, calcium, sodium/osmolality, anthropometrics, and critical-value queues.',
    checkpoints: ['Monitoring support only', 'No autonomous orders', 'No medication dosing automation'],
  },
  'metabolic-analytics': {
    tier: 'Tier C',
    lead: 'Metabolic analytics for anthropometrics, glucose/lipid context, metabolic syndrome factors, and review queues.',
    checkpoints: ['Analytics visibility only', 'No diagnosis or treatment plan', 'No weight-loss or nutrition prescriptions'],
  },
  'continuous-glucose-command-center': {
    tier: 'Tier C',
    lead: 'CGM command-center view for telemetry freshness, hypo/hyperglycemia patterns, sensor gaps, and unresolved queues.',
    checkpoints: ['Backend telemetry visibility only', 'No pump or insulin control', 'Urgent bedside assessment takes priority'],
  },
});

export default function EndocrineMetabolicAssistantPage() {
  const { toolId } = useParams();
  const { profileNavigate } = useProfileNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = ENDOCRINE_METABOLIC_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Endocrine/metabolic tool not found"
        description="This endocrine and metabolic assistant route is not registered in the clinical tool catalog."
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
        <button type="button" className="btn-primary btn-primary--with-icon" onClick={startAssistant}>
          <NavIcon icon={CHROME_ICONS.message} size={16} aria-hidden />
          <span>Start guided assistant</span>
        </button>
      }
    >
      <section className="tool-section">
        <div className="tool-section-header">
          <h2>{detail.tier} endocrine/metabolic workflow</h2>
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
            This catalog-backed route seeds Assistant with endocrine/metabolic warnings through{' '}
            <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not insulin dosing, not pump control, not medication titration, and not nutrition or
            fluid prescribing. Backend telemetry surfaces are visibility/review workflows only unless explicitly
            governed by local protocols and clinician approval.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
