import { CANONICAL_ROUTES } from './routes.config';

export type TrainingConsoleRoute = {
  path: string;
  label: string;
  componentKey: string;
};

/** Training and simulation surfaces with dedicated in-shell pages. */
export const TRAINING_CONSOLE_ROUTES = Object.freeze<TrainingConsoleRoute[]>([
  { path: CANONICAL_ROUTES.trainingDashboard, label: 'AI Training Dashboard', componentKey: 'trainingDashboard' },
  { path: CANONICAL_ROUTES.simulation, label: 'Medical Simulation Suite', componentKey: 'medicalSimulationSuite' },
  {
    path: `${CANONICAL_ROUTES.simulation}/:scenarioId`,
    label: 'Simulation scenario',
    componentKey: 'simulationScenarioPlayer',
  },
  { path: CANONICAL_ROUTES.simulationOutcomes, label: 'Simulation outcomes', componentKey: 'simulationOutcomes' },
  { path: CANONICAL_ROUTES.competencies, label: 'Competency platform', componentKey: 'competencies' },
  { path: CANONICAL_ROUTES.credentials, label: 'Credentialing platform', componentKey: 'credentials' },
]);

export const TRAINING_CONSOLE_ROUTE_PATHS = Object.freeze(
  TRAINING_CONSOLE_ROUTES.map((route) => route.path),
);

