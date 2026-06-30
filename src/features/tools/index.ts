import { getFeatureModuleContract } from '../featureModuleContract';

export const toolsFeatureContract = getFeatureModuleContract('tools');
export const toolsFeatureRoute = toolsFeatureContract.primaryRoute;
export const toolsFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'tools-contract',
    moduleId: toolsFeatureContract.id,
    route: toolsFeatureRoute,
  }),
]);
