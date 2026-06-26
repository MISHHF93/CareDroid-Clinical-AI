import { bench, describe } from 'vitest';
import { getMedicalToolsCatalogRows } from '../data/medicalToolsCatalogIndex';
import {
  getSidebarToolRegistryProjection,
  getUserFacingToolRegistryProjection,
} from '../data/toolInventory';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import {
  CALCULATOR_ROUTE_DEFS,
  getCalculatorRouteBySlug,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';

const medicalRows = getMedicalToolsCatalogRows();
const calculatorRoutes = CALCULATOR_ROUTE_DEFS.map((def) => def.path);
const calculatorSlugs = CALCULATOR_ROUTE_DEFS.map((def) => def.calculatorSlug);
const launchIds = [
  'qsofa',
  'news2',
  'wells-pe',
  'sofa-score',
  'drug-check',
  'lab-interp',
  'fleet-command',
  'route-optimizer',
];

describe('algorithmic lookup benchmarks', () => {
  bench('catalog search across representative medical queries', () => {
    catalogRowsMatchingQuery(medicalRows, 'bleeding risk');
    catalogRowsMatchingQuery(medicalRows, 'kidney function');
    catalogRowsMatchingQuery(medicalRows, 'pulmonary embolism');
    catalogRowsMatchingQuery(medicalRows, 'national early warning score');
  });

  bench('stable tool inventory projections', () => {
    getUserFacingToolRegistryProjection();
    getSidebarToolRegistryProjection();
  });

  bench('calculator route resolution by path and slug maps', () => {
    for (const path of calculatorRoutes) {
      matchCalculatorRoute(path);
    }
    for (const slug of calculatorSlugs) {
      getCalculatorRouteBySlug(slug);
    }
  });

  bench('registry tool launch resolution', () => {
    for (const id of launchIds) {
      getRegistryToolNavigation(id);
    }
  });
});
