import { getFeatureModuleContract } from '../featureModuleContract';

export const authFeatureContract = getFeatureModuleContract('auth');
export const authFeatureRoute = authFeatureContract.primaryRoute;
export const authFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'auth-contract',
    moduleId: authFeatureContract.id,
    route: authFeatureRoute,
  }),
]);
