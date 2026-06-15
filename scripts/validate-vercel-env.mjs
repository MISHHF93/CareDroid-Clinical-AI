const isTruthy = (value) => ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());
const trim = (value) => String(value || '').trim();

const isVercel = isTruthy(process.env.VERCEL);
const vercelEnv = trim(process.env.VERCEL_ENV);
const isVercelDeploy = isVercel && Boolean(vercelEnv);

const apiUrl = trim(process.env.VITE_API_URL);
const allowSameOriginApi = isTruthy(process.env.VITE_ALLOW_SAME_ORIGIN_API);
const sameOriginProxyVerified = isTruthy(process.env.VITE_SAME_ORIGIN_API_PROXY_VERIFIED);
const hideDivisionMode = trim(process.env.VITE_HIDE_DIVISION_MODE);
const demoMode = trim(process.env.VITE_DEMO_MODE);
const isDemoMode = demoMode.toLowerCase() === 'true';

const failures = [];

if (isVercelDeploy && !apiUrl && !allowSameOriginApi && !isDemoMode) {
  failures.push(
    'VITE_API_URL is required for Vercel frontend deploys. Same-origin /api is only valid with a verified proxy in front of the SPA.'
  );
}

if (isVercelDeploy && allowSameOriginApi && !sameOriginProxyVerified) {
  failures.push(
    'VITE_ALLOW_SAME_ORIGIN_API=true requires VITE_SAME_ORIGIN_API_PROXY_VERIFIED=true so /api/* cannot fall through to index.html.'
  );
}

if (apiUrl && /\/api\/?$/i.test(apiUrl)) {
  failures.push(
    'VITE_API_URL must be the API origin only, without a trailing /api path, to avoid /api/api/* requests.'
  );
}

if (isVercelDeploy && hideDivisionMode.toLowerCase() === 'false') {
  failures.push('VITE_HIDE_DIVISION_MODE must not be false for Vercel production deploys.');
}

if (isVercelDeploy && !isDemoMode) {
  failures.push('VITE_DEMO_MODE=true is required so hosted demo deployments show Direct Sign In.');
}

if (failures.length) {
  console.error('Vercel environment validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Vercel environment validation passed.');
