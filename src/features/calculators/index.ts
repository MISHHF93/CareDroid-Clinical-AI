import { getFeatureModuleContract } from '../featureModuleContract';

export const calculatorsFeatureContract = getFeatureModuleContract('calculators');
export const calculatorsFeatureRoute = calculatorsFeatureContract.primaryRoute;
export const calculatorsFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'calculators-contract',
    moduleId: calculatorsFeatureContract.id,
    route: calculatorsFeatureRoute,
  }),
]);
