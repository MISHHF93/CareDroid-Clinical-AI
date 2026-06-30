import { getFeatureModuleContract } from '../featureModuleContract';

export const commandFeatureContract = getFeatureModuleContract('command');
export const commandFeatureRoute = commandFeatureContract.primaryRoute;
export const commandFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'command-contract',
    moduleId: commandFeatureContract.id,
    route: commandFeatureRoute,
  }),
]);
