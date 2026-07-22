import { getFeatureModuleContract } from '../featureModuleContract';

export const emsFeatureContract = getFeatureModuleContract('ems');
export const emsFeatureRoute = emsFeatureContract.primaryRoute;
export const emsFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'ems-contract',
    moduleId: emsFeatureContract.id,
    route: emsFeatureRoute,
  }),
]);
