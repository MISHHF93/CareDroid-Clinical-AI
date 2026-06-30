import { getFeatureModuleContract } from '../featureModuleContract';

export const settingsFeatureContract = getFeatureModuleContract('settings');
export const settingsFeatureRoute = settingsFeatureContract.primaryRoute;
export const settingsFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'settings-contract',
    moduleId: settingsFeatureContract.id,
    route: settingsFeatureRoute,
  }),
]);
