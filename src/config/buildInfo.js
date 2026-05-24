/* global __CARE_BUILD_INFO__:readonly */
import appConfig from './appConfig';

const injectedBuildInfo =
  typeof __CARE_BUILD_INFO__ === 'undefined' || !__CARE_BUILD_INFO__ ? {} : __CARE_BUILD_INFO__;

const normalizeValue = (value, fallback = 'unknown') => {
  const nextValue = String(value || '').trim();
  return nextValue || fallback;
};

export const shortCommit = (commit) => {
  const normalized = normalizeValue(commit);
  return normalized === 'unknown' ? normalized : normalized.slice(0, 12);
};

export const buildInfo = Object.freeze({
  appVersion: normalizeValue(injectedBuildInfo.appVersion, appConfig.app?.version || '1.0.0'),
  buildTime: normalizeValue(injectedBuildInfo.buildTime),
  commit: normalizeValue(injectedBuildInfo.commit),
  branch: normalizeValue(injectedBuildInfo.branch),
  environment: normalizeValue(injectedBuildInfo.environment, appConfig.app?.environment || 'unknown'),
  deploymentUrl: normalizeValue(injectedBuildInfo.deploymentUrl, ''),
  deploymentId: normalizeValue(injectedBuildInfo.deploymentId, ''),
  repository: normalizeValue(injectedBuildInfo.repository, ''),
});

export const buildInfoRows = Object.freeze([
  { label: 'App version', value: buildInfo.appVersion },
  { label: 'Commit', value: buildInfo.commit, shortValue: shortCommit(buildInfo.commit) },
  { label: 'Branch', value: buildInfo.branch },
  { label: 'Environment', value: buildInfo.environment },
  { label: 'Build time', value: buildInfo.buildTime },
  { label: 'Repository', value: buildInfo.repository || 'not provided' },
  { label: 'Deployment URL', value: buildInfo.deploymentUrl || 'not provided' },
  { label: 'Deployment ID', value: buildInfo.deploymentId || 'not provided' },
]);
