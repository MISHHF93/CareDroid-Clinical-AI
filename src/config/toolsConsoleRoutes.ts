import { CANONICAL_ROUTES } from './routes.config';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';

export type ToolsAiPageRoute = {
  path: string;
  label: string;
  componentKey: string;
};

export type ToolsFilteredConsoleRoute = {
  path: string;
  source: string;
  filter?: string;
  q?: string;
  open?: string;
};

export type ToolsShortcutPageRoute = {
  path: string;
  label: string;
  componentKey: string;
};

/** Dedicated AI tool pages (override PlatformSystemPage stubs where real UIs exist). */
export const TOOLS_AI_PAGE_ROUTES = Object.freeze<ToolsAiPageRoute[]>([
  {
    path: '/tools/ambient-scribe',
    label: 'Ambient Clinical Scribe',
    componentKey: 'ambientScribe',
  },
  {
    path: '/tools/calculator-recommender',
    label: 'Calculator Recommendation AI',
    componentKey: 'calculatorRecommender',
  },
  {
    path: '/tools/guideline-rag',
    label: 'Guideline Retrieval + Evidence Engine',
    componentKey: 'guidelineRag',
  },
  {
    path: '/tools/differential-ai',
    label: 'Differential Diagnosis Assistant',
    componentKey: 'differentialAi',
  },
  { path: '/tools/timeline-ai', label: 'Patient Timeline AI', componentKey: 'timelineAi' },
  {
    path: '/tools/patient-summary-ai',
    label: 'Patient Summary AI',
    componentKey: 'patientSummaryAi',
  },
  {
    path: '/tools/order-set-ai',
    label: 'Intelligent Order Set Assistant',
    componentKey: 'orderSetAi',
  },
  {
    path: '/tools/ai-explainability',
    label: 'AI Explainability',
    componentKey: 'aiExplainability',
  },
  { path: '/tools/clinical-audit', label: 'Clinical Audit', componentKey: 'clinicalAudit' },
  { path: '/tools/diagnosis', label: 'Diagnosis Assistant', componentKey: 'diagnosisAssistant' },
  { path: '/tools/procedures', label: 'Procedure Guide', componentKey: 'procedureGuide' },
  { path: '/tools/drug-checker', label: 'Drug Checker', componentKey: 'drugChecker' },
  { path: '/tools/lab-interpreter', label: 'Lab Interpreter', componentKey: 'labInterpreter' },
]);

export const TOOLS_FILTERED_CONSOLE_ROUTES = Object.freeze<ToolsFilteredConsoleRoute[]>([
  { path: '/catalog', source: 'catalog', filter: 'all' },
  { path: '/all-tools', source: 'all-tools', filter: 'all' },
  { path: '/clinical-tools', source: 'clinical-tools', filter: 'clinical-tools' },
  { path: CANONICAL_ROUTES.recommendations, source: 'recommendations', filter: 'recommended' },
  {
    path: TOOL_LAUNCH_PATHS.toolsOverview,
    source: 'tools',
  },
  {
    path: TOOL_LAUNCH_PATHS.calculatorsHub,
    source: 'calculators',
    filter: 'calculator',
  },
]);

export const TOOLS_SHORTCUT_PAGE_ROUTES = Object.freeze<ToolsShortcutPageRoute[]>([
  { path: '/lab', label: 'Laboratory', componentKey: 'laboratoryDashboard' },
  {
    path: TOOL_LAUNCH_PATHS.protocols,
    label: 'Protocol and Clinical Pathway Library',
    componentKey: 'protocolsLibrary',
  },
]);

export const TOOLS_CONSOLE_ROUTE_PATHS = Object.freeze([
  ...TOOLS_FILTERED_CONSOLE_ROUTES.map((route) => route.path),
  ...TOOLS_AI_PAGE_ROUTES.map((route) => route.path),
  ...TOOLS_SHORTCUT_PAGE_ROUTES.map((route) => route.path),
]);
