# Environment Management

## Purpose

Environment Management standardizes how CareDroid identifies runtime stage, validates configuration, and exposes deployment metadata. It helps operators distinguish local, development, staging, and production deployments without relying on ad hoc environment strings.

## Supported Environments

- `local`: workstation or local demo runtime.
- `development`: shared development services or default non-production runtime.
- `staging`: release candidate and pre-production validation.
- `production`: live customer-facing deployment.

Backend validation accepts `CARE_ENV` or `APP_ENV` for the CareDroid environment. `NODE_ENV` remains available for framework behavior and test execution.

## Environment Config Validation

Backend validation is enforced through the Nest `ConfigModule` Joi schema.

Validated environment fields include:

- `CARE_ENV`
- `APP_ENV`
- `NODE_ENV`
- `ENVIRONMENT_BANNER_ENABLED`
- `DEPLOYMENT_ID`
- `DEPLOYMENT_REGION`
- `APP_VERSION`
- `GIT_COMMIT`
- `GIT_BRANCH`
- `DEPLOYED_AT`
- `BUILD_TIME`

Unknown `CARE_ENV` or `APP_ENV` values are rejected at backend startup. Frontend environment values are normalized from `VITE_APP_ENVIRONMENT` and fall back to `development` if invalid.

## Environment Banner

The authenticated app shell renders an environment banner for non-production environments and invalid frontend environment fallbacks.

The banner shows:

- Environment name.
- Deployment ID when provided.
- Short commit hash when provided.
- Invalid environment fallback warning when applicable.

Production suppresses the banner by default to reduce visual noise while still exposing metadata through system config and build info.

## Deployment Metadata

Deployment metadata is exposed through `GET /api/config/system`:

- Environment name and allowed values.
- Environment validation source.
- Banner enabled flag.
- Deployment ID.
- Deployment region.
- App version.
- Commit SHA.
- Branch.
- Deployment timestamp.

Frontend build metadata also reads `VITE_DEPLOYMENT_ID`, `VITE_DEPLOYMENT_REGION`, `VITE_GIT_COMMIT`, `VITE_GIT_BRANCH`, and `VITE_DEPLOYED_AT` so hosted deployments can show consistent metadata even before backend config loads.

## Operational Rules

- Use `CARE_ENV` or `APP_ENV` for CareDroid deployment stage.
- Keep `NODE_ENV=production` for optimized production server behavior.
- Use `CARE_ENV=staging` with `NODE_ENV=production` for staging builds that should behave like production but show staging identity.
- Keep deployment metadata non-secret; never place credentials or tokens in metadata fields.
- Use `/api/config/system` as the source of truth for backend runtime environment and deployment metadata.
