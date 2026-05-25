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

const GASTROENTEROLOGY_WORKFLOW_DETAIL = Object.freeze({
  'gi-bleed-workflow-assistant': {
    tier: 'Tier B',
    lead: 'Structured GI bleed review using Glasgow-Blatchford/Rockall context, hemodynamics, medications, and handoff prompts.',
    checkpoints: ['Urgent local GI bleed pathways take priority', 'No transfusion or endoscopy timing directives', 'Use risk scores as context only'],
  },
  'liver-disease-assistant': {
    tier: 'Tier B',
    lead: 'Liver disease review for Child-Pugh, MELD/MELD-Na, Maddrey DF, FIB-4/APRI, trends, and missing data.',
    checkpoints: ['Does not diagnose cirrhosis or alcoholic hepatitis', 'No treatment or transplant-listing recommendations', 'Specialist review remains required'],
  },
  'pancreatitis-workflow-assistant': {
    tier: 'Tier B',
    lead: 'Pancreatitis workflow support using Ranson, BISAP, organ-failure context, trends, and missing-data prompts.',
    checkpoints: ['Does not determine severity alone', 'No fluids, antibiotics, procedures, or disposition directives', 'Serial reassessment remains required'],
  },
  'gi-surveillance-dashboard': {
    tier: 'Tier C',
    lead: 'GI surveillance dashboard concept for endoscopy follow-up, pathology gaps, recall queues, and human review tracking.',
    checkpoints: ['Does not set surveillance intervals', 'Surfaces gaps and overdue reviews', 'Requires clinician verification'],
  },
  'hepatic-trend-analytics': {
    tier: 'Tier C',
    lead: 'Hepatic trend analytics for synthetic function, cholestasis, platelets, MELD/Child-Pugh inputs, and missing labs.',
    checkpoints: ['Trend support only', 'No transplant or treatment directives', 'Flags missing or stale labs'],
  },
  'endoscopy-workflow-assistant': {
    tier: 'Tier C',
    lead: 'Endoscopy workflow support for indication, preparation status, risk context, documentation, and follow-up queues.',
    checkpoints: ['No procedure timing or sedation directives', 'Human endoscopy team review required', 'Tracks unresolved documentation items'],
  },
  'cirrhosis-monitoring-engine': {
    tier: 'Tier C',
    lead: 'Cirrhosis monitoring workspace for decompensation features, liver scores, surveillance gaps, and review queues.',
    checkpoints: ['Monitoring support only', 'Does not diagnose decompensation alone', 'No procedure or medication recommendations'],
  },
  'gi-command-center': {
    tier: 'Tier C',
    lead: 'GI command-center view for bleed, liver, pancreatitis, endoscopy, and surveillance queues.',
    checkpoints: ['Operations visibility only', 'No automated orders or disposition decisions', 'Summarizes bottlenecks and unresolved alerts'],
  },
});

export default function GastroenterologyAssistantPage() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = GASTROENTEROLOGY_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Gastroenterology tool not found"
        description="This hepatology/GI assistant route is not registered in the clinical tool catalog."
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
          <h2>{detail.tier} hepatology/GI workflow</h2>
          <p>{detail.lead}</p>
        </div>
        <div className="clinical-audit-summary-grid">
          {detail.checkpoints.map((checkpoint) => (
            <div key={checkpoint} className="clinical-audit-summary-card">
              <strong>{checkpoint}</strong>
              <span>Clinical decision support only; clinician review and local protocols remain required.</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <div className="tool-section-header">
          <h2>Safety Scope</h2>
          <p>
            This catalog-backed route seeds Assistant with hepatology/GI guardrails through{' '}
            <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not a treatment recommendation, not procedure scheduling, and not disposition support.
            Local GI bleed, liver failure, pancreatitis, endoscopy, critical-care, and emergency pathways take priority.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
