import * as Joi from 'joi';

export const CARE_ENVIRONMENTS = ['local', 'development', 'staging', 'production'] as const;
export const NODE_ENVIRONMENTS = ['local', 'development', 'test', 'staging', 'production'] as const;

export type CareEnvironment = (typeof CARE_ENVIRONMENTS)[number];
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];
export type VideoProvider = 'mock' | 'zoom' | 'twilio' | 'daily';

type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

export interface EnvironmentConfig {
  environment: {
    name: CareEnvironment;
    isProduction: boolean;
    bannerEnabled: boolean;
    allowed: readonly CareEnvironment[];
    validation: {
      source: 'CARE_ENV' | 'APP_ENV' | 'NODE_ENV';
      valid: boolean;
    };
  };
  deployment: {
    id: string;
    region: string;
    version: string;
    commit: string;
    branch: string;
    deployedAt: string;
  };
  server: {
    port: number;
    nodeEnv: NodeEnvironment;
    corsOrigin: string;
    corsOrigins: string[];
    frontendUrl: string;
  };
  database: {
    mongodbUri: string;
    dbName: string;
    enableMongooseEmergencyOs: boolean;
    sql: {
      client: string;
      sqlitePath: string;
      url: string;
      host: string;
      port: number;
      username: string;
      password: string;
      databaseName: string;
      logging: boolean;
      ssl: boolean;
      poolSize: number;
    };
  };
  auth: {
    jwtSecret: string;
    jwtExpiry: string;
    jwtAccessExpiry: string;
    jwtRefreshExpiry: string;
    enableDevAuthBypass: boolean;
    enableViteDevAuthBypass: boolean;
    allowDemoAuthInProduction: boolean;
    devLoginEmail: string;
  };
  externalApis: {
    mohFhir: {
      baseUrl: string;
      clientId: string;
      clientSecret: string;
      enabled: boolean;
    };
  };
  wearables: {
    apiKey: string;
    healthkitTeamId: string;
    enabled: boolean;
  };
  mqtt: {
    brokerUrl: string;
    username: string;
    password: string;
    enabled: boolean;
  };
  ai: {
    openaiApiKey: string;
    anthropicApiKey: string;
    azureOpenAIEndpoint: string;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    streamingEnabled: boolean;
    enabled: boolean;
    rateLimits: {
      free: number;
      professional: number;
      institutional: number;
    };
  };
  telehealth: {
    videoProvider: VideoProvider;
    zoomApiKey: string;
    enabled: boolean;
  };
  notifications: {
    surgeSmsGatewayUrl: string;
    incidentEscalationEmails: string[];
  };
  runtime: {
    jestWorkerId: string;
    strictSaasEntitlements: boolean;
    tenantIsolationDisabled: boolean;
    simulationHealthStatus: string;
  };
}

const DEFAULT_JWT_SECRET = 'CHANGE_ME_IN_PRODUCTION';
const DEFAULT_FRONTEND_URL = 'http://localhost:8000';
const DEFAULT_PORT = 3000;

const productionSecret = (name: string, unsafeDefault: string) =>
  Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .required()
      .invalid(unsafeDefault)
      .messages({
        'any.invalid': `${name} must be set to a production secret`,
        'any.required': `${name} is required in production`,
      }),
    otherwise: Joi.string().default(unsafeDefault),
  });

const booleanSchema = Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0');

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...NODE_ENVIRONMENTS)
    .default('development'),
  APP_ENV: Joi.string()
    .valid(...CARE_ENVIRONMENTS)
    .optional(),
  CARE_ENV: Joi.string()
    .valid(...CARE_ENVIRONMENTS)
    .optional(),
  ENVIRONMENT_BANNER_ENABLED: booleanSchema.optional(),
  DEPLOYMENT_ID: Joi.string().allow('').optional(),
  DEPLOYMENT_REGION: Joi.string().allow('').optional(),
  APP_VERSION: Joi.string().allow('').optional(),
  GIT_COMMIT: Joi.string().allow('').optional(),
  GIT_BRANCH: Joi.string().allow('').optional(),
  DEPLOYED_AT: Joi.string().allow('').optional(),
  BUILD_TIME: Joi.string().allow('').optional(),
  PORT: Joi.number().port().default(DEFAULT_PORT),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  FRONTEND_URL: Joi.string().allow('').optional(),

  MONGODB_URI: Joi.string()
    .uri({ scheme: [/mongodb/] })
    .allow('')
    .optional(),
  DATABASE_MONGO_URI: Joi.string()
    .uri({ scheme: [/mongodb/] })
    .allow('')
    .optional(),
  DB_NAME: Joi.string().allow('').optional(),
  DATABASE_CLIENT: Joi.string().valid('sqlite', 'postgres').optional(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: [/postgres/, /postgresql/] })
    .optional(),
  DATABASE_HOST: Joi.string().optional(),
  DATABASE_PORT: Joi.number().port().optional(),
  DATABASE_USER: Joi.string().optional(),
  DATABASE_PASSWORD: Joi.string().optional(),
  DATABASE_NAME: Joi.string().optional(),
  DATABASE_LOGGING: booleanSchema.optional(),
  DATABASE_SSL: booleanSchema.optional(),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).default(10),
  SQLITE_PATH: Joi.string().allow('').optional(),
  ENABLE_MONGOOSE_EMERGENCY_OS: booleanSchema.optional(),

  JWT_SECRET: productionSecret('JWT_SECRET', DEFAULT_JWT_SECRET),
  JWT_EXPIRY: Joi.string().allow('').optional(),
  JWT_ACCESS_EXPIRY: Joi.string().allow('').optional(),
  JWT_REFRESH_EXPIRY: Joi.string().allow('').optional(),
  ENABLE_DEV_AUTH_BYPASS: booleanSchema.optional(),
  VITE_ENABLE_DEV_AUTH_BYPASS: booleanSchema.optional(),
  ALLOW_DEMO_AUTH_IN_PRODUCTION: booleanSchema.optional(),
  DEV_LOGIN_EMAIL: Joi.string().email().optional(),

  MOH_FHIR_BASE_URL: Joi.string().uri().allow('').optional(),
  MOH_CLIENT_ID: Joi.string().allow('').optional(),
  MOH_CLIENT_SECRET: Joi.string().allow('').optional(),

  WEARABLE_API_KEY: Joi.string().allow('').optional(),
  HEALTHKIT_TEAM_ID: Joi.string().allow('').optional(),

  MQTT_BROKER_URL: Joi.string()
    .uri({ scheme: [/mqtt/, /mqtts/, /tcp/, /ssl/, /ws/, /wss/] })
    .allow('')
    .optional(),
  MQTT_USERNAME: Joi.string().allow('').optional(),
  MQTT_PASSWORD: Joi.string().allow('').optional(),

  OPENAI_API_KEY: Joi.string().allow('').optional(),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  AZURE_OPENAI_ENDPOINT: Joi.string().uri().allow('').optional(),
  AI_PROVIDER: Joi.string()
    .valid('anthropic', 'openai', 'azure-openai', 'gemini', 'local')
    .default('anthropic'),
  AI_MODEL: Joi.string().allow('').optional(),
  AI_TEMPERATURE: Joi.number().min(0).max(2).default(0.2),
  AI_MAX_TOKENS: Joi.number().integer().min(1).default(2000),
  AI_STREAMING_ENABLED: booleanSchema.optional(),
  AI_ENABLED: booleanSchema.default(false),
  ED_COPILOT_AI_ENABLED: booleanSchema.default(true),
  SMART_INTAKE_AI_ENABLED: booleanSchema.default(false),
  REFERRAL_AI_ENABLED: booleanSchema.default(false),
  ANALYTICS_AI_ENABLED: booleanSchema.default(false),
  CLINICAL_WORKFLOW_AI_ENABLED: booleanSchema.default(false),
  AI_AUDIT_LOGGING_ENABLED: booleanSchema.default(true),
  AI_PATIENT_CONTEXT_ENABLED: booleanSchema.default(false),
  AI_RATE_LIMIT_FREE: Joi.number().integer().min(0).default(10),
  AI_RATE_LIMIT_PRO: Joi.number().integer().min(0).default(1000),
  AI_RATE_LIMIT_INSTITUTIONAL: Joi.number().integer().min(0).default(10000),

  VIDEO_PROVIDER: Joi.string().valid('mock', 'zoom', 'twilio', 'daily').default('mock'),
  ZOOM_API_KEY: Joi.string().allow('').optional(),

  SURGE_SMS_GATEWAY_URL: Joi.string().uri().allow('').optional(),
  INCIDENT_ESCALATION_EMAILS: Joi.string().allow('').optional(),

  ENCRYPTION_MASTER_KEY: Joi.string().allow('').optional(),
});

export function normalizeCareEnvironment(value?: string | null): CareEnvironment {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'dev') return 'development';
  if (normalized === 'prod') return 'production';
  if ((CARE_ENVIRONMENTS as readonly string[]).includes(normalized)) {
    return normalized as CareEnvironment;
  }
  return 'development';
}

export function normalizeNodeEnvironment(value?: string | null): NodeEnvironment {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'dev') return 'development';
  if (normalized === 'prod') return 'production';
  if ((NODE_ENVIRONMENTS as readonly string[]).includes(normalized)) {
    return normalized as NodeEnvironment;
  }
  return 'development';
}

function readOptional(env: EnvSource, key: string): string {
  return String(env[key] || '').trim();
}

function readFirst(env: EnvSource, keys: string[], defaultValue = ''): string {
  for (const key of keys) {
    const value = readOptional(env, key);
    if (value) return value;
  }
  return defaultValue;
}

function readBoolean(env: EnvSource, key: string, defaultValue = false): boolean {
  const value = readOptional(env, key).toLowerCase();
  if (!value) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value);
}

function readNumber(env: EnvSource, key: string, defaultValue: number): number {
  const rawValue = readOptional(env, key);
  if (!rawValue) return defaultValue;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : defaultValue;
}

function readCsv(env: EnvSource, key: string): string[] {
  return readOptional(env, key)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeVideoProvider(value: string): VideoProvider {
  return ['zoom', 'twilio', 'daily'].includes(value) ? (value as VideoProvider) : 'mock';
}

function resolveCorsOrigins(env: EnvSource): string[] {
  const origins = readFirst(env, ['CORS_ORIGIN', 'FRONTEND_URL'], DEFAULT_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : [DEFAULT_FRONTEND_URL];
}

export function getEnvironmentConfig(env: EnvSource = process.env): EnvironmentConfig {
  const nodeEnv = normalizeNodeEnvironment(readOptional(env, 'NODE_ENV'));
  const environment = normalizeCareEnvironment(
    readFirst(env, ['CARE_ENV', 'APP_ENV', 'NODE_ENV'], nodeEnv),
  );
  const corsOrigins = resolveCorsOrigins(env);
  const mongodbUri = readFirst(env, ['MONGODB_URI', 'DATABASE_MONGO_URI']);
  const databaseName = readFirst(env, ['DATABASE_NAME', 'DB_NAME'], 'caredroid');
  const jwtExpiry = readFirst(env, ['JWT_EXPIRY', 'JWT_ACCESS_EXPIRY'], '15m');
  const videoProvider = normalizeVideoProvider(readOptional(env, 'VIDEO_PROVIDER'));
  const mohFields = [
    readOptional(env, 'MOH_FHIR_BASE_URL'),
    readOptional(env, 'MOH_CLIENT_ID'),
    readOptional(env, 'MOH_CLIENT_SECRET'),
  ];
  const mqttBrokerUrl = readOptional(env, 'MQTT_BROKER_URL');

  return {
    environment: {
      name: environment,
      isProduction: environment === 'production' || nodeEnv === 'production',
      bannerEnabled: readOptional(env, 'ENVIRONMENT_BANNER_ENABLED') !== 'false',
      allowed: CARE_ENVIRONMENTS,
      validation: {
        source: readOptional(env, 'CARE_ENV')
          ? 'CARE_ENV'
          : readOptional(env, 'APP_ENV')
            ? 'APP_ENV'
            : 'NODE_ENV',
        valid: true,
      },
    },
    deployment: {
      id: readFirst(env, ['DEPLOYMENT_ID', 'VERCEL_DEPLOYMENT_ID']),
      region: readFirst(env, ['DEPLOYMENT_REGION', 'VERCEL_REGION']),
      version: readFirst(env, ['APP_VERSION', 'npm_package_version'], '1.0.0'),
      commit: readFirst(env, ['GIT_COMMIT', 'VERCEL_GIT_COMMIT_SHA', 'RENDER_GIT_COMMIT']),
      branch: readFirst(env, ['GIT_BRANCH', 'VERCEL_GIT_COMMIT_REF']),
      deployedAt: readFirst(env, ['DEPLOYED_AT', 'BUILD_TIME']),
    },
    server: {
      port: readNumber(env, 'PORT', DEFAULT_PORT),
      nodeEnv,
      corsOrigin: corsOrigins.join(','),
      corsOrigins,
      frontendUrl: readFirst(env, ['FRONTEND_URL', 'CORS_ORIGIN'], DEFAULT_FRONTEND_URL).replace(
        /\/$/,
        '',
      ),
    },
    database: {
      mongodbUri,
      dbName: readFirst(env, ['DB_NAME', 'DATABASE_NAME'], 'caredroid'),
      enableMongooseEmergencyOs: readBoolean(env, 'ENABLE_MONGOOSE_EMERGENCY_OS'),
      sql: {
        client: readOptional(env, 'DATABASE_CLIENT').toLowerCase(),
        sqlitePath: readOptional(env, 'SQLITE_PATH') || 'caredroid.dev.sqlite',
        url: readOptional(env, 'DATABASE_URL'),
        host: readOptional(env, 'DATABASE_HOST') || 'localhost',
        port: readNumber(env, 'DATABASE_PORT', 5432),
        username: readOptional(env, 'DATABASE_USER') || 'postgres',
        password: readOptional(env, 'DATABASE_PASSWORD') || 'postgres',
        databaseName,
        logging: readBoolean(env, 'DATABASE_LOGGING'),
        ssl: readBoolean(env, 'DATABASE_SSL'),
        poolSize: readNumber(env, 'DATABASE_POOL_SIZE', 10),
      },
    },
    auth: {
      jwtSecret: readOptional(env, 'JWT_SECRET') || DEFAULT_JWT_SECRET,
      jwtExpiry,
      jwtAccessExpiry: readFirst(env, ['JWT_ACCESS_EXPIRY', 'JWT_EXPIRY'], jwtExpiry),
      jwtRefreshExpiry: readOptional(env, 'JWT_REFRESH_EXPIRY') || '30d',
      enableDevAuthBypass: readBoolean(env, 'ENABLE_DEV_AUTH_BYPASS'),
      enableViteDevAuthBypass: readBoolean(env, 'VITE_ENABLE_DEV_AUTH_BYPASS'),
      allowDemoAuthInProduction: readBoolean(env, 'ALLOW_DEMO_AUTH_IN_PRODUCTION'),
      devLoginEmail: readOptional(env, 'DEV_LOGIN_EMAIL') || 'dev@caredroid.local',
    },
    externalApis: {
      mohFhir: {
        baseUrl: mohFields[0],
        clientId: mohFields[1],
        clientSecret: mohFields[2],
        enabled: mohFields.some(Boolean),
      },
    },
    wearables: {
      apiKey: readOptional(env, 'WEARABLE_API_KEY'),
      healthkitTeamId: readOptional(env, 'HEALTHKIT_TEAM_ID'),
      enabled: Boolean(
        readOptional(env, 'WEARABLE_API_KEY') || readOptional(env, 'HEALTHKIT_TEAM_ID'),
      ),
    },
    mqtt: {
      brokerUrl: mqttBrokerUrl,
      username: readOptional(env, 'MQTT_USERNAME'),
      password: readOptional(env, 'MQTT_PASSWORD'),
      enabled: Boolean(mqttBrokerUrl),
    },
    ai: {
      openaiApiKey: readOptional(env, 'OPENAI_API_KEY'),
      anthropicApiKey: readOptional(env, 'ANTHROPIC_API_KEY'),
      azureOpenAIEndpoint: readOptional(env, 'AZURE_OPENAI_ENDPOINT'),
      provider: readOptional(env, 'AI_PROVIDER') || 'anthropic',
      model: readOptional(env, 'AI_MODEL') || 'claude-3-5-sonnet-20241022',
      temperature: readNumber(env, 'AI_TEMPERATURE', 0.2),
      maxTokens: readNumber(env, 'AI_MAX_TOKENS', 2000),
      streamingEnabled: readBoolean(env, 'AI_STREAMING_ENABLED'),
      enabled: readBoolean(env, 'AI_ENABLED'),
      rateLimits: {
        free: readNumber(env, 'AI_RATE_LIMIT_FREE', 10),
        professional: readNumber(env, 'AI_RATE_LIMIT_PRO', 1000),
        institutional: readNumber(env, 'AI_RATE_LIMIT_INSTITUTIONAL', 10000),
      },
    },
    telehealth: {
      videoProvider,
      zoomApiKey: readOptional(env, 'ZOOM_API_KEY'),
      enabled: videoProvider !== 'mock',
    },
    notifications: {
      surgeSmsGatewayUrl: readOptional(env, 'SURGE_SMS_GATEWAY_URL'),
      incidentEscalationEmails: readCsv(env, 'INCIDENT_ESCALATION_EMAILS'),
    },
    runtime: {
      jestWorkerId: readOptional(env, 'JEST_WORKER_ID'),
      strictSaasEntitlements: readBoolean(env, 'CAREDROID_STRICT_SAAS_ENTITLEMENTS'),
      tenantIsolationDisabled: readBoolean(env, 'CAREDROID_TENANT_ISOLATION_DISABLED'),
      simulationHealthStatus: readOptional(env, 'SIMULATION_HEALTH_STATUS') || 'healthy',
    },
  };
}

export function validateEnvironmentConfig(
  config: EnvironmentConfig = getEnvironmentConfig(),
): EnvironmentConfig {
  const errors: string[] = [];
  const isProduction = config.environment.isProduction || config.server.nodeEnv === 'production';

  if (isProduction && (!config.auth.jwtSecret || config.auth.jwtSecret === DEFAULT_JWT_SECRET)) {
    errors.push('JWT_SECRET is required in production and must not use the local default');
  }

  if (config.database.enableMongooseEmergencyOs && !config.database.mongodbUri) {
    errors.push('MONGODB_URI is required when ENABLE_MONGOOSE_EMERGENCY_OS=true');
  }

  if (config.externalApis.mohFhir.enabled) {
    if (!config.externalApis.mohFhir.baseUrl) {
      errors.push('MOH_FHIR_BASE_URL is required when MOH FHIR credentials are configured');
    }
    if (!config.externalApis.mohFhir.clientId) {
      errors.push('MOH_CLIENT_ID is required when MOH FHIR integration is configured');
    }
    if (!config.externalApis.mohFhir.clientSecret) {
      errors.push('MOH_CLIENT_SECRET is required when MOH FHIR integration is configured');
    }
  }

  if (config.mqtt.enabled && (config.mqtt.username || config.mqtt.password)) {
    if (!config.mqtt.username) {
      errors.push('MQTT_USERNAME is required when MQTT_PASSWORD is set');
    }
    if (!config.mqtt.password) {
      errors.push('MQTT_PASSWORD is required when MQTT_USERNAME is set');
    }
  }

  if (config.ai.enabled) {
    const hasConfiguredAIProvider = Boolean(
      config.ai.openaiApiKey || config.ai.anthropicApiKey || config.ai.azureOpenAIEndpoint,
    );
    if (!hasConfiguredAIProvider) {
      errors.push(
        'At least one AI provider variable is required when AI_ENABLED=true: OPENAI_API_KEY, ANTHROPIC_API_KEY, or AZURE_OPENAI_ENDPOINT',
      );
    }
  }

  if (config.ai.provider === 'openai' && config.ai.enabled && !config.ai.openaiApiKey) {
    errors.push('OPENAI_API_KEY is required when AI_PROVIDER=openai and AI_ENABLED=true');
  }

  if (config.ai.provider === 'anthropic' && config.ai.enabled && !config.ai.anthropicApiKey) {
    errors.push('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic and AI_ENABLED=true');
  }

  if (
    config.ai.provider === 'azure-openai' &&
    config.ai.enabled &&
    !config.ai.azureOpenAIEndpoint
  ) {
    errors.push(
      'AZURE_OPENAI_ENDPOINT is required when AI_PROVIDER=azure-openai and AI_ENABLED=true',
    );
  }

  if (config.telehealth.videoProvider === 'zoom' && !config.telehealth.zoomApiKey) {
    errors.push('ZOOM_API_KEY is required when VIDEO_PROVIDER=zoom');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return config;
}

export const environmentConfig = (): EnvironmentConfig => {
  const config = getEnvironmentConfig();
  return validateEnvironmentConfig(config);
};

export default environmentConfig;
