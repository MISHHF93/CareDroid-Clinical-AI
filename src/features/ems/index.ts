import { getFeatureModuleContract } from '../featureModuleContract';

export { EmsModuleFeature as EmsFeature } from '../ems-module';
export { useEmsModule as useEms } from '../ems-module';
export * from '../ems-module';

export const emsFeatureContract = getFeatureModuleContract('ems');
export const emsFeatureRoute = emsFeatureContract.primaryRoute;
export const emsFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'ems-contract',
    moduleId: emsFeatureContract.id,
    route: emsFeatureRoute,
  }),
]);
