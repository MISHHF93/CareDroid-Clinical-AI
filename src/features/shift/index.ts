import { getFeatureModuleContract } from '../featureModuleContract';

export const shiftFeatureContract = getFeatureModuleContract('shift');
export const shiftFeatureRoute = shiftFeatureContract.primaryRoute;
export const shiftFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'shift-contract',
    moduleId: shiftFeatureContract.id,
    route: shiftFeatureRoute,
  }),
]);
