import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { TRAINING_CONSOLE_ROUTE_PATHS, TRAINING_CONSOLE_ROUTES } from './trainingConsoleRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(
  join(__dirname, '../app/trainingConsoleRouteTree.tsx'),
  'utf8',
);

describe('trainingConsoleRoutes', () => {
  it('covers simulation and credentialing surfaces', () => {
    expect(TRAINING_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        CANONICAL_ROUTES.simulation,
        `${CANONICAL_ROUTES.simulation}/:scenarioId`,
        CANONICAL_ROUTES.simulationOutcomes,
        CANONICAL_ROUTES.competencies,
        CANONICAL_ROUTES.credentials,
      ]),
    );
  });

  it('lists every route with a component key', () => {
    for (const route of TRAINING_CONSOLE_ROUTES) {
      expect(route.componentKey).toBeTruthy();
    }
  });

  it('mounts the training console route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderTrainingConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('MedicalSimulationSuitePage');
    expect(routeTreeSource).toContain('SimulationScenarioPlayerPage');
  });

  it('keeps training routes out of explicit router mounts', () => {
    expect(appSource).not.toContain(
      'element={<LazyRoute label="Loading Medical Simulation Suite..."><MedicalSimulationSuite />',
    );
    expect(appSource).not.toContain('MedicalSimulationSuite');
    expect(appSource).not.toContain('SimulationScenarioPlayer');
  });
});
