import { getFeatureModuleContract } from '../featureModuleContract';

export const copilotFeatureContract = getFeatureModuleContract('copilot');
export const copilotFeatureRoute = copilotFeatureContract.primaryRoute;
export const copilotFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'copilot-contract',
    moduleId: copilotFeatureContract.id,
    route: copilotFeatureRoute,
  }),
]);
