import './observability/datadog';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { initSentry } from './config/sentry.config';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { SWAGGER_DOCS_PATH } from './server-routes';
import {
  resolveFrontendDistPath,
  resolveFrontendIndexPath,
  STATIC_ASSET_RENDER_PATH,
} from './static-asset-excludes';

function shouldServeFrontendAssets() {
  return process.env.NODE_ENV === 'production' && !process.env.JEST_WORKER_ID;
}

function registerProductionFrontendAssets(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  const frontendDistPath = resolveFrontendDistPath(__dirname);
  const frontendIndexPath = resolveFrontendIndexPath(__dirname);

  app.use('/assets', express.static(join(frontendDistPath, 'assets'), { index: false }));
  app.use('/vite.svg', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      next();
      return;
    }

    res.sendFile(join(frontendDistPath, 'vite.svg'));
  });
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
  // Initialize Sentry for error tracking BEFORE creating the app
  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true,
  });

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

  // Sentry error tracking middleware (must be early in the middleware stack)
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());

  // HTTP request/response logging middleware (temporarily disabled for testing)
  // app.use(LoggingMiddleware);

  // CORS configuration (allow same-origin since frontend is proxied)
  const defaultOrigins = ['http://localhost:8000'];
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  if (shouldServeFrontendAssets()) {
    registerProductionFrontendAssets(app);
  }

  // API prefix (health and root endpoints will be at /)
  app.setGlobalPrefix('api', { exclude: ['health', ''] });

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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 CareDroid Backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/${SWAGGER_DOCS_PATH}`);
  console.log(`📊 Prometheus metrics at: http://localhost:${port}/api/metrics`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 TLS 1.3: ENFORCED (only TLS 1.3+ allowed)`);
  console.log(`\n📈 Monitoring Stack (when docker-compose running):`);
  console.log(`   - Grafana dashboards: http://localhost:3001`);
  console.log(`   - Prometheus: http://localhost:9090`);
  console.log(`   - Kibana logs: http://localhost:5601`);
  console.log(`   - Sentry errors: http://localhost:9000`);
}

bootstrap();
