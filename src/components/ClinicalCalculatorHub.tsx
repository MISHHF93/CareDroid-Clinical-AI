import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { buildBuiltinHubCalculatorCards, getHubChatAssistedTools } from '../data/calculatorHubManifest';
import { useEmergencyStore } from '../store/emergencyStore';
import type { Patient, Vitals } from '../types/emergency';
import ErrorBoundary from './ErrorBoundary';
import { createLegacyCalculatorComponent } from './calculators/LegacyCalculatorWrapper.jsx';
import '../pages/emergency/ClinicalCalculatorHub.css';

export type CalculatorComponentProps = {
  patientId?: string;
  onClose: () => void;
};

export type ClinicalCalculatorRegistryEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  component: ComponentType<CalculatorComponentProps>;
  keywords: string[];
  timeCritical?: boolean;
};

type BuiltinCalculatorCard = {
  id: string;
  name: string;
  description: string;
  category?: string;
  route?: string;
  calcQuery?: string;
  registryId?: string;
};

type ChatAssistedTool = {
  toolId: string;
  registryId?: string;
  name: string;
  description?: string;
  path?: string;
};

const lazyCalculator = (
  loader: () => Promise<{ default: ComponentType<CalculatorComponentProps> }>,
) => lazy(loader) as unknown as ComponentType<CalculatorComponentProps>;

const CIWAAr = lazyCalculator(() => import('./calculators/CIWAAr'));
const ColumbiaSSRS = lazyCalculator(() => import('./calculators/ColumbiaSSRS'));
const HEARTScore = lazyCalculator(() => import('./calculators/HEARTScore'));
const NIHSS = lazyCalculator(() => import('./calculators/NIHSS'));
const NEWS2 = lazyCalculator(() => import('./calculators/NEWS2'));
const PediatricDrugCalc = lazyCalculator(() => import('./calculators/PediatricDrugCalc'));
const QSOFA = lazyCalculator(() => import('./calculators/qSOFA'));

const CATEGORY_BY_CALCULATOR_ID: Record<string, string> = {
  sofa: 'Sepsis',
  qsofa: 'Sepsis',
  news2: 'General',
  'apache-ii': 'General',
  'curb-65': 'Respiratory',
  gcs: 'Neuro',
  mews: 'General',
  'revised-trauma-score': 'Trauma',
  pews: 'Pediatric',
  'heart-score': 'Cardiac',
  'timi-ua-nstemi': 'Cardiac',
  'duke-treadmill-score': 'Cardiac',
  'reynolds-risk-score': 'Cardiac',
  'hcm-sudden-death-risk': 'Cardiac',
  chads2: 'Cardiac',
  'heart-failure-staging': 'Cardiac',
  'ascvd-risk': 'Cardiac',
  'wells-pe': 'Respiratory',
  perc: 'Respiratory',
  'grace-acs': 'Cardiac',
  nihss: 'Neuro',
  abcd2: 'Neuro',
  'canadian-c-spine': 'Trauma',
  'ottawa-ankle': 'Trauma',
  'nexus-cspine': 'Trauma',
  'pecarn-head': 'Trauma',
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
  'pediatric-dose-safety-checker': 'Pediatric',
  phq9: 'Psych',
  gad7: 'Psych',
  cage: 'Psych',
  mmse: 'Psych',
  'moca-placeholder-workflow': 'Psych',
  pcl5: 'Psych',
  mdq: 'Psych',
  'epworth-sleepiness-scale': 'Psych',
  'columbia-suicide-severity-workflow': 'Psych',
  'stop-bang': 'Respiratory',
  'bode-index': 'Respiratory',
  'copd-gold-assessment': 'Respiratory',
  'aa-gradient': 'Respiratory',
  'pao2-fio2-ratio': 'Respiratory',
  'rox-index': 'Respiratory',
  'pneumonia-severity-index': 'Respiratory',
  'asthma-severity-score': 'Respiratory',
  'shock-index': 'Trauma',
};

const TOOL_ALIASES: Record<string, string> = {
  heart: 'heart-score',
  'heart score': 'heart-score',
  timi: 'timi-ua-nstemi',
  grace: 'grace-acs',
  stroke: 'nihss',
  'stroke scale': 'nihss',
  qsofa: 'qsofa',
  sofa: 'sofa',
  news: 'news2',
  news2: 'news2',
  'early warning': 'news2',
  wells: 'wells-pe',
  'wells pe': 'wells-pe',
  perc: 'perc',
  crcl: 'creatinine-clearance-cg',
  egfr: 'egfr-ckd-epi',
  'anion gap': 'anion-gap',
  peds: 'pediatric-dose-safety-checker',
  'pediatric drugs': 'pediatric-dose-safety-checker',
  cssrs: 'columbia-suicide-severity-workflow',
  'c-ssrs': 'columbia-suicide-severity-workflow',
  columbia: 'columbia-suicide-severity-workflow',
  ciwa: 'ciwa-ar',
  'ciwa-ar': 'ciwa-ar',
  etoh: 'ciwa-ar',
};

const TIME_CRITICAL_IDS = new Set([
  'qsofa',
  'sofa',
  'news2',
  'heart-score',
  'timi-ua-nstemi',
  'grace-acs',
  'nihss',
  'gcs',
  'wells-pe',
  'perc',
  'revised-trauma-score',
  'pediatric-dose-safety-checker',
  'columbia-suicide-severity-workflow',
]);

const NON_CLINICAL_CALCULATOR_IDS = new Set([
  'bed-occupancy-calculator',
  'staffing-ratio-calculator',
  'turnaround-time-calculator',
  'resource-utilization-index',
]);

function keywordList(...values: Array<string | undefined>): string[] {
  return [...new Set(values.flatMap((value) => String(value || '').toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean))];
}

function createComingSoonComponent(name: string, description: string): ComponentType<CalculatorComponentProps> {
  function ComingSoonCalculator({ onClose }: CalculatorComponentProps) {
    return (
      <div className="clinical-calculator-hub__select">
        <h2>{name}</h2>
        <p>Coming soon. {description}</p>
        <button type="button" onClick={onClose}>
          All calculators
        </button>
      </div>
    );
  }

  ComingSoonCalculator.displayName = `ComingSoon_${name.replace(/[^a-z0-9]/gi, '_')}`;
  return ComingSoonCalculator;
}

function normalizeToolId(value: string | null): string {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return TOOL_ALIASES[normalized] || normalized;
}

function categoryFor(id: string, fallback?: string): string {
  const category = CATEGORY_BY_CALCULATOR_ID[id] || fallback || 'General';
  return category === 'Calculator' ? 'General' : category;
}

const builtinCards = buildBuiltinHubCalculatorCards() as BuiltinCalculatorCard[];
const chatAssistedTools = getHubChatAssistedTools() as ChatAssistedTool[];

const COMPONENT_OVERRIDES: Record<string, ComponentType<CalculatorComponentProps>> = {
  qsofa: QSOFA,
  'heart-score': HEARTScore,
  'ciwa-ar': CIWAAr,
  nihss: NIHSS,
  news2: NEWS2,
  'columbia-suicide-severity-workflow': ColumbiaSSRS,
  'pediatric-dose-safety-checker': PediatricDrugCalc,
};

const KEYWORD_OVERRIDES: Record<string, string[]> = {
  'ciwa-ar': ['alcohol', 'withdrawal', 'ciwa', 'detox', 'etoh', 'delirium'],
  nihss: ['stroke', 'nihss', 'neuro', 'weakness', 'aphasia', 'tpa'],
  news2: ['news', 'early warning', 'deterioration', 'obs', 'respiratory', 'sepsis'],
  'columbia-suicide-severity-workflow': ['suicide', 'cssrs', 'c-ssrs', 'columbia', 'psych', 'self-harm'],
};

const CUSTOM_CALCULATORS: ClinicalCalculatorRegistryEntry[] = [
  {
    id: 'ciwa-ar',
    name: 'CIWA-Ar Alcohol Withdrawal',
    description: 'Clinical Institute Withdrawal Assessment for Alcohol, revised, with protocol guidance.',
    category: 'Psych',
    component: CIWAAr,
    keywords: KEYWORD_OVERRIDES['ciwa-ar'],
  },
];

export const CALCULATORS: ClinicalCalculatorRegistryEntry[] = [
  ...CUSTOM_CALCULATORS,
  ...builtinCards.filter((card) => !NON_CLINICAL_CALCULATOR_IDS.has(card.id)).map((card) => {
    const component =
      COMPONENT_OVERRIDES[card.id] ||
      (createLegacyCalculatorComponent(card) as ComponentType<CalculatorComponentProps>);
    return {
      id: card.id,
      name: card.name,
      description: card.description,
      category: categoryFor(card.id, card.category),
      component,
      keywords: [
        ...new Set([
          ...keywordList(card.id, card.name, card.description, card.calcQuery, card.registryId),
          ...(KEYWORD_OVERRIDES[card.id] || []),
        ]),
      ],
      timeCritical: TIME_CRITICAL_IDS.has(card.id),
    };
  }),
  ...chatAssistedTools
    .filter((tool) => !builtinCards.some((card) => card.id === (tool.registryId || tool.toolId)))
    .map((tool) => {
      const id = tool.registryId || tool.toolId;
      const description = tool.description || 'Guided clinical decision support workflow.';
      return {
        id,
        name: tool.name,
        description,
        category: categoryFor(id),
        component: COMPONENT_OVERRIDES[id] || createComingSoonComponent(tool.name, description),
        keywords: [
          ...new Set([
            ...keywordList(id, tool.toolId, tool.name, description),
            ...(KEYWORD_OVERRIDES[id] || []),
          ]),
        ],
        timeCritical: TIME_CRITICAL_IDS.has(id),
      };
    }),
].sort((a, b) => a.name.localeCompare(b.name));

const CATEGORY_TABS = ['All', 'Cardiac', 'Neuro', 'Sepsis', 'Respiratory', 'Trauma', 'Pediatric', 'Psych', 'General'];

function patientName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn;
}

function latestVitals(patient?: Patient): Vitals | undefined {
  if (!patient) return undefined;
  return Array.isArray(patient.vitals) ? patient.vitals.at(-1) : patient.vitals;
}

function formatVitals(patient?: Patient): Array<[string, string | number | undefined]> {
  const vitals = latestVitals(patient);
  const displayValue = (value: string | number | null | undefined): string | number | undefined => value ?? undefined;
  const bloodPressure =
    vitals?.sbp || vitals?.dbp || vitals?.bpSystolic || vitals?.bpDiastolic
      ? `${vitals.sbp ?? vitals.bpSystolic ?? '--'}/${vitals.dbp ?? vitals.bpDiastolic ?? '--'}`
      : undefined;
  return [
    ['HR', displayValue(vitals?.hr ?? vitals?.heartRate)],
    ['BP', bloodPressure],
    ['SpO2', displayValue(vitals?.spo2 ?? vitals?.oxygenSaturation)],
    ['RR', displayValue(vitals?.rr ?? vitals?.respiratoryRate)],
    ['Temp', displayValue(vitals?.temp ?? vitals?.temperature)],
    ['GCS', displayValue(vitals?.gcs)],
  ];
}

export default function ClinicalCalculatorHub() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') || 'All');
  const queryCalculatorId = normalizeToolId(searchParams.get('open') || searchParams.get('tool') || searchParams.get('calc'));
  const [activeCalculatorId, setActiveCalculatorId] = useState(queryCalculatorId);
  const queryPatientId = searchParams.get('patientId');
  const patient =
    patients.find((candidate) => candidate.id === queryPatientId) ||
    patients.find((candidate) => candidate.id === selectedPatientId);

  useEffect(() => {
    if (queryCalculatorId) setActiveCalculatorId(queryCalculatorId);
  }, [queryCalculatorId]);

  const activeCalculator = CALCULATORS.find((calculator) => calculator.id === activeCalculatorId);
  const filteredCalculators = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CALCULATORS.filter((calculator) => {
      const categoryMatches = activeCategory === 'All' || calculator.category === activeCategory;
      const haystack = `${calculator.id} ${calculator.name} ${calculator.description} ${calculator.category} ${calculator.keywords.join(' ')}`.toLowerCase();
      return categoryMatches && (!query || haystack.includes(query));
    });
  }, [activeCategory, search]);

  const launchCalculator = useCallback((calculatorId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('open', calculatorId);
    params.delete('tool');
    params.delete('calc');
    if (patient?.id) params.set('patientId', patient.id);
    setSearchParams(params, { state: location.state });
    setActiveCalculatorId(calculatorId);
  }, [location.state, patient?.id, searchParams, setSearchParams]);

  const closeCalculator = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('open');
    params.delete('tool');
    params.delete('calc');
    setSearchParams(params, { state: location.state });
    setActiveCalculatorId('');
  }, [location.state, searchParams, setSearchParams]);

  const ActiveComponent = activeCalculator?.component;

  return (
    <section className="clinical-calculator-hub">
      <section className="clinical-calculator-hub__header" aria-labelledby="clinical-tools-title">
        <div>
          <span className="clinical-calculator-hub__eyebrow">Emergency OS</span>
          <h1 id="clinical-tools-title">Clinical Calculator Hub</h1>
          <p>One searchable hub for clinical calculators and score workflows.</p>
        </div>
        <label className="clinical-calculator-hub__search">
          <span>Search calculators</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search HEART, qSOFA, NIHSS, Wells, GCS..."
          />
        </label>
      </section>

      <div className="clinical-calculator-hub__tabs" role="tablist" aria-label="Clinical calculator categories">
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
        {patient ? (
          <>
            <div>
              <span>Linked patient</span>
              <strong>
                {patientName(patient)} · {patient.mrn}
              </strong>
              <small>
                Age {patient.age ?? '--'} · {patient.sex || 'sex not specified'}
              </small>
            </div>
            <div className="clinical-calculator-hub__vitals">
              {formatVitals(patient).map(([label, value]) => (
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

      <section className="clinical-calculator-hub__grid" aria-label="Clinical calculator cards">
        {filteredCalculators.map((calculator) => (
          <article
            key={calculator.id}
            className={`clinical-calculator-card${activeCalculator?.id === calculator.id ? ' is-active' : ''}`}
          >
            <div className="clinical-calculator-card__header">
              <strong>{calculator.name}</strong>
            </div>
            <p>{calculator.description}</p>
            <div className="clinical-calculator-card__meta">
              <span>{calculator.category}</span>
              {calculator.timeCritical ? <span>Time critical</span> : null}
            </div>
            <button type="button" onClick={() => launchCalculator(calculator.id)}>
              {calculator.component.name.startsWith('ComingSoon') ? 'Preview' : 'Launch'}
            </button>
          </article>
        ))}
        {!filteredCalculators.length ? (
          <div className="clinical-calculator-hub__empty">No calculators match this search.</div>
        ) : null}
      </section>

      <section className="clinical-calculator-hub__workspace" aria-label="Calculator workspace">
        {activeCalculator && ActiveComponent ? (
          <ErrorBoundary fallbackText="Calculator surface encountered an error. Refresh to reload.">
            <Suspense fallback={<div className="clinical-calculator-hub__select">Loading calculator...</div>}>
              <ActiveComponent patientId={patient?.id} onClose={closeCalculator} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <div className="clinical-calculator-hub__select">
            <h2>Select a calculator to begin</h2>
            <p>Use search, categories, command palette, or a legacy route redirect to open a calculator.</p>
          </div>
        )}
      </section>
    </section>
  );
}
