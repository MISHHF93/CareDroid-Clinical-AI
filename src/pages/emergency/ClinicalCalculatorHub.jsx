import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CalculatorInterface, CALCULATORS } from '../tools/Calculators';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import { useEmergencyStore } from '../../../store/emergencyStore';
import { FEATURE_REGISTRY } from '../../../lib/features/featureRegistry';
import FeatureGate from '../../components/FeatureGate';
import { useFeature } from '../../hooks/useFeature';
import { DRUG_REFERENCE_TOOLS } from '../../utils/drugReferenceTools';
import './ClinicalCalculatorHub.css';

const CATEGORY_TABS = Object.freeze([
  'All',
  'Cardiac',
  'Neuro',
  'Sepsis',
  'Respiratory',
  'Trauma',
  'Pediatric',
  'Psych',
  'General',
  'Reference',
]);

const CATEGORY_BY_CALCULATOR_ID = Object.freeze({
  sofa: 'Sepsis',
  qsofa: 'Sepsis',
  news2: 'General',
  'apache-ii': 'General',
  'curb-65': 'Respiratory',
  gcs: 'Neuro',
  mews: 'General',
  'revised-trauma-score': 'Trauma',
  pews: 'Pediatric',
  'child-pugh': 'General',
  'has-bled': 'Cardiac',
  meld: 'General',
  'meld-na': 'General',
  'timi-ua-nstemi': 'Cardiac',
  'duke-treadmill-score': 'Cardiac',
  'reynolds-risk-score': 'Cardiac',
  'hcm-sudden-death-risk': 'Cardiac',
  chads2: 'Cardiac',
  'heart-failure-staging': 'Cardiac',
  'ascvd-risk': 'Cardiac',
  'ckd-staging': 'General',
  'egfr-ckd-epi': 'General',
  'creatinine-clearance-cg': 'General',
  fena: 'General',
  feurea: 'General',
  kfre: 'General',
  'bun-creatinine-ratio': 'General',
  'corrected-sodium': 'General',
  'free-water-deficit': 'General',
  'osmolal-gap': 'General',
  'homa-ir': 'General',
  'corrected-calcium': 'General',
  'serum-osmolality': 'General',
  bsa: 'General',
  'ideal-body-weight': 'General',
  'adjusted-body-weight': 'General',
  'waist-hip-ratio': 'General',
  gfr: 'General',
  bmi: 'General',
  chads2vasc: 'Cardiac',
  'stop-bang': 'Respiratory',
  'bode-index': 'Respiratory',
  'copd-gold-assessment': 'Respiratory',
  'aa-gradient': 'Respiratory',
  'pao2-fio2-ratio': 'Respiratory',
  'rox-index': 'Respiratory',
  'pneumonia-severity-index': 'Respiratory',
  'asthma-severity-score': 'Respiratory',
  'audit-c': 'Psych',
  phq9: 'Psych',
  gad7: 'Psych',
  cage: 'Psych',
  mmse: 'Psych',
  'moca-placeholder-workflow': 'Psych',
  pcl5: 'Psych',
  mdq: 'Psych',
  'epworth-sleepiness-scale': 'Psych',
  'columbia-suicide-severity-workflow': 'Psych',
  'heart-score': 'Cardiac',
  'centor-mcisaac': 'General',
  'bishop-score': 'Pediatric',
  'apgar-score': 'Pediatric',
  'braden-scale': 'General',
  'morse-fall-scale': 'General',
  'ranson-criteria': 'General',
  'bisap-score': 'General',
  fib4: 'General',
  'maddrey-discriminant-function': 'General',
  apri: 'General',
  'glasgow-blatchford-score': 'General',
  'rockall-score': 'General',
  'framingham-risk': 'Cardiac',
  'wells-pe': 'Respiratory',
  perc: 'Respiratory',
  'grace-acs': 'Cardiac',
  abcd2: 'Neuro',
  nihss: 'Neuro',
  'canadian-c-spine': 'Trauma',
  'ottawa-ankle': 'Trauma',
  'hunt-hess-scale': 'Neuro',
  'ich-score': 'Neuro',
  'four-score': 'Neuro',
  'modified-rankin-scale': 'Neuro',
  'nihss-summary-view': 'Neuro',
  'pediatric-gcs': 'Pediatric',
  'gestational-age-calculator': 'Pediatric',
  'pediatric-bp-percentile': 'Pediatric',
  'pregnancy-due-date-calculator': 'Pediatric',
  'fenton-growth-chart-helper': 'Pediatric',
  'neonatal-bilirubin-risk-helper': 'Pediatric',
  'pediatric-dose-safety-checker': 'Reference',
  'shock-index': 'Trauma',
  'anion-gap': 'General',
  rass: 'General',
  'bed-occupancy-calculator': 'General',
  'staffing-ratio-calculator': 'General',
  'turnaround-time-calculator': 'General',
  'resource-utilization-index': 'General',
});

const TOOL_ALIASES = Object.freeze({
  heart: 'heart-score',
  'heart score': 'heart-score',
  timi: 'timi-ua-nstemi',
  'timi score': 'timi-ua-nstemi',
  grace: 'grace-acs',
  'grace score': 'grace-acs',
  stroke: 'nihss',
  'stroke scale': 'nihss',
  gcs: 'gcs',
  qsofa: 'qsofa',
  sofa: 'sofa',
  news: 'news2',
  news2: 'news2',
  'wells pe': 'wells-pe',
  wells: 'wells-pe',
  perc: 'perc',
  ranson: 'ranson-criteria',
  blatchford: 'glasgow-blatchford-score',
  apgar: 'apgar-score',
  pregnancy: 'pregnancy-due-date-calculator',
  crcl: 'creatinine-clearance-cg',
  egfr: 'egfr-ckd-epi',
  'anion gap': 'anion-gap',
  bmi: 'bmi',
  bsa: 'bsa',
  drugs: 'drug-check',
  dose: 'pediatric-dose-safety-checker',
  'pediatric dose': 'pediatric-dose-safety-checker',
  broselow: 'pediatric-dose-safety-checker',
});

const FEATURE_BY_TOOL_ID = Object.freeze(
  FEATURE_REGISTRY.reduce((acc, feature) => {
    (feature.relatedTools || []).forEach((toolId) => {
      acc[toolId] = feature.id;
    });
    return acc;
  }, {})
);

const CALCULATOR_FEATURE_ALIASES = Object.freeze({
  heart: 'heart_score',
  'heart-score': 'heart_score',
  qsofa: 'qsofa',
  nihss: 'nihss',
  'curb-65': 'curb65',
  'wells-pe': 'wells_pe',
  news2: 'news2',
  'timi-ua-nstemi': 'timi',
  alvarado: 'alvarado',
  pews: 'pews',
  phq9: 'phq9',
  gad7: 'gad7',
  'columbia-suicide-severity-workflow': 'columbia_suicide',
  gcs: 'glasgow_coma',
  'pediatric-dose-safety-checker': 'pediatric_drug_calc',
  'egfr-ckd-epi': 'egfr_calc',
  gfr: 'egfr_calc',
  'anion-gap': 'anion_gap',
  'corrected-qt': 'corrected_qt',
  'shock-index': 'shock_index',
});

function featureForTool(toolId) {
  return CALCULATOR_FEATURE_ALIASES[toolId] || FEATURE_BY_TOOL_ID[toolId] || null;
}

const COMPLAINT_TO_CATEGORY = Object.freeze({
  'Chest Pain': 'Cardiac',
  'Shortness of Breath': 'Respiratory',
  Stroke: 'Neuro',
  Sepsis: 'Sepsis',
  Trauma: 'Trauma',
  Psychiatric: 'Psych',
  Pediatric: 'Pediatric',
});

function patientName(patient) {
  return patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '';
}

function normalizeToolId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return TOOL_ALIASES[normalized] || normalized;
}

function formatVitals(vitals = {}) {
  const bloodPressure =
    vitals.bpSystolic || vitals.bpDiastolic
      ? `${vitals.bpSystolic ?? '--'}/${vitals.bpDiastolic ?? '--'}`
      : '--';
  return [
    ['HR', vitals.hr],
    ['BP', bloodPressure],
    ['SpO2', vitals.spo2],
    ['RR', vitals.rr],
    ['Temp', vitals.temp],
    ['GCS', vitals.gcs],
  ];
}

function summarizeResult(result) {
  if (!result) return { total: null, interpretation: '', recommendation: '' };
  const total =
    result.totalScore ??
    result.score ??
    result.total ??
    result.qsofaScore ??
    result.news2Score ??
    result.value ??
    null;
  const interpretation =
    result.interpretation ||
    result.riskBand ||
    result.severity ||
    result.category ||
    result.label ||
    'Calculator result captured.';
  const recommendation =
    result.recommendation ||
    result.summary ||
    result.safetyNote ||
    'Review result in clinical context and follow local protocol.';
  return { total, interpretation, recommendation };
}

function DisabledCalculatorCard({ tool, featureId }) {
  return (
    <article className="clinical-calculator-card clinical-calculator-card--disabled">
      <div className="clinical-calculator-card__header">
        <span className="clinical-calculator-card__icon" aria-hidden>
          <NavIcon icon={getCalculatorSubIcon(tool.id)} size={22} />
        </span>
        <strong>{tool.name}</strong>
      </div>
      <p>{tool.description}</p>
      <div className="clinical-calculator-card__meta">
        <span>{tool.domain}</span>
        <span>Disabled</span>
      </div>
      <a href={`/settings/features#feature-${featureId}`}>Enable in Settings</a>
    </article>
  );
}

function ClinicalToolCard({ tool, active, displayPatient, onLaunch }) {
  const featureId = featureForTool(tool.id);
  const { enabled } = useFeature(featureId);

  if (!enabled) {
    return <DisabledCalculatorCard tool={tool} featureId={featureId} />;
  }

  return (
    <article className={`clinical-calculator-card${active ? ' is-active' : ''}`}>
      <div className="clinical-calculator-card__header">
        <span className="clinical-calculator-card__icon" aria-hidden>
          <NavIcon icon={getCalculatorSubIcon(tool.id)} size={22} />
        </span>
        <strong>{tool.name}</strong>
      </div>
      <p>{tool.description}</p>
      <div className="clinical-calculator-card__meta">
        <span>{tool.domain}</span>
        {displayPatient ? <span>Linked to patient</span> : <span>Standalone</span>}
        {tool.status === 'coming-soon' ? <span>Coming soon</span> : null}
      </div>
      <button type="button" onClick={() => onLaunch(tool.id)} disabled={tool.status === 'coming-soon'}>
        {tool.status === 'coming-soon' ? 'Coming soon' : 'Launch'}
      </button>
    </article>
  );
}

export default function ClinicalCalculatorHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const addNote = useEmergencyStore((state) => state.addNote);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const staff = useEmergencyStore((state) => state.staff);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(
    () => searchParams.get('category') || COMPLAINT_TO_CATEGORY[searchParams.get('complaint')] || 'All'
  );
  const [result, setResult] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  const queryToolId = normalizeToolId(searchParams.get('tool') || searchParams.get('calc'));
  const queryPatientId = searchParams.get('patientId');
  const pendingPatient = location.state?.pendingPatient || null;
  const patient =
    patients.find((candidate) => candidate.id === queryPatientId) ||
    patients.find((candidate) => candidate.id === selectedPatientId) ||
    null;
  const displayPatient = patient || pendingPatient;

  const tools = useMemo(
    () => [
      ...CALCULATORS.map((tool) => ({
        ...tool,
        domain: CATEGORY_BY_CALCULATOR_ID[tool.id] || 'General',
        status: 'built',
        launchMode: 'calculator',
      })),
      ...DRUG_REFERENCE_TOOLS.filter((tool) => tool.id !== 'pediatric-dose-safety-checker').map((tool) => ({
        ...tool,
        domain: 'Reference',
      })),
    ],
    []
  );
  const activeTool = tools.find((tool) => tool.id === queryToolId) || null;
  const activeToolFeature = activeTool ? featureForTool(activeTool.id) : null;
  const filteredTools = tools.filter((tool) => {
    const inCategory = activeCategory === 'All' || tool.domain === activeCategory;
    const haystack = `${tool.name} ${tool.id} ${tool.description} ${tool.domain} ${(tool.keywords || []).join(' ')}`.toLowerCase();
    return inCategory && haystack.includes(search.trim().toLowerCase());
  });
  const patientContext = displayPatient
    ? {
        id: displayPatient.id || null,
        name: patientName(displayPatient),
        mrn: displayPatient.mrn,
        age: displayPatient.age,
        sex: displayPatient.sex,
        vitals: displayPatient.vitals || {},
      }
    : null;
  const resultSummary = summarizeResult(result);
  const canSave = Boolean(patient && activeTool && result);

  const launchTool = (toolId) => {
    const tool = tools.find((candidate) => candidate.id === toolId);
    if (tool?.status === 'coming-soon') return;
    if (tool?.launchMode === 'route' && tool.path) {
      navigate(tool.path);
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set('tool', toolId);
    if (patient?.id) params.set('patientId', patient.id);
    setSearchParams(params, { state: location.state });
    setResult(null);
    setSavedMessage('');
  };

  const saveResultToPatient = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const currentPatient =
      useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id) || patient;
    const scoreTotal =
      resultSummary.total === null || resultSummary.total === undefined ? 'See result' : resultSummary.total;
    const score = {
      calculatorId: activeTool.id,
      label: activeTool.name,
      total: scoreTotal,
      interpretation: resultSummary.interpretation,
      recommendation: resultSummary.recommendation,
      values: result,
    };
    const event = {
      id: `score-${currentPatient.id}-${activeTool.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      patientId: currentPatient.id,
      type: 'SCORE',
      timestamp: now,
      staffId: currentPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system',
      summary: `Saved ${score.label}: ${score.total} (${score.interpretation}).`,
      metadata: {
        scoreId: score.calculatorId,
        scoreLabel: score.label,
        scoreTotal: score.total,
        result: score.total,
        band: score.interpretation,
        interpretation: score.interpretation,
        recommendation: score.recommendation,
        staffId: currentPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system',
      },
    };
    updatePatient(currentPatient.id, {
      timeline: [...currentPatient.timeline, event],
    });
    addNote(currentPatient.id, {
      id: `note-${currentPatient.id}-${activeTool.id}-${Date.now()}`,
      patientId: currentPatient.id,
      authorStaffId: currentPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system',
      type: 'Clinical',
      body: `${score.label}: ${score.total} (${score.interpretation}). ${score.recommendation}`,
      createdAt: now,
    });
    setSavedMessage(`Saved ${activeTool.name} to ${patientName(currentPatient)}.`);
  };

  return (
    <section className="clinical-calculator-hub">
      <section className="clinical-calculator-hub__header" aria-labelledby="clinical-tools-title">
        <div>
          <span className="clinical-calculator-hub__eyebrow">Emergency OS</span>
          <h1 id="clinical-tools-title">Clinical Tools</h1>
          <p>Search and launch calculators with optional patient-linked saving.</p>
        </div>
        <label className="clinical-calculator-hub__search">
          <span>Search tools</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search HEART, qSOFA, NEWS2, GCS, anion gap..."
          />
        </label>
      </section>

      <div className="clinical-calculator-hub__tabs" role="tablist" aria-label="Clinical tool categories">
        {CATEGORY_TABS.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            className={activeCategory === category ? 'is-active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <section className="clinical-calculator-hub__patient-bar" aria-label="Patient context">
        {displayPatient ? (
          <>
            <div>
              <span>{patient ? 'Linked patient' : 'Pending intake patient'}</span>
              <strong>
                {patientName(displayPatient)} · {displayPatient.mrn}
              </strong>
              <small>
                Age {displayPatient.age ?? '--'} · {displayPatient.sex || 'sex not specified'}
              </small>
            </div>
            <div className="clinical-calculator-hub__vitals">
              {formatVitals(displayPatient.vitals).map(([label, value]) => (
                <span key={label}>
                  {label} <strong>{value ?? '--'}</strong>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div>
            <span>Standalone mode</span>
            <strong>Manual entry only</strong>
            <small>No patient selected, so save-to-patient is disabled.</small>
          </div>
        )}
      </section>

      <section className="clinical-calculator-hub__grid" aria-label="Clinical tool cards">
        {filteredTools.map((tool) => (
          <FeatureGate
            key={tool.id}
            feature={featureForTool(tool.id)}
            showPlaceholder
            placeholder={<DisabledCalculatorCard tool={tool} featureId={featureForTool(tool.id)} />}
          >
            <ClinicalToolCard
              tool={tool}
              active={activeTool?.id === tool.id}
              displayPatient={displayPatient}
              onLaunch={launchTool}
            />
          </FeatureGate>
        ))}
        {!filteredTools.length ? (
          <div className="clinical-calculator-hub__empty">No tools match this search.</div>
        ) : null}
      </section>

      <section className="clinical-calculator-hub__workspace" aria-label="Calculator workspace">
        {activeTool ? (
          <FeatureGate feature={activeToolFeature} showPlaceholder>
            {activeTool.launchMode !== 'calculator' ? (
          <div className="clinical-calculator-hub__select">
            <NavIcon icon={CHROME_ICONS.drugs || CHROME_ICONS.pill || CHROME_ICONS.stethoscope} size={44} aria-hidden />
            <h2>{activeTool.name}</h2>
            <p>{activeTool.description}</p>
            {activeTool.path ? (
              <button type="button" onClick={() => navigate(activeTool.path)}>
                Open Reference Tool
              </button>
            ) : null}
          </div>
            ) : (
          <>
            <div className="clinical-calculator-shell__header">
              <button type="button" onClick={() => navigate('/emergency/tools')}>
                All tools
              </button>
              <div>
                <span>{activeTool.domain}</span>
                <h2>{activeTool.name}</h2>
                <p>{activeTool.description}</p>
              </div>
              <button type="button" className="clinical-calculator-shell__save" onClick={saveResultToPatient} disabled={!canSave}>
                <NavIcon icon={CHROME_ICONS.check} size={16} aria-hidden />
                Save Score to Patient
              </button>
            </div>
            <div className="clinical-calculator-shell__context">
              {displayPatient ? (
                <p>
                  {patientName(displayPatient)} ({displayPatient.mrn}) is linked. qSOFA and NEWS2 pre-fill
                  available vitals; other calculators keep manual fields while preserving this patient context
                  {patient ? ' for saving.' : ' from intake. Save is enabled after the patient is created.'}
                </p>
              ) : (
                <p>Standalone launch. Enter values manually and use the output for review only.</p>
              )}
            </div>
            {savedMessage ? <div className="clinical-calculator-shell__saved">{savedMessage}</div> : null}
            <CalculatorInterface
              key={`${activeTool.id}-${patient?.id || 'standalone'}`}
              calculator={activeTool}
              patientContext={patientContext}
              onResultChange={(nextResult) => {
                setResult(nextResult);
                setSavedMessage('');
              }}
            />
          </>
            )}
          </FeatureGate>
        ) : (
          <div className="clinical-calculator-hub__select">
            <NavIcon icon={CHROME_ICONS.stethoscope} size={44} aria-hidden />
            <h2>Select a tool to begin</h2>
            <p>Use search, category tabs, command palette, or complaint-driven intake suggestions.</p>
          </div>
        )}
      </section>
    </section>
  );
}
