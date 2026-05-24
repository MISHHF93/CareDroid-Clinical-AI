const getEnvValue = (key, fallback = '') => {
  const value = import.meta.env?.[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value).toLowerCase() === 'true';
};

const normalizeUrl = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const isProductionBuild = () => Boolean(import.meta.env?.PROD);

const appConfig = {
  app: {
    name: getEnvValue('VITE_APP_NAME', 'CareDroid-Clinical-AI'),
    version: getEnvValue('VITE_APP_VERSION', '1.0.0'),
    environment: getEnvValue('VITE_APP_ENVIRONMENT', 'development'),
    buildDate: getEnvValue('VITE_APP_BUILD_DATE', ''),
  },
  api: {
    baseUrl: normalizeUrl(getEnvValue('VITE_API_URL', '')),
    wsUrl: getEnvValue('VITE_WS_URL', ''),
  },
  analytics: {
    enabled: toBoolean(
      getEnvValue('VITE_ENABLE_ANALYTICS', getEnvValue('VITE_ANALYTICS_ENABLED', 'false'))
    ),
    segmentWriteKey: getEnvValue('VITE_SEGMENT_WRITE_KEY', ''),
  },
  crashReporting: {
    enabled: toBoolean(getEnvValue('VITE_ENABLE_CRASH_REPORTING', 'false')),
    dsn: getEnvValue('VITE_SENTRY_DSN', ''),
    environment: getEnvValue('VITE_SENTRY_ENVIRONMENT', 'development'),
    tracesSampleRate: parseFloat(getEnvValue('VITE_SENTRY_TRACES_SAMPLE_RATE', '0.1')),
    profilesSampleRate: parseFloat(getEnvValue('VITE_SENTRY_PROFILES_SAMPLE_RATE', '0.1')),
    debug: toBoolean(getEnvValue('VITE_DEBUG', 'false')),
  },
  features: {
    enablePushNotifications: toBoolean(getEnvValue('VITE_ENABLE_PUSH_NOTIFICATIONS', 'false')),
    enableOfflineMode: toBoolean(getEnvValue('VITE_ENABLE_OFFLINE_MODE', 'false')),
    enableBiometricAuth: toBoolean(getEnvValue('VITE_ENABLE_BIOMETRIC_AUTH', 'false')),
    /** Explicit opt-in for mock local/demo auth. Always disabled in production bundles. */
    enableDevAuthBypass: toBoolean(getEnvValue('VITE_ENABLE_DEV_AUTH_BYPASS', 'false')),
    /** Legacy demo-auth flag retained for older deployments; new bypass uses enableDevAuthBypass. */
    showDemoAuth: toBoolean(getEnvValue('VITE_SHOW_DEMO_AUTH', 'false')),
    /** Legacy hide flag retained for older deployments. */
    hideDivisionMode: toBoolean(
      getEnvValue('VITE_HIDE_DIVISION_MODE', isProductionBuild() ? 'true' : 'false')
    ),
  },
  legal: {
    privacyPolicyUrl: getEnvValue('VITE_PRIVACY_POLICY_URL', ''),
    termsOfServiceUrl: getEnvValue('VITE_TERMS_OF_SERVICE_URL', ''),
    supportUrl: getEnvValue('VITE_SUPPORT_URL', ''),
    hipaaBaaUrl: getEnvValue('VITE_HIPAA_BAA_URL', ''),
  },
  firebase: {
    apiKey: getEnvValue('VITE_FIREBASE_API_KEY', ''),
    authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN', ''),
    projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID', ''),
    storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET', ''),
    messagingSenderId: getEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: getEnvValue('VITE_FIREBASE_APP_ID', ''),
    measurementId: getEnvValue('VITE_FIREBASE_MEASUREMENT_ID', ''),
    vapidKey: getEnvValue('VITE_FIREBASE_VAPID_KEY', ''),
  },
  dev: {
    bearerToken: getEnvValue('VITE_DEV_BEARER_TOKEN', 'dev-bypass-token'),
  },
  logging: {
    level: getEnvValue('VITE_LOG_LEVEL', 'info'),
  },
  externalApis: {
    fda: {
      apiKey: getEnvValue('VITE_FDA_API_KEY', ''),
      baseUrl: 'https://api.fda.gov',
    },
    nih: {
      apiKey: getEnvValue('VITE_NIH_API_KEY', ''),
      baseUrl: 'https://api.ncbi.nlm.nih.gov',
    },
    pubmed: {
      apiKey: getEnvValue('VITE_PUBMED_API_KEY', ''),
      baseUrl: 'https://pubmed.ncbi.nlm.nih.gov',
    },
  },
  ai: {
    openai: {
      apiKey: getEnvValue('VITE_OPENAI_API_KEY', ''),
      model: getEnvValue('VITE_OPENAI_MODEL', 'gpt-4'),
      baseUrl: 'https://api.openai.com/v1',
    },
  },
};

export default appConfig;
