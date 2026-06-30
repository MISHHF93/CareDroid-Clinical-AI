import { getFeatureModuleContract } from '../featureModuleContract';

export const adminFeatureContract = getFeatureModuleContract('admin');
export const adminFeatureRoute = adminFeatureContract.primaryRoute;
export const adminFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'admin-contract',
    moduleId: adminFeatureContract.id,
    route: adminFeatureRoute,
  }),
]);
