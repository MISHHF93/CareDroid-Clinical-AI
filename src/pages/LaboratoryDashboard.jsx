import { Link } from 'react-router-dom';
import ContextInsightCard from '../components/ContextInsightCard';
import CrossModuleLinkPanel from '../components/CrossModuleLinkPanel';
import StateSourceNotice from '../components/StateSourceNotice';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './SimulationLaboratoryViewer.css';

const LAB_RESULTS = Object.freeze([
  { test: 'WBC', panel: 'CBC', value: '17.8', unit: 'K/uL', range: '4.0-11.0', status: 'High' },
  { test: 'Hemoglobin', panel: 'CBC', value: '9.4', unit: 'g/dL', range: '12.0-16.0', status: 'Low' },
  { test: 'Platelets', panel: 'CBC', value: '128', unit: 'K/uL', range: '150-400', status: 'Low' },
  { test: 'Sodium', panel: 'BMP/CMP', value: '130', unit: 'mEq/L', range: '135-145', status: 'Low' },
  { test: 'Potassium', panel: 'BMP/CMP', value: '5.6', unit: 'mEq/L', range: '3.5-5.0', status: 'High' },
  { test: 'Creatinine', panel: 'Renal', value: '2.3', unit: 'mg/dL', range: '0.6-1.2', status: 'High' },
  { test: 'Lactate', panel: 'Inflammatory', value: '4.1', unit: 'mmol/L', range: '0.5-2.2', status: 'Critical' },
  { test: 'Troponin I', panel: 'Cardiac', value: '0.09', unit: 'ng/mL', range: '<0.04', status: 'High' },
  { test: 'INR', panel: 'Coagulation', value: '1.8', unit: '', range: '0.9-1.1', status: 'High' },
  { test: 'pH', panel: 'ABG/VBG', value: '7.29', unit: '', range: '7.35-7.45', status: 'Low' },
]);

const SPECIMENS = Object.freeze([
  { id: 'SP-1042', type: 'Blood culture', location: 'ED', status: 'Incubating', eta: '18h' },
  { id: 'SP-1043', type: 'Urinalysis', location: 'Observation', status: 'Ready for review', eta: 'Now' },
  { id: 'SP-1044', type: 'Chemistry panel', location: 'ICU', status: 'Analyzer queue', eta: '12m' },
  { id: 'SP-1045', type: 'Respiratory culture', location: 'ICU', status: 'Pending gram stain', eta: '45m' },
]);

const PANELS = Object.freeze([
  'CBC',
  'BMP/CMP',
  'ABG/VBG',
  'Coagulation',
  'Liver enzymes',
  'Renal function',
  'Inflammatory markers',
  'Cardiac biomarkers',
  'Electrolytes',
  'Glucose',
  'Lactate',
  'Microbiology',
  'Urinalysis',
]);

function statusTone(status) {
  if (status === 'Critical') return 'critical';
  if (status === 'High' || status === 'Low') return 'warning';
  return 'neutral';
}

export default function LaboratoryDashboard() {
  const abnormalCount = LAB_RESULTS.filter((result) => result.status !== 'Normal').length;
  const criticalCount = LAB_RESULTS.filter((result) => result.status === 'Critical').length;

  return (
    <section className="ops-demo-page laboratory-dashboard">
      <section className="ops-demo-hero" aria-labelledby="laboratory-title">
        <div className="ops-demo-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.tools} size={34} />
        </div>
        <div>
          <p className="ops-demo-eyebrow">Demo laboratory dashboard - Not live patient data</p>
          <h1 id="laboratory-title">Laboratory</h1>
          <p>
            Review specimen queue status, abnormal lab alerts, reference ranges, panel trends, and
            hand off selected values to the lab interpretation assistant.
          </p>
        </div>
        <Link className="ops-demo-primary-action" to="/tools/lab-interpreter">
          Open Lab Interpreter
        </Link>
      </section>

      <StateSourceNotice
        title="Laboratory source states"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Lab results, specimen queues, and trend cards are demo records. A live LIS/FHIR feed is not connected in this dashboard; operational specimen updates and clinical result posting are unsupported."
      />

      <CrossModuleLinkPanel
        moduleId="laboratory"
        title="Laboratory connects to simulation and 3D review"
        description="Abnormal lab context can move back into training scenarios or forward into anatomy and model review without leaving the workflow."
      />

      <section className="ops-demo-insights" aria-label="Laboratory context insights">
        <ContextInsightCard
          title={`${abnormalCount} abnormal lab result(s)`}
          message={criticalCount ? 'Critical lactate is flagged for review.' : 'Abnormal results are grouped for review.'}
          source="Demo lab panel"
          status={criticalCount ? 'action-required' : 'demo'}
          demo={!criticalCount}
          actionLabel="Open Lab Interpreter"
          actionRoute="/tools/lab-interpreter"
        />
        <ContextInsightCard
          title={`${SPECIMENS.length} specimen(s) in queue`}
          message="Analyzer and microbiology statuses are local demo records."
          source="Local specimen queue"
          status="demo"
          demo
          actionLabel="Ask Assistant"
          actionRoute="/assistant"
        />
        <ContextInsightCard
          title="Trend source"
          message="LIS/FHIR feeds are not connected, so trend cards are demo-only."
          source="Backend unavailable"
          status="unavailable"
          actionLabel="Review source states"
          actionRoute="/laboratory"
        />
      </section>

      <section className="ops-demo-grid ops-demo-grid--four" aria-label="Laboratory summary">
        <article className="ops-demo-metric">
          <span>Abnormal results</span>
          <strong>{abnormalCount}</strong>
          <small>Demo panel review</small>
        </article>
        <article className="ops-demo-metric">
          <span>Critical alerts</span>
          <strong>{criticalCount}</strong>
          <small>Lactate review flagged</small>
        </article>
        <article className="ops-demo-metric">
          <span>Specimens</span>
          <strong>{SPECIMENS.length}</strong>
          <small>Local specimen queue</small>
        </article>
        <article className="ops-demo-metric">
          <span>Panels</span>
          <strong>{PANELS.length}</strong>
          <small>CBC, chemistry, ABG, micro</small>
        </article>
      </section>

      <section className="ops-demo-layout">
        <div className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Lab result dashboard</p>
              <h2>Abnormal lab alerts and reference ranges</h2>
            </div>
            <span className="ops-demo-badge ops-demo-badge--warning">Demo data</span>
          </div>
          <div className="ops-demo-table" role="table" aria-label="Demo lab results">
            <div role="row" className="ops-demo-table__head">
              <span>Lab</span>
              <span>Panel</span>
              <span>Value</span>
              <span>Reference range</span>
              <span>Status</span>
            </div>
            {LAB_RESULTS.map((result) => (
              <div role="row" key={`${result.panel}-${result.test}`} className="ops-demo-table__row">
                <span>{result.test}</span>
                <span>{result.panel}</span>
                <span>{result.value} {result.unit}</span>
                <span>{result.range}</span>
                <span className={`ops-demo-status ops-demo-status--${statusTone(result.status)}`}>
                  {result.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Specimen queue</p>
              <h2>Analyzer and microbiology status</h2>
            </div>
          </div>
          <div className="ops-demo-stack">
            {SPECIMENS.map((specimen) => (
              <article key={specimen.id} className="ops-demo-mini-card">
                <strong>{specimen.type}</strong>
                <span>{specimen.id} - {specimen.location}</span>
                <small>{specimen.status} - ETA {specimen.eta}</small>
              </article>
            ))}
          </div>
          <h3>Available panels</h3>
          <div className="ops-demo-chip-list">
            {PANELS.map((panel) => <span key={panel}>{panel}</span>)}
          </div>
        </aside>
      </section>
    </section>
  );
}
