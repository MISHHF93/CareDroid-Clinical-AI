import type { ComponentType, ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  TOOLS_AI_PAGE_ROUTES,
  TOOLS_FILTERED_CONSOLE_ROUTES,
  TOOLS_SHORTCUT_PAGE_ROUTES,
} from '../config/toolsConsoleRoutes';

const lazyRoute = lazyWithRetry;

const ToolsFilteredConsole = lazyRoute(() => import('../pages/tools/ToolsFilteredConsole'));

const AmbientScribePage = lazyRoute(() => import('../pages/tools/AmbientScribe'));
const CalculatorRecommenderPage = lazyRoute(() => import('../pages/tools/CalculatorRecommender'));
const GuidelineRagPage = lazyRoute(() => import('../pages/tools/GuidelineRag'));
const DifferentialAiPage = lazyRoute(() => import('../pages/tools/DifferentialAi'));
const TimelineAiPage = lazyRoute(() => import('../pages/tools/TimelineAi'));
const PatientSummaryAiPage = lazyRoute(() => import('../pages/tools/PatientSummaryAi'));
const OrderSetAiPage = lazyRoute(() => import('../pages/tools/OrderSetAi'));
const AiExplainabilityPage = lazyRoute(() => import('../pages/tools/AiExplainability'));
const ClinicalAuditPage = lazyRoute(() => import('../pages/tools/ClinicalAudit'));
const DiagnosisAssistantPage = lazyRoute(() => import('../pages/tools/DiagnosisAssistant'));
const ProcedureGuidePage = lazyRoute(() => import('../pages/tools/ProcedureGuide'));
const DrugCheckerPage = lazyRoute(() => import('../pages/tools/DrugChecker'));
const LabInterpreterPage = lazyRoute(() => import('../pages/tools/LabInterpreter'));

const LaboratoryDashboardPage = lazyRoute(() => import('../pages/clinical/LaboratoryDashboard'));
const ProtocolsLibraryPage = lazyRoute(() => import('../pages/tools/Protocols'));

const TOOLS_AI_PAGE_COMPONENTS = Object.freeze({
  ambientScribe: AmbientScribePage,
  calculatorRecommender: CalculatorRecommenderPage,
  guidelineRag: GuidelineRagPage,
  differentialAi: DifferentialAiPage,
  timelineAi: TimelineAiPage,
  patientSummaryAi: PatientSummaryAiPage,
  orderSetAi: OrderSetAiPage,
  aiExplainability: AiExplainabilityPage,
  clinicalAudit: ClinicalAuditPage,
  diagnosisAssistant: DiagnosisAssistantPage,
  procedureGuide: ProcedureGuidePage,
  drugChecker: DrugCheckerPage,
  labInterpreter: LabInterpreterPage,
} as const);

const TOOLS_SHORTCUT_PAGE_COMPONENTS = Object.freeze({
  laboratoryDashboard: LaboratoryDashboardPage,
  protocolsLibrary: ProtocolsLibraryPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderToolsConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      {TOOLS_FILTERED_CONSOLE_ROUTES.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <LazyRoute label="Loading tool console...">
              <ToolsFilteredConsole
                source={route.source}
                filter={route.filter}
                q={route.q}
                open={route.open}
              />
            </LazyRoute>
          }
        />
      ))}

      {TOOLS_AI_PAGE_ROUTES.map((route) => {
        const Page = TOOLS_AI_PAGE_COMPONENTS[route.componentKey as keyof typeof TOOLS_AI_PAGE_COMPONENTS];
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <LazyRoute label={`Loading ${route.label}...`}>
                <Page />
              </LazyRoute>
            }
          />
        );
      })}

      {TOOLS_SHORTCUT_PAGE_ROUTES.map((route) => {
        const Page =
          TOOLS_SHORTCUT_PAGE_COMPONENTS[route.componentKey as keyof typeof TOOLS_SHORTCUT_PAGE_COMPONENTS];
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <LazyRoute label={`Loading ${route.label}...`}>
                <Page />
              </LazyRoute>
            }
          />
        );
      })}
    </>
  );
}