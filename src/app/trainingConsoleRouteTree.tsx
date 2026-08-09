import type { ComponentType, ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { TRAINING_CONSOLE_ROUTES } from '../config/trainingConsoleRoutes';

const lazyRoute = lazyWithRetry;

const TrainingDashboardPage = lazyRoute(() => import('../pages/training/TrainingDashboard'));
const MedicalSimulationSuitePage = lazyRoute(() => import('../pages/training/MedicalSimulationSuite'));
const SimulationScenarioPlayerPage = lazyRoute(() => import('../pages/training/SimulationScenarioPlayer'));
const SimulationOutcomesPage = lazyRoute(() => import('../pages/training/SimulationOutcomes'));
const CompetenciesPage = lazyRoute(() => import('../pages/training/Competencies'));
const CredentialsPage = lazyRoute(() => import('../pages/training/Credentials'));

const TRAINING_CONSOLE_PAGE_COMPONENTS = Object.freeze({
  trainingDashboard: TrainingDashboardPage,
  medicalSimulationSuite: MedicalSimulationSuitePage,
  simulationScenarioPlayer: SimulationScenarioPlayerPage,
  simulationOutcomes: SimulationOutcomesPage,
  competencies: CompetenciesPage,
  credentials: CredentialsPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderTrainingConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      {TRAINING_CONSOLE_ROUTES.map((route) => {
        const Page =
          TRAINING_CONSOLE_PAGE_COMPONENTS[
            route.componentKey as keyof typeof TRAINING_CONSOLE_PAGE_COMPONENTS
          ];
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