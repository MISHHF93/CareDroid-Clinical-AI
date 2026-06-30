import { getFeatureModuleContract } from '../featureModuleContract';

export const platformFeatureContract = getFeatureModuleContract('platform');
export const platformFeatureRoute = platformFeatureContract.primaryRoute;
export const platformFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'platform-contract',
    moduleId: platformFeatureContract.id,
    route: platformFeatureRoute,
  }),
]);
