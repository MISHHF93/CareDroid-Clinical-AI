import { Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { useConversation } from '../contexts/ConversationContext';
import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import { buildBuiltinHubCalculatorCards, getHubChatAssistedTools } from '../data/calculatorHubManifest';
import { useEmergencyStore } from '../store/emergencyStore';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import type { Patient, Vitals } from '../types/emergency';
import { formatScoreAge, getRecentSavedScores } from '../utils/clinicalScoreEvents';
import usePatientOrchestration from '../hooks/usePatientOrchestration';
import { buildCalculatorCopilotSeed } from '../services/patientAiContext';
import ErrorBoundary from './ErrorBoundary';
import CIWAAr from './calculators/CIWAAr';
import ColumbiaSSRS from './calculators/ColumbiaSSRS';
import HEARTScore from './calculators/HEARTScore';
import NIHSS from './calculators/NIHSS';
import NEWS2 from './calculators/NEWS2';
import PediatricDrugCalc from './calculators/PediatricDrugCalc';
import QSOFA from './calculators/qSOFA';
import Calculators from '../pages/tools/Calculators.jsx';
import '../pages/emergency/ClinicalCalculatorHub.css';

const EmbeddedCalculators = Calculators as ComponentType<{
  embedded?: boolean;
  initialCalculatorId?: string | null;
  onCloseEmbedded?: () => void;
}>;

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
  launchMode?: 'calculator' | 'chat';
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

function createEmbeddedCalculatorComponent(card: BuiltinCalculatorCard): ComponentType<CalculatorComponentProps> {
  function EmbeddedCalculator({ onClose }: CalculatorComponentProps) {
    return (
      <EmbeddedCalculators
        embedded
        initialCalculatorId={card.id}
        onCloseEmbedded={onClose}
      />
    );
  }

  EmbeddedCalculator.displayName = `EmbeddedCalculator_${card.id.replace(/[^a-z0-9]/gi, '_')}`;
  return EmbeddedCalculator;
}

function createChatAssistedComponent(
  toolId: string,
  name: string,
  description: string,
): ComponentType<CalculatorComponentProps> {
  function ChatAssistedCalculator({ onClose }: CalculatorComponentProps) {
    const navigate = useNavigate();
    const { addMessage, selectTool, setActiveTool } = useConversation();
    const seedMessage = addMessage as unknown as (content: string, role: string) => void;
    const chooseTool = selectTool as unknown as (id: string) => void;
    const activateTool = setActiveTool as unknown as (id: string | null) => void;

    const startGuidedWorkflow = () => {
      const launch = resolveCatalogLaunch(toolId);
      const registryId = launch.registryId || toolId;
      chooseTool?.(registryId);
      activateTool?.(registryId);
      seedMessage?.(
        launch.chatSeed ||
          `Help me use ${name} as clinical decision support only. Ask for any missing context before suggesting next steps.`,
        'user',
      );
      navigate(CANONICAL_ROUTES.emergencyCopilot);
    };

    return (
      <div className="clinical-calculator-hub__select">
        <h2>{name}</h2>
        <p>{description}</p>
        <p>{HUMAN_REVIEW_DISCLAIMER}</p>
        <div className="clinical-calculator-hub__actions">
          <button type="button" onClick={startGuidedWorkflow}>
            Start guided chat
          </button>
          <button type="button" onClick={onClose}>
            All calculators
          </button>
        </div>
      </div>
    );
  }

  ChatAssistedCalculator.displayName = `ChatAssisted_${toolId.replace(/[^a-z0-9]/gi, '_')}`;
  return ChatAssistedCalculator;
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
      createEmbeddedCalculatorComponent(card);
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
      launchMode: 'calculator' as const,
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
        component: COMPONENT_OVERRIDES[id] || createChatAssistedComponent(id, tool.name, description),
        keywords: [
          ...new Set([
            ...keywordList(id, tool.toolId, tool.name, description),
            ...(KEYWORD_OVERRIDES[id] || []),
          ]),
        ],
        timeCritical: TIME_CRITICAL_IDS.has(id),
        launchMode: 'chat' as const,
      };
    }),
].sort((a, b) => a.name.localeCompare(b.name));

const CATEGORY_TABS = ['All', 'Cardiac', 'Neuro', 'Sepsis', 'Respiratory', 'Trauma', 'Pediatric', 'Psych', 'General'];

function resolveKnownCalculatorId(value: string | null): string {
  const normalized = normalizeToolId(value);
  if (!normalized) return '';
  return CALCULATORS.some((calculator) => calculator.id === normalized) ? normalized : '';
}

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const seedMessage = addMessage as unknown as (content: string, role: string) => void;
  const chooseTool = selectTool as unknown as (id: string) => void;
  const activateTool = setActiveTool as unknown as (id: string | null) => void;
  const patients = useEmergencyStore((state) => state.patients);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') || 'All');
  const queryCalculatorId =
    resolveKnownCalculatorId(searchParams.get('open') || searchParams.get('tool') || searchParams.get('calc')) ||
    resolveKnownCalculatorId(searchParams.get('q') || searchParams.get('search'));
  const [activeCalculatorId, setActiveCalculatorId] = useState(queryCalculatorId);
  const queryPatientId = searchParams.get('patientId');
  const patient =
    patients.find((candidate) => candidate.id === queryPatientId) ||
    patients.find((candidate) => candidate.id === selectedPatientId);
  const patientOrchestration = usePatientOrchestration(patient);

  useEffect(() => {
    if (queryCalculatorId) setActiveCalculatorId(queryCalculatorId);
    else setActiveCalculatorId('');
  }, [queryCalculatorId]);

  const activeCalculator = CALCULATORS.find((calculator) => calculator.id === activeCalculatorId);
  const recentSavedScores = useMemo(
    () => (patient ? getRecentSavedScores(patient) : []),
    [patient],
  );
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
    params.set('q', calculatorId);
    params.delete('tool');
    params.delete('calc');
    if (patient?.id) params.set('patientId', patient.id);
    setSearchParams(params, { state: location.state });
    setActiveCalculatorId(calculatorId);
  }, [location.state, patient?.id, searchParams, setSearchParams]);

  const launchChatAssisted = useCallback((calculator: ClinicalCalculatorRegistryEntry) => {
    const launch = resolveCatalogLaunch(calculator.id);
    const registryId = launch.registryId || calculator.id;
    chooseTool?.(registryId);
    activateTool?.(registryId);
    const seed =
      launch.chatSeed ||
      buildCalculatorCopilotSeed(patient, calculator.name, patientOrchestration);
    if (patient?.id) {
      window.dispatchEvent(
        new CustomEvent('ed:copilot-prefill', {
          detail: { patientId: patient.id, message: seed },
        }),
      );
    } else {
      seedMessage?.(seed, 'user');
    }
    navigate(CANONICAL_ROUTES.emergencyCopilot);
  }, [activateTool, chooseTool, navigate, patient, patientOrchestration, seedMessage]);

  const closeCalculator = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const activeId = activeCalculatorId;
    if (resolveKnownCalculatorId(params.get('q'))) params.delete('q');
    if (resolveKnownCalculatorId(params.get('search'))) params.delete('search');
    params.delete('open');
    params.delete('tool');
    params.delete('calc');
    setSearchParams(params, { state: location.state });
    setActiveCalculatorId('');
  }, [activeCalculatorId, location.state, searchParams, setSearchParams]);

  const ActiveComponent = activeCalculator?.component;

  return (
    <section className="clinical-calculator-hub">
      <section className="clinical-calculator-hub__header" aria-labelledby="clinical-tools-title">
        <div>
          <span className="clinical-calculator-hub__eyebrow">CareDroid</span>
          <h1 id="clinical-tools-title">Clinical Calculator Hub</h1>
          <p>One searchable hub for clinical calculators and score workflows. {HUMAN_REVIEW_DISCLAIMER}</p>
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

      <div className="clinical-calculator-hub__tabs" role="group" aria-label="Clinical calculator categories">
        {CATEGORY_TABS.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={activeCategory === category}
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
            {recentSavedScores.length ? (
              <div className="clinical-calculator-hub__saved-scores" aria-label="Recent saved scores">
                {recentSavedScores.map((score) => (
                  <span key={`${score.toolId || score.shortLabel}-${score.timestamp}`}>
                    {score.shortLabel} <strong>{score.result ?? '--'}</strong>
                    <small>{formatScoreAge(score.timestamp)}</small>
                  </span>
                ))}
              </div>
            ) : null}
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
            <button
              type="button"
              aria-label={`${calculator.launchMode === 'chat' ? 'Ask Assistant about' : 'Launch'} ${calculator.name}`}
              onClick={() =>
                calculator.launchMode === 'chat'
                  ? launchChatAssisted(calculator)
                  : launchCalculator(calculator.id)
              }
            >
              {calculator.launchMode === 'chat' ? 'Ask Assistant' : 'Launch'}
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
