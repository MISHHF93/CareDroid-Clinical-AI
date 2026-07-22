import { getFeatureModuleContract } from '../featureModuleContract';

export const triageFeatureContract = getFeatureModuleContract('triage');
export const triageFeatureRoute = triageFeatureContract.primaryRoute;
export const triageFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'triage-contract',
    moduleId: triageFeatureContract.id,
    route: triageFeatureRoute,
  }),
]);
