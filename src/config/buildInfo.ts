import appConfig from './appConfig';

const injectedBuildInfo: any =
  typeof (globalThis as any).__CARE_BUILD_INFO__ === 'undefined' || !(globalThis as any).__CARE_BUILD_INFO__ ? {} : (globalThis as any).__CARE_BUILD_INFO__;

const normalizeValue = (value, fallback = 'unknown') => {
  const nextValue = String(value || '').trim();
  return nextValue || fallback;
};

const normalizeBoolean = (value) => value === true || value === 'true' || value === '1';

export const shortCommit = (commit) => {
  const normalized = normalizeValue(commit);
  return normalized === 'unknown' ? normalized : normalized.slice(0, 12);
};

const vercelDetected = normalizeBoolean(injectedBuildInfo.vercelDetected);
const vercelEnv = normalizeValue(injectedBuildInfo.vercelEnv, '');

export const buildInfo = Object.freeze({
  appVersion: normalizeValue(injectedBuildInfo.appVersion, appConfig.app?.version || '1.0.0'),
  buildTime: normalizeValue(injectedBuildInfo.buildTime),
  commit: normalizeValue(injectedBuildInfo.commit, appConfig.app?.deployment?.commit || 'unknown'),
  branch: normalizeValue(injectedBuildInfo.branch, appConfig.app?.deployment?.branch || 'unknown'),
  environment: normalizeValue(
    injectedBuildInfo.environment,
    appConfig.app?.environment || 'unknown'
  ),
  deploymentUrl: normalizeValue(injectedBuildInfo.deploymentUrl, ''),
  deploymentId: normalizeValue(injectedBuildInfo.deploymentId, appConfig.app?.deployment?.id || ''),
  repository: normalizeValue(injectedBuildInfo.repository, ''),
  vercelDetected,
  vercelEnv,
  vercelEnvStatus: vercelDetected ? `detected: ${vercelEnv || 'unknown'}` : 'not detected',
  vercelGitCommitSha: normalizeValue(injectedBuildInfo.vercelGitCommitSha, ''),
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
  { label: 'Vercel env status', value: buildInfo.vercelEnvStatus },
]);
