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

const NEUROLOGY_WORKFLOW_DETAIL = Object.freeze({
  'seizure-assistant': {
    tier: 'Tier B',
    lead: 'Structured seizure review for witnessed events, recovery, triggers, antiseizure medication context, and missing data.',
    checkpoints: ['No seizure diagnosis', 'No antiseizure medication dosing', 'Status epilepticus pathways take priority'],
  },
  'stroke-workflow-assistant': {
    tier: 'Tier B',
    lead: 'Stroke workflow review for last-known-well, deficits, NIHSS context, imaging status, contraindication prompts, and handoff.',
    checkpoints: ['Do not delay stroke activation', 'No thrombolysis or thrombectomy eligibility decision', 'Imaging and stroke team take priority'],
  },
  'headache-red-flag-assistant': {
    tier: 'Tier B',
    lead: 'Headache red-flag review for thunderclap onset, neuro deficits, infection, pregnancy/postpartum, cancer, trauma, and age context.',
    checkpoints: ['No headache diagnosis', 'No imaging or LP recommendation', 'Thunderclap or neurologic deficits need urgent care'],
  },
  'vertigo-hints-assistant': {
    tier: 'Tier B',
    lead: 'Vertigo/HINTS documentation workflow for continuous vertigo, nystagmus, head impulse, skew, hearing, and gait context.',
    checkpoints: ['Trained bedside exam only', 'No stroke rule-out', 'Posterior circulation concerns need urgent evaluation'],
  },
  'neuro-exam-assistant': {
    tier: 'Tier B',
    lead: 'Neurologic exam checklist for mental status, cranial nerves, motor, sensory, coordination, gait, reflexes, and localization prompts.',
    checkpoints: ['Exam documentation support only', 'No diagnosis generation', 'New focal deficit needs urgent pathway review'],
  },
  'neuro-telemetry-dashboard': {
    tier: 'Tier C',
    lead: 'Neuro telemetry dashboard concept for neuro checks, GCS/NIHSS trends, seizures, ICP/EVD context, and gaps.',
    checkpoints: ['Monitoring visibility only', 'No autonomous alerts replacing bedside assessment', 'Urgent neuro changes take priority'],
  },
  'stroke-command-center': {
    tier: 'Tier C',
    lead: 'Stroke command-center view for activation queues, last-known-well, imaging milestones, handoff status, and unresolved review items.',
    checkpoints: ['Operations visibility only', 'No treatment eligibility decision', 'Never delay stroke workflow steps'],
  },
  'neuro-monitoring-engine': {
    tier: 'Tier C',
    lead: 'Neuro monitoring engine concept for serial exams, consciousness scores, pupillary data, ICP context, and review queues.',
    checkpoints: ['Trend visibility only', 'No autonomous escalation orders', 'Bedside assessment remains primary'],
  },
  'eeg-trend-dashboard': {
    tier: 'Tier C',
    lead: 'EEG trend dashboard concept for EEG status, seizure burden context, artifact, report freshness, and review queues.',
    checkpoints: ['EEG visibility only', 'No seizure diagnosis', 'No medication or stimulation recommendations'],
  },
  'neurology-timeline-ai': {
    tier: 'Tier C',
    lead: 'Neurology timeline AI concept for symptom onset, exams, imaging, EEG, interventions, and handoff chronology.',
    checkpoints: ['Clinician-reviewed summary only', 'No diagnosis or treatment plan', 'Emergency stroke/seizure care takes priority'],
  },
});

export default function NeurologyAssistantPage() {
  const { toolId } = useParams();
  const { profileNavigate } = useProfileNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const detail = NEUROLOGY_WORKFLOW_DETAIL[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);

  if (!tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Neurology tool not found"
        description="This neurology assistant route is not registered in the clinical tool catalog."
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
          <h2>{detail.tier} neurology workflow</h2>
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
            This catalog-backed route seeds Assistant with neurology warnings through <code>resolveCatalogLaunch</code>.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Not a diagnosis, not thrombolysis or thrombectomy eligibility, not seizure medication dosing, not imaging
            clearance, and not autonomous monitoring. Do not delay emergency stroke activation, neuroimaging, seizure
            care, airway support, neurosurgical consultation, or local urgent-care pathways.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}

