import { getFeatureModuleContract } from '../featureModuleContract';

export const waitingRoomFeatureContract = getFeatureModuleContract('waiting-room');
export const waitingRoomFeatureRoute = waitingRoomFeatureContract.primaryRoute;
export const waitingRoomFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'waiting-room-contract',
    moduleId: waitingRoomFeatureContract.id,
    route: waitingRoomFeatureRoute,
  }),
]);
