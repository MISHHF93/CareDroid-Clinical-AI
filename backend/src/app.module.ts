import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers & Services
import { AppController } from './app.controller';

// Configuration
import { databaseConfig } from './config/database.config';
import { jwtConfig, oauthConfig, sessionConfig } from './config/auth.config';
import emailConfig from './config/email.config';
import redisConfig from './config/redis.config';
import stripeConfig from './config/stripe.config';
import datadogConfig from './config/datadog.config';
import openaiConfig from './config/openai.config';
import encryptionConfig from './config/encryption.config';
import loggerConfig from './config/logger.config';
import ragConfig from './config/rag.config';
import anomalyDetectionConfig from './config/anomaly-detection.config';
import nluConfig from './config/nlu.config';
import firebaseConfig from './config/firebase.config';

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

// Monitoring & Observability
import { LoggerModule } from './modules/common/logger.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        jwtConfig,
        oauthConfig,
        sessionConfig,
        emailConfig,
        redisConfig,
        stripeConfig,
        datadogConfig,
        openaiConfig,
        encryptionConfig,
        loggerConfig,
        ragConfig,
        anomalyDetectionConfig,
        nluConfig,
        firebaseConfig,
      ],
    }),

    // Database (load after ConfigModule so .env is available)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const client = (process.env.DATABASE_CLIENT || '').toLowerCase();
        if (client === 'sqlite') {
          return {
            type: 'sqlite',
            database: process.env.SQLITE_PATH || 'caredroid.dev.sqlite',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            logging: false,
          };
        }
        return databaseConfig;
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
    ClinicalAlertsModule,
    PlatformSystemsModule,

    // Medical Control Plane (Intent Classification, Tool Orchestration)
    MedicalControlPlaneModule,

    // Encryption (Batch 4)
    EncryptionModule,

    // RAG Engine (Batch 6)
    RAGModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
