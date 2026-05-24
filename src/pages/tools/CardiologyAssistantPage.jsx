import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ToolPageLayout from './ToolPageLayout';
import ToolNotFound from './ToolNotFound';
import { useConversation } from '../../contexts/ConversationContext';
import { toolRegistryById } from '../../data/toolRegistry';
import { clinicalIntentToolsById } from '../../data/clinicalIntentToolCatalog';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';

const CARDIOLOGY_WORKFLOW_IDS = Object.freeze([
  'ecg-interpretation-assistant',
  'stemi-pathway-assistant',
  'acs-workflow-assistant',
  'atrial-fibrillation-assistant',
  'heart-failure-assistant',
  'cardiac-telemetry-analyzer',
  'ecg-trend-engine',
  'arrhythmia-risk-classifier',
  'remote-cardiology-monitoring-dashboard',
  'cardiology-command-center',
]);

const WORKFLOW_DETAIL = Object.freeze({
  'ecg-interpretation-assistant': {
    tier: 'Tier B',
    lead: 'Structured ECG interpretation support with rhythm, rate, intervals, ischemia flags, and urgent-care reminders.',
    checkpoints: ['Confirm patient stability first', 'Review rhythm/rate/axis/intervals', 'Flag STEMI-equivalent or unstable findings'],
  },
  'stemi-pathway-assistant': {
    tier: 'Tier B',
    lead: 'STEMI pathway checklist support for recognition, activation, contraindication review, and handoff preparation.',
    checkpoints: ['Do not delay emergency activation', 'Capture ECG timing and symptoms', 'Escalate shock, arrest, or refractory pain'],
  },
  'acs-workflow-assistant': {
    tier: 'Tier B',
    lead: 'ACS workflow support across ECG, biomarkers, serial reassessment, and risk-score selection.',
    checkpoints: ['Use local ACS pathway first', 'Pair HEART/TIMI/GRACE with clinical course', 'Avoid treatment or disposition directives'],
  },
  'atrial-fibrillation-assistant': {
    tier: 'Tier B',
    lead: 'Atrial fibrillation decision-support workspace for stability review, stroke/bleeding score selection, and handoff prompts.',
    checkpoints: ['Unstable AF requires urgent pathway', 'Use CHA2DS2-VASc, CHADS2, and HAS-BLED as context', 'No anticoagulation or rhythm-control directives'],
  },
  'heart-failure-assistant': {
    tier: 'Tier B',
    lead: 'Heart failure support for staging, congestion context, telemetry concerns, and escalation prompts.',
    checkpoints: ['Respiratory distress or shock takes priority', 'Use staging helper as documentation context', 'No diuretic or device recommendations'],
  },
  'cardiac-telemetry-analyzer': {
    tier: 'Tier C',
    lead: 'Telemetry review workspace for rhythm events, sustained alerts, gaps, and human-reviewed escalation summaries.',
    checkpoints: ['Do not auto-page or silence alarms', 'Require clinician confirmation of rhythm interpretation', 'Track artifact and lead quality'],
  },
  'ecg-trend-engine': {
    tier: 'Tier C',
    lead: 'ECG trend support for serial intervals, morphology changes, ischemia flags, and documented comparison notes.',
    checkpoints: ['Trend support only', 'Urgent ECG changes require immediate pathway review', 'No autonomous diagnostic claims'],
  },
  'arrhythmia-risk-classifier': {
    tier: 'Tier C',
    lead: 'Arrhythmia risk classification support using symptoms, telemetry findings, comorbidity context, and escalation signals.',
    checkpoints: ['Unstable arrhythmia takes priority', 'Classifies concern level, not diagnosis', 'Requires clinician sign-off'],
  },
  'remote-cardiology-monitoring-dashboard': {
    tier: 'Tier C',
    lead: 'Remote monitoring dashboard concept for patient-reported symptoms, vitals, alerts, and review queues.',
    checkpoints: ['No autonomous triage', 'Surface missed transmissions', 'Route critical symptoms to local escalation policy'],
  },
  'cardiology-command-center': {
    tier: 'Tier C',
    lead: 'Command-center view for cardiology queues, telemetry risk, ACS/stroke-adjacent alerts, and pending human review.',
    checkpoints: ['Human review required', 'No automated ordering or dispatch', 'Summarize operational bottlenecks and unresolved alerts'],
  },
});

export default function CardiologyAssistantPage() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const normalizedToolId = String(toolId || '').toLowerCase();
  const tool = toolRegistryById[normalizedToolId];
  const intent = clinicalIntentToolsById[normalizedToolId];
  const launch = useMemo(() => resolveCatalogLaunch(normalizedToolId), [normalizedToolId]);
  const detail = WORKFLOW_DETAIL[normalizedToolId];

  if (!CARDIOLOGY_WORKFLOW_IDS.includes(normalizedToolId) || !tool || !intent || !detail) {
    return (
      <ToolNotFound
        toolId={normalizedToolId}
        title="Cardiology tool not found"
        description="This cardiology assistant route is not registered in the clinical tool catalog."
        showCatalogLink
      />
    );
  }

  const startAssistant = () => {
    selectTool?.(tool.id);
    setActiveTool?.(tool.id);
    if (launch.chatSeed) {
      addMessage?.(launch.chatSeed, 'user');
    }
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
          <h2>{detail.tier} cardiology workflow</h2>
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
          <h2>Launch Behavior</h2>
          <p>
            This route is catalog-backed. The primary action uses <code>resolveCatalogLaunch</code> to seed the assistant
            with cardiology-specific guardrails.
          </p>
        </div>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-disclaimer-detail">
            Safety scope: not a diagnosis, not a treatment recommendation, not a replacement for emergency ACS/STEMI,
            arrhythmia, or heart failure pathways.
          </p>
        </div>
      </section>
    </ToolPageLayout>
  );
}
