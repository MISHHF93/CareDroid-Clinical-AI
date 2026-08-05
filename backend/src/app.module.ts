import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers & Services
import { AppController } from './app.controller';

// Configuration
import { buildPostgresOptions } from './config/database-url.config';
import { jwtConfig, oauthConfig, sessionConfig } from './config/auth.config';
import emailConfig from './config/email.config';
import redisConfig from './config/redis.config';
import stripeConfig from './config/stripe.config';
import datadogConfig from './config/datadog.config';
import aiConfig from './config/ai.config';
import encryptionConfig from './config/encryption.config';
import loggerConfig from './config/logger.config';
import ragConfig from './config/rag.config';
import anomalyDetectionConfig from './config/anomaly-detection.config';
import nluConfig from './config/nlu.config';
import firebaseConfig from './config/firebase.config';
import environmentConfig, {
  envValidationSchema,
  getEnvironmentConfig,
} from './config/environment.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TwoFactorModule } from './modules/two-factor/two-factor.module';
import { AiModule } from './modules/ai/ai.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { AuditModule } from './modules/audit/audit.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ChatModule } from './modules/chat/chat.module';
import { ClinicalIntelligenceModule } from './modules/clinical-intelligence/clinical-intelligence.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MedicalControlPlaneModule } from './modules/medical-control-plane/medical-control-plane.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { RAGModule } from './modules/rag/rag.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { EmailModule } from './modules/email/email.module';
import { CacheModule } from './modules/cache/cache.module';
import { LiveTrackingModule } from './modules/live-tracking/live-tracking.module';
import { ClinicalAlertsModule } from './modules/clinical-alerts/clinical-alerts.module';
import { PlatformSystemsModule } from './modules/platform-systems/platform-systems.module';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UserActivityModule } from './modules/user-activity/user-activity.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { MemoryModule } from './modules/memory/memory.module';
import { ToolCallingModule } from './modules/tool-calling/tool-calling.module';
import { TrainingModule } from './modules/training/training.module';
import { CostOptimizerModule } from './modules/cost-optimizer/cost-optimizer.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { PlatformGovernanceModule } from './modules/platform-governance';
import { GovernanceModule } from './modules/governance/governance.module';
import { LlmSecurityModule } from './modules/llm-security/llm-security.module';
import { InteroperabilityModule } from './modules/interoperability/interoperability.module';
import { RegulatoryModule } from './modules/regulatory/regulatory.module';
import { EquityModule } from './modules/equity/equity.module';
import { HumanReviewModule } from './modules/human-review/human-review.module';
import { PrivacyCenterModule } from './modules/privacy-center/privacy-center.module';
import { EhrAuditModule } from './modules/ehr-audit/ehr-audit.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { HospitalMapModule } from './modules/hospital-map';
import { TelemetryModule } from './modules/telemetry';
import { FleetModule } from './modules/fleet';
import { SurveillanceModule } from './modules/surveillance';
import { WorkspaceIntelligenceModule } from './modules/workspace-intelligence/workspace-intelligence.module';
import { SimulationModule } from './modules/simulation';
import { PlatformAssetsModule } from './modules/platform-assets/platform-assets.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProductCatalogModule } from './modules/product-catalog/product-catalog.module';
import { TenantContextModule } from './modules/tenant-context/tenant-context.module';
import { AutomationAuditModule } from './modules/automation-audit/automation-audit.module';
import { EmergencyOsModule } from './modules/emergency-os/emergency-os.module';
import { CigModule } from './modules/cig/cig.module';
import { CollaborationHubModule } from './modules/collaboration-hub/collaboration-hub.module';
import { NativeAiModule } from './modules/native-ai/native-ai.module';
import { UnifiedAiNodeModule } from '../ml-services/unified-ai-node/unified-ai-node.module';
import { SentinelModule } from './modules/sentinel/sentinel.module';
import { SurgeModule } from './modules/surge/surge.module';
import { CapacityModule } from './modules/capacity/capacity.module';
import { DeteriorationModule } from './modules/deterioration/deterioration.module';
import { ProtocolModule } from './modules/protocol/protocol.module';
import { ReassessmentModule } from './modules/reassessment/reassessment.module';
import { EmsModule } from './modules/ems/ems.module';
import { BoardingModule } from './modules/boarding/boarding.module';

// Monitoring & Observability
import { LoggerModule } from './modules/common/logger.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';

function resolveDatabaseClient() {
  const config = getEnvironmentConfig();
  const configuredClient = config.database.sql.client;
  if (configuredClient) return configuredClient;

  const hasExplicitPostgresConfig = [
    config.database.sql.url,
    config.database.sql.host !== 'localhost' ? config.database.sql.host : '',
    config.database.sql.username !== 'postgres' ? config.database.sql.username : '',
    config.database.sql.password !== 'postgres' ? config.database.sql.password : '',
    config.database.sql.databaseName !== 'caredroid' ? config.database.sql.databaseName : '',
  ].some(Boolean);

  return config.server.nodeEnv === 'development' && !hasExplicitPostgresConfig
    ? 'sqlite'
    : 'postgres';
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      load: [
        jwtConfig,
        oauthConfig,
        sessionConfig,
        emailConfig,
        redisConfig,
        stripeConfig,
        datadogConfig,
        aiConfig,
        encryptionConfig,
        loggerConfig,
        ragConfig,
        anomalyDetectionConfig,
        nluConfig,
        firebaseConfig,
        environmentConfig,
      ],
    }),

    // Database (load after ConfigModule so .env is available)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const config = getEnvironmentConfig();
        const client = resolveDatabaseClient();
        if (client === 'sqlite') {
          return {
            type: 'sqlite',
            database: config.database.sql.sqlitePath,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            logging: false,
          };
        }
        return {
          ...buildPostgresOptions({
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: config.server.nodeEnv === 'development' && client !== 'postgres',
            migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          }),
          migrationsRun: true,
        };
      },
    }),

    // Rate limiting (100 requests per 15 minutes)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute in milliseconds
        limit: 100,
      },
    ]),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Monitoring & Observability
    LoggerModule,
    MetricsModule,

    // Email & Caching
    EmailModule,
    CacheModule,

    // Feature modules
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    TwoFactorModule,
    AiModule,
    ClinicalModule,
    AuditModule,
    ComplianceModule,
    ChatModule,
    ClinicalIntelligenceModule,
    AnalyticsModule,
    NotificationModule,
    PermissionsModule,
    WorkspacesModule,
    UserActivityModule,
    PersonalizationModule,
    ArtifactsModule,
    MemoryModule,
    ToolCallingModule,
    TrainingModule,
    CostOptimizerModule,
    EvaluationModule,
    PlatformGovernanceModule,
    GovernanceModule,
    LlmSecurityModule,
    InteroperabilityModule,
    RegulatoryModule,
    EquityModule,
    HumanReviewModule,
    PrivacyCenterModule,
    EhrAuditModule,
    ObservabilityModule,
    UserProfileModule,
    LiveTrackingModule,
    HospitalMapModule,
    TelemetryModule,
    FleetModule,
    SurveillanceModule,
    WorkspaceIntelligenceModule,
    SimulationModule,
    ClinicalAlertsModule,
    PlatformSystemsModule,
    PlatformAssetsModule,
    OrganizationsModule,
    ProductCatalogModule,
    TenantContextModule,
    AutomationAuditModule,
    EmergencyOsModule,
    CigModule,
    SentinelModule,
    SurgeModule,
    CapacityModule,
    DeteriorationModule,
    ProtocolModule,
    ReassessmentModule,
    EmsModule,
    BoardingModule,
    CollaborationHubModule,
    NativeAiModule,
    // CareDroid 1-node local ML backbone (ADR-0003): NLU + artifact-router + /api/ai/node/*
    // UnifiedAiNodeModule imports NluModule (keeps /api/nlu/*) and registers the unified surface.
    UnifiedAiNodeModule,

    // Medical Control Plane (Intent Classification, Tool Orchestration)
    MedicalControlPlaneModule,

    // Encryption (Batch 4)
    EncryptionModule,

    // RAG Engine (Batch 6)
    RAGModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
