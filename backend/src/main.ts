import './observability/datadog';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';
import * as Sentry from '@sentry/node';
import mongoose from 'mongoose';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import {
  registerEdgeAIAmbulanceWebSocketSupport,
  registerEMSWebSocketSupport,
  registerSentinelAvlWebSocketSupport,
} from './api/ems.socket';
import healthRoutes from './api/health.routes';
import { reassessmentScheduler } from './scheduler/reassessment.scheduler';
import { initializeAllServices } from './services/service-registry';
import { initSentry } from './config/sentry.config';
import { type EnvironmentConfig, getEnvironmentConfig } from './config/environment.config';
import { SWAGGER_DOCS_PATH } from './server-routes';
import {
  resolveFrontendDistPath,
  resolveFrontendIndexPath,
  STATIC_ASSET_RENDER_PATH,
} from './static-asset-excludes';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { createRuntimeJwtAuthenticator, createSocketJwtAuthMiddleware } from './api/runtime-auth';
import { User } from './modules/users/entities/user.entity';
import { Permission } from './modules/auth/enums/permission.enum';

function shouldServeFrontendAssets(config: EnvironmentConfig) {
  return config.server.nodeEnv === 'production' && !config.runtime.jestWorkerId;
}

async function registerEmergencyMongooseRuntime(
  app: INestApplication,
  logger: Logger,
  config: EnvironmentConfig,
) {
  if (!config.database.enableMongooseEmergencyOs) return;

  const mongoUri = config.database.mongodbUri;
  if (!mongoUri) {
    logger.warn(
      'ENABLE_MONGOOSE_EMERGENCY_OS=true but MONGODB_URI/DATABASE_MONGO_URI is not set; skipping Mongoose connection and reassessment scheduler.',
    );
    return;
  }

  await mongoose.connect(mongoUri);
  reassessmentScheduler.start();
  logger.log('Mongoose CareDroid runtime ready: connection established, reassessment scheduler running.');
}

function registerProductionFrontendAssets(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  const frontendDistPath = resolveFrontendDistPath(__dirname);
  const frontendIndexPath = resolveFrontendIndexPath(__dirname);

  app.use('/assets', express.static(join(frontendDistPath, 'assets'), { index: false }));
  app.use(express.static(frontendDistPath, { index: false }));
  app.use((req, res, next) => {
    const requestPaths = [
      req.originalUrl,
      `${req.baseUrl || ''}${req.url || ''}`,
      req.url,
      req.path,
    ]
      .filter(Boolean)
      .map((path) => path.split('?')[0]);
    const isOperationalRoute = requestPaths.some(
      (path) =>
        path === '/api' ||
        path.startsWith('/api/') ||
        path === '/health' ||
        path === '/metrics' ||
        path.startsWith('/metrics/'),
    );
    const requestPath = requestPaths[0] || '/';

    if (
      isOperationalRoute ||
      !['GET', 'HEAD'].includes(req.method) ||
      !STATIC_ASSET_RENDER_PATH.test(requestPath)
    ) {
      next();
      return;
    }

    res.sendFile(frontendIndexPath);
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize Sentry for error tracking BEFORE creating the app
  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true,
  });
  const environment = getEnvironmentConfig();

  // Enhanced Security headers with HSTS and strict CSP
  app.use(
    helmet({
      // Strict Transport Security: enforce HTTPS, prevent downgrade attacks
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true, // Allow addition to HSTS preload list
      },
      // Content Security Policy: prevent XSS attacks
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // X-Frame-Options: prevent clickjacking
      frameguard: { action: 'deny' },
      // X-Content-Type-Options: prevent MIME sniffing
      noSniff: true,
      // X-XSS-Protection: legacy XSS protection
      xssFilter: true,
      // Referrer-Policy: control referrer information
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  const loggingMiddleware = new LoggingMiddleware();
  app.use((req, res, next) => loggingMiddleware.use(req, res, next));

  app.enableCors({
    origin: environment.server.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CareDroid-Organization-Id',
      'X-CareDroid-Workspace-Id',
      'X-CareDroid-User-Id',
      'X-CareDroid-Role',
      'X-CareDroid-Subscription-Plan',
      'X-CareDroid-Tenant-Source',
      'X-Request-Id',
      'X-Correlation-Id',
      'X-Workflow-Trace-Id',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  if (shouldServeFrontendAssets(environment)) {
    registerProductionFrontendAssets(app);
  }

  // API prefix (health, metrics, and root endpoints will be at /). metrics
  // must stay unprefixed: MetricsController is documented and built as a
  // standard Prometheus scrape target, and a default `scrape_config` (no
  // explicit metrics_path override) requests /metrics, not /api/metrics.
  app.setGlobalPrefix('api', { exclude: ['health', 'metrics', ''] });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('typeormDataSource', app.get(DataSource));
  expressApp.use('/api/health', healthRoutes);
  expressApp.use('/health', healthRoutes);

  await registerEmergencyMongooseRuntime(app, logger, environment);
  // Service-registry init made unconditional in Cycle 289: every one of the
  // ~26 services in emergencyOsServiceRegistry that has a lifecycle method
  // at all (initialize/start/connect/startScheduler -- most have none) does
  // trivial, synchronous, in-memory setup with no Mongo/network dependency
  // (verified by reading each one), and initializeAllServices() already
  // try/catches per service, so a failure here can never crash bootstrap.
  // Previously this only ran when ENABLE_MONGOOSE_EMERGENCY_OS was on, which
  // meant the many non-Mongo services in the registry never got initialized
  // or reported at all in default config.
  const initialization = await initializeAllServices();
  if (initialization.totals.failed > 0) {
    logger.warn(
      `CareDroid service registry initialized with ${initialization.totals.failed} failed service(s).`,
    );
  } else {
    logger.log(
      `CareDroid service registry initialized (${initialization.totals.ready}/${initialization.totals.registered} ready).`,
    );
  }
  const authenticateSocket = createRuntimeJwtAuthenticator(
    app.get(JwtService),
    app.get(ConfigService),
    app.get(DataSource).getRepository(User),
  );
  // EMS WebSocket bridge: EmsController (registered unconditionally in
  // AppModule, not gated) depends on this having run for its whiteboard
  // emission (emitToWhiteboard -> app.get('io'), Cycle 282). Made
  // unconditional in Cycle 288 to match its two siblings below -- previously
  // this only ran when ENABLE_MONGOOSE_EMERGENCY_OS was on, which meant the
  // bridge silently never existed in default config even though the
  // controller using it was always live. registerEMSWebSocketSupport itself
  // has no Mongo dependency; it just waits for connections until it does.
  registerEMSWebSocketSupport(
    expressApp,
    app.getHttpServer(),
    environment.server.corsOrigins,
    createSocketJwtAuthMiddleware(authenticateSocket, Permission.READ_PHI),
  );
  registerEdgeAIAmbulanceWebSocketSupport(
    expressApp,
    app.getHttpServer(),
    undefined,
    environment.server.corsOrigins,
    createSocketJwtAuthMiddleware(authenticateSocket, Permission.WRITE_PHI),
  );
  registerSentinelAvlWebSocketSupport(
    expressApp,
    app.getHttpServer(),
    environment.server.corsOrigins,
    createSocketJwtAuthMiddleware(authenticateSocket, Permission.VIEW_SENTINEL_COMMAND),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CareDroid API')
    .setDescription('HIPAA-compliant clinical platform backend')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('users', 'User Management')
    .addTag('subscriptions', 'Stripe Subscription Management')
    .addTag('clinical', 'Clinical Data (Drugs, Protocols, Lab Values)')
    .addTag('ai', 'OpenAI GPT-4 Integration')
    .addTag('audit', 'HIPAA Audit Logs')
    .addTag('compliance', 'GDPR & Compliance')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_DOCS_PATH, app, document);

  // Sentry error handler: must be registered after all routes/controllers
  // are mounted and before app.listen(), so it only catches errors that
  // escape NestJS's own exception filters (registered above).
  Sentry.setupExpressErrorHandler(expressApp);

  const port = environment.server.port;
  await app.listen(port);

  logger.log(`CareDroid Backend running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/${SWAGGER_DOCS_PATH}`);
  logger.log(`Prometheus metrics at: http://localhost:${port}/api/metrics`);
  logger.log(`Environment: ${environment.server.nodeEnv}`);
  logger.log('TLS 1.3: ENFORCED (only TLS 1.3+ allowed)');
  logger.log('Monitoring Stack when docker-compose is running:');
  logger.log('Grafana dashboards: http://localhost:3001');
  logger.log('Prometheus: http://localhost:9090');
  logger.log('Kibana logs: http://localhost:5601');
  logger.log('Sentry errors: http://localhost:9000');
}

bootstrap();
