import { getFeatureModuleContract } from '../featureModuleContract';

export const teamFeatureContract = getFeatureModuleContract('team');
export const teamFeatureRoute = teamFeatureContract.primaryRoute;
export const teamFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'team-contract',
    moduleId: teamFeatureContract.id,
    route: teamFeatureRoute,
  }),
]);
