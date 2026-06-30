import { getFeatureModuleContract } from '../featureModuleContract';

export { default as WhiteboardDisplayRoute } from './WhiteboardDisplayRoute';

export const whiteboardFeatureContract = getFeatureModuleContract('whiteboard');
export const whiteboardFeatureRoute = whiteboardFeatureContract.primaryRoute;
export const whiteboardFeatureFixtures = Object.freeze([
  Object.freeze({
    fixtureId: 'whiteboard-contract',
    moduleId: whiteboardFeatureContract.id,
    route: whiteboardFeatureRoute,
  }),
]);
