import * as Joi from 'joi';

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

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('local', 'development', 'test', 'staging', 'production')
    .default('development'),
  APP_ENV: Joi.string().valid('local', 'development', 'staging', 'production').optional(),
  CARE_ENV: Joi.string().valid('local', 'development', 'staging', 'production').optional(),
  ENVIRONMENT_BANNER_ENABLED: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .optional(),
  DEPLOYMENT_ID: Joi.string().allow('').optional(),
  DEPLOYMENT_REGION: Joi.string().allow('').optional(),
  APP_VERSION: Joi.string().allow('').optional(),
  GIT_COMMIT: Joi.string().allow('').optional(),
  GIT_BRANCH: Joi.string().allow('').optional(),
  DEPLOYED_AT: Joi.string().allow('').optional(),
  BUILD_TIME: Joi.string().allow('').optional(),
  PORT: Joi.number().port().default(3000),
  DATABASE_CLIENT: Joi.string().valid('sqlite', 'postgres').optional(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: [/postgres/, /postgresql/] })
    .optional(),
  DATABASE_HOST: Joi.string().optional(),
  DATABASE_PORT: Joi.number().port().optional(),
  DATABASE_USER: Joi.string().optional(),
  DATABASE_PASSWORD: Joi.string().optional(),
  DATABASE_NAME: Joi.string().optional(),
  JWT_SECRET: productionSecret('JWT_SECRET', 'CHANGE_ME_IN_PRODUCTION'),
  ENCRYPTION_MASTER_KEY: Joi.string().allow('').optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  ENABLE_DEV_AUTH_BYPASS: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .optional(),
  ALLOW_DEMO_AUTH_IN_PRODUCTION: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .optional(),
});
