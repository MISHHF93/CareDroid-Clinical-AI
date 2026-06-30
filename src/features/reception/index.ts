import { getFeatureModuleContract } from '../featureModuleContract';

export const receptionFeatureContract = getFeatureModuleContract('reception');
export const receptionFeatureRoute = receptionFeatureContract.primaryRoute;
export const receptionFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'reception-contract',
    moduleId: receptionFeatureContract.id,
    route: receptionFeatureRoute,
  }),
]);
