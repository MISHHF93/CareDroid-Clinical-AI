import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1788458816846 implements MigrationInterface {
  name = 'InitialSchema1788458816846';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "workspace_memberships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workspaceId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "role" character varying NOT NULL DEFAULT 'viewer',
                "permissions" text,
                "teams" text,
                "department" character varying(120),
                "status" character varying NOT NULL DEFAULT 'active',
                "joinedAt" TIMESTAMP,
                "lastAccessedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_38b7d40a750229143fda4a1b011" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_45f60c90c7a7cb6cdb1d2ad3c0" ON "workspace_memberships" ("userId", "status")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_822143ae1e972a993a781efbd8" ON "workspace_memberships" ("workspaceId", "userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace_invitations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workspaceId" uuid NOT NULL,
                "email" character varying(255) NOT NULL,
                "role" character varying(60) NOT NULL,
                "invitedByUserId" uuid NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "expiresAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_525b9069dc828a8ee8fdc62c32c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_32eb7bea0dcef6763235d7b594" ON "workspace_invitations" ("workspaceId", "email")
        `);
    await queryRunner.query(`
            CREATE TABLE "workspaces" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" character varying NOT NULL,
                "name" character varying(255) NOT NULL,
                "slug" character varying(160) NOT NULL,
                "organizationId" uuid,
                "parentWorkspaceId" uuid,
                "ownerUserId" uuid,
                "branding" text,
                "settings" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_b8e9fe62e93d60089dfc4f175f3" UNIQUE ("slug"),
                CONSTRAINT "PK_098656ae401f3e1a4586f47fd8e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_31e95fb27ca3ed76cd476565aa" ON "workspaces" ("type", "slug")
        `);
    await queryRunner.query(`
            CREATE TABLE "user_workspace_states" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "activeWorkspaceId" uuid,
                "recentWorkspaceIds" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6ab59b4e8d564cae2cdb68d0a6b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_5d4603199aec9dca2cdc2f9e53" ON "user_workspace_states" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "organizations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "organizationType" character varying(64) NOT NULL DEFAULT 'hospital',
                "country" character varying(120),
                "branding" text,
                "settings" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"),
                CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_profiles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "fullName" character varying(255) NOT NULL,
                "firstName" character varying(128),
                "lastName" character varying(128),
                "institution" character varying(255),
                "organizationId" uuid,
                "roleProfileId" character varying(80),
                "specialty" character varying(100),
                "licenseNumber" character varying(255),
                "country" character varying(50),
                "languagePreference" character varying(10),
                "timezone" character varying(50),
                "verified" boolean NOT NULL DEFAULT false,
                "trustScore" integer NOT NULL DEFAULT '0',
                "avatarUrl" text,
                "dateOfBirthEncrypted" bytea,
                "medicalHistoryEncrypted" bytea,
                "allergiesEncrypted" bytea,
                "medicationsEncrypted" bytea,
                "encryptionKeyVersion" integer,
                "consentMarketingCommunications" boolean NOT NULL DEFAULT false,
                "consentDataProcessing" boolean NOT NULL DEFAULT false,
                "consentThirdPartySharing" boolean NOT NULL DEFAULT false,
                "consentEssentialCookies" boolean NOT NULL DEFAULT true,
                "consentMarketingUpdatedAt" TIMESTAMP,
                "consentDataProcessingUpdatedAt" TIMESTAMP,
                "consentThirdPartySharingUpdatedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_8481388d6325e752cd4d7e26c6" UNIQUE ("userId"),
                CONSTRAINT "PK_1ec6662219f4605723f1e41b6cb" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8481388d6325e752cd4d7e26c6" ON "user_profiles" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "oauth_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "provider" character varying NOT NULL,
                "providerAccountId" character varying(255) NOT NULL,
                "accessToken" character varying(255),
                "refreshToken" character varying(255),
                "tokenExpiry" TIMESTAMP,
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_710a81523f515b78f894e33bb10" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "two_factor_auth" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "enabled" boolean NOT NULL DEFAULT false,
                "secret" character varying(255),
                "backupCodes" text,
                "lastUsedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_ceebe2fe995d01aeff8cb013f5" UNIQUE ("userId"),
                CONSTRAINT "PK_ac930594b4dbe3771cf16cd108d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ceebe2fe995d01aeff8cb013f5" ON "two_factor_auth" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "subscriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "stripeCustomerId" character varying(255),
                "stripeSubscriptionId" character varying(255),
                "stripePriceId" character varying(255),
                "tier" character varying NOT NULL DEFAULT 'free',
                "status" character varying NOT NULL DEFAULT 'active',
                "currentPeriodStart" TIMESTAMP,
                "currentPeriodEnd" TIMESTAMP,
                "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
                "canceledAt" TIMESTAMP,
                "trialStart" TIMESTAMP,
                "trialEnd" TIMESTAMP,
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_fbdba4e2ac694cf8c9cecf4dc8" UNIQUE ("userId"),
                CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid,
                "workspaceId" uuid,
                "organizationId" uuid,
                "actorUserId" uuid,
                "targetUserId" uuid,
                "membershipId" uuid,
                "action" character varying NOT NULL,
                "resource" character varying(255) NOT NULL,
                "ipAddress" character varying(45) NOT NULL,
                "userAgent" text,
                "phiAccessed" boolean NOT NULL DEFAULT false,
                "metadata" text,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "hash" character varying(64),
                "previousHash" character varying(64),
                "integrityVerified" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_67c4ff6334797c722a15eec21f" ON "audit_logs" ("hash")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_402d0beaced1d723bb74f9ccb4" ON "audit_logs" ("phiAccessed", "timestamp")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_65bf0f1c91acea1b3dcf5b98f1" ON "audit_logs" ("userId", "timestamp")
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "emailEncrypted" bytea,
                "passwordHash" character varying(255),
                "emailVerified" boolean NOT NULL DEFAULT false,
                "emailVerificationToken" character varying(64),
                "emailVerificationExpiry" TIMESTAMP,
                "passwordResetToken" character varying(64),
                "passwordResetExpiry" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "role" character varying NOT NULL DEFAULT 'student',
                "lastLoginAt" TIMESTAMP,
                "lastLoginIp" character varying(45),
                "phoneEncrypted" bytea,
                "ssnEncrypted" bytea,
                "encryptionKeyVersion" integer,
                "phiFieldsEncrypted" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "theme" character varying(20) NOT NULL DEFAULT 'system',
                "language" character varying(20) NOT NULL DEFAULT 'en',
                "defaultDashboard" character varying(40) NOT NULL DEFAULT 'command',
                "compactMode" boolean NOT NULL DEFAULT false,
                "accessibility" text,
                "calculatorPreferences" text,
                "toolPreferences" text,
                "aiAssistantPreferences" text,
                "notificationSettings" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_b6202d1cacc63a0b9c8dac2abd" ON "user_preferences" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "professional_profiles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "username" character varying(120),
                "profession" character varying(120),
                "department" character varying(120),
                "credentials" text,
                "certifications" text,
                "specialties" text,
                "experienceLevel" character varying(80) NOT NULL DEFAULT 'mid',
                "clinicalInterests" text,
                "licenseRegion" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b2140d2f56b0910e4c58ab4d2a2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_39f14701fcd89b15361c21cc6d" ON "professional_profiles" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "user_activities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "workspaceId" uuid,
                "category" character varying NOT NULL,
                "label" character varying(255) NOT NULL,
                "route" character varying(255),
                "metadata" text,
                "occurredAt" TIMESTAMP NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1245d4d2cf04ba7743f2924d951" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_307aad0bb31b42cc9ac67f6aaf" ON "user_activities" ("workspaceId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_aa8efbc38c6e6a1b838c7f3c52" ON "user_activities" ("userId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "training_runs" (
                "id" character varying(120) NOT NULL,
                "runJson" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3f5056858e48ed5e97b4faaa05a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "surface_views" (
                "userId" character varying(120) NOT NULL,
                "surfaceKey" character varying(80) NOT NULL,
                "organizationId" character varying(120),
                "viewedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e4d52e6d178199d67e4d5883b4f" PRIMARY KEY ("userId", "surfaceKey")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_fd22b272d0ac47a0d3d970acad" ON "surface_views" ("organizationId", "userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "usage_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" character varying(120) NOT NULL,
                "workspaceId" character varying(120),
                "userId" character varying(120),
                "userRole" character varying(100),
                "assetId" character varying(120),
                "eventType" character varying NOT NULL,
                "meterId" character varying(80),
                "source" character varying(120),
                "idempotencyKey" character varying(180),
                "quantity" double precision NOT NULL DEFAULT '1',
                "unit" character varying(30) NOT NULL,
                "periodStart" TIMESTAMP NOT NULL,
                "periodEnd" TIMESTAMP NOT NULL,
                "occurredAt" TIMESTAMP NOT NULL,
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c9f17d50873fab2c46615f542bc" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_85308d1f9672093da83d9f55e5" ON "usage_events" ("organizationId", "idempotencyKey")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8675ed0ba5adafd015cd5f77ed" ON "usage_events" ("organizationId", "meterId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_96c330b231b42af211905c2757" ON "usage_events" ("organizationId", "eventType", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_003cebcec87546489d717cb938" ON "usage_events" ("organizationId", "assetId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3c19e19139bef895b382e3e663" ON "usage_events" ("organizationId", "workspaceId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7605cbbb6cfa6355939917387b" ON "usage_events" ("organizationId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_units" (
                "id" character varying(120) NOT NULL,
                "externalId" character varying(120) NOT NULL,
                "vendorId" character varying(64) NOT NULL DEFAULT 'mock',
                "label" character varying(120) NOT NULL,
                "unitType" character varying(16) NOT NULL DEFAULT 'ALS',
                "status" character varying(32) NOT NULL DEFAULT 'available',
                "freshness" character varying(16) NOT NULL DEFAULT 'offline',
                "latitude" double precision,
                "longitude" double precision,
                "heading" double precision,
                "speedKmh" double precision,
                "lastSeenAt" character varying(64),
                "lastEventSeq" integer NOT NULL DEFAULT '0',
                "organizationId" character varying(120),
                "workspaceId" character varying(120),
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b975b295728817e40acdff6d834" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d998eb5bf1a0249b6e96d18d28" ON "sentinel_units" ("externalId", "vendorId")
            WHERE "organizationId" IS NULL
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fc30ec8968f42154a2f734aad2" ON "sentinel_units" ("organizationId", "externalId", "vendorId")
            WHERE "organizationId" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_43a725bf403559e0999bac4b5e" ON "sentinel_units" ("organizationId", "status")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_positions" (
                "id" character varying(120) NOT NULL,
                "unitId" character varying(120) NOT NULL,
                "latitude" double precision NOT NULL,
                "longitude" double precision NOT NULL,
                "heading" double precision,
                "speedKmh" double precision,
                "source" character varying(64) NOT NULL,
                "receivedAt" character varying(64) NOT NULL,
                "eventSeq" integer NOT NULL DEFAULT '0',
                "sourceEventId" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0ca94158f53f220b3970dc7959d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d80de9982455c22102c621154d" ON "sentinel_positions" ("unitId", "eventSeq")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9c69885b3f17358df1e5bde9e3" ON "sentinel_positions" ("unitId", "receivedAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_outbox" (
                "id" character varying(120) NOT NULL,
                "aggregateType" character varying(64) NOT NULL,
                "aggregateId" character varying(120) NOT NULL,
                "eventType" character varying(64) NOT NULL,
                "payload" text NOT NULL,
                "status" character varying(16) NOT NULL DEFAULT 'pending',
                "attempts" integer NOT NULL DEFAULT '0',
                "availableAt" character varying(64) NOT NULL,
                "publishedAt" character varying(64),
                "lastError" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4cf02a970d01293f332d6f15a22" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_6ae638400abae7dbee1f2b90e8" ON "sentinel_outbox" ("status", "availableAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_integration_cursors" (
                "id" character varying(120) NOT NULL,
                "vendorId" character varying(64) NOT NULL,
                "lastEventId" character varying(120),
                "lastSequence" integer NOT NULL DEFAULT '0',
                "lastEventAt" character varying(64),
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b537adf3bae4f43af81ae184655" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_inbound_patients" (
                "id" character varying(120) NOT NULL,
                "unitId" character varying(120) NOT NULL,
                "status" character varying(32) NOT NULL DEFAULT 'en_route',
                "patientLabel" character varying(200),
                "patientAge" character varying(32),
                "patientSex" character varying(32),
                "chiefComplaint" text NOT NULL,
                "priority" character varying(32),
                "vitals" text,
                "times" text,
                "narrative" text,
                "etaPointMin" integer,
                "etaLowMin" integer,
                "etaHighMin" integer,
                "edPatientId" character varying(120),
                "nemsisMappedFields" text,
                "missingFields" text,
                "organizationId" character varying(120),
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0d0a698cba2ab9101d72b0c32ef" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_108027c09dfc1e0d5efb764e2a" ON "sentinel_inbound_patients" ("unitId")
            WHERE "organizationId" IS NULL
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_86c2099c59b4731907ad4a9e4c" ON "sentinel_inbound_patients" ("organizationId", "unitId")
            WHERE "organizationId" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2e664413bde9c6b6b1ad753b7d" ON "sentinel_inbound_patients" ("organizationId", "status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c22780937bfc9a237939af02c4" ON "sentinel_inbound_patients" ("unitId", "status")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_geofences" (
                "id" character varying(120) NOT NULL,
                "name" character varying(120) NOT NULL,
                "kind" character varying(32) NOT NULL,
                "ring" text NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "organizationId" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4ec48ac4e988cfa15d0e769d12c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_64769d3af20a06eeb84c051049" ON "sentinel_geofences" ("organizationId", "kind")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_geofence_events" (
                "id" character varying(120) NOT NULL,
                "unitId" character varying(120) NOT NULL,
                "fenceId" character varying(120) NOT NULL,
                "transition" character varying(16) NOT NULL,
                "occurredAt" character varying(64) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_444bdf329483874d9ebc9b2b382" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_866c73a129b7372a6a2d13c160" ON "sentinel_geofence_events" ("unitId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_eta_snapshots" (
                "id" character varying(120) NOT NULL,
                "unitId" character varying(120) NOT NULL,
                "etaPointMin" integer NOT NULL,
                "etaLowMin" integer NOT NULL,
                "etaHighMin" integer NOT NULL,
                "confidence" double precision NOT NULL,
                "method" character varying(32) NOT NULL,
                "inputsHash" character varying(64) NOT NULL,
                "distanceKm" double precision NOT NULL,
                "stale" boolean NOT NULL DEFAULT false,
                "calculatedAt" character varying(64) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8fe9ffd7f5a0bf6743cbeae254d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_0065829aa9b0a16b20718047d1" ON "sentinel_eta_snapshots" ("unitId", "calculatedAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_ems_episodes" (
                "id" character varying(120) NOT NULL,
                "unitId" character varying(120) NOT NULL,
                "inboundPatientId" character varying(120),
                "status" character varying(32) NOT NULL DEFAULT 'dispatched',
                "dispatchedAt" character varying(64),
                "onSceneAt" character varying(64),
                "enRouteHospitalAt" character varying(64),
                "arrivedAt" character varying(64),
                "handoffStartedAt" character varying(64),
                "handoffCompletedAt" character varying(64),
                "unitAvailableAt" character varying(64),
                "predictedEtaMin" integer,
                "actualTravelMin" integer,
                "organizationId" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3c260964fb366358a05cd780840" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_14ac7f7a313b8675c5aefbc125" ON "sentinel_ems_episodes" ("organizationId", "updatedAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c1819da4e7775e08afcefc5a21" ON "sentinel_ems_episodes" ("unitId", "status")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_alarm_events" (
                "id" character varying(120) NOT NULL,
                "alarmId" character varying(120) NOT NULL,
                "action" character varying(32) NOT NULL,
                "actorId" character varying(120),
                "actorRole" character varying(64),
                "occurredAt" character varying(64) NOT NULL,
                "reason" text,
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_515b9acc709e2f1a5bc152b5dc7" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_996aa6af32c7ae14c5b67ac149" ON "sentinel_alarm_events" ("alarmId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_alarms" (
                "id" character varying(120) NOT NULL,
                "fingerprint" character varying(80) NOT NULL,
                "source" character varying(64) NOT NULL,
                "category" character varying(64) NOT NULL,
                "ruleId" character varying(64) NOT NULL,
                "subjectId" character varying(120) NOT NULL,
                "severity" character varying(16) NOT NULL,
                "urgency" character varying(16) NOT NULL,
                "status" character varying(16) NOT NULL DEFAULT 'open',
                "title" character varying(200) NOT NULL,
                "message" text NOT NULL,
                "createdAtIso" character varying(64) NOT NULL,
                "acknowledgedAt" character varying(64),
                "acknowledgedBy" character varying(120),
                "escalatedAt" character varying(64),
                "resolvedAt" character varying(64),
                "dismissedAt" character varying(64),
                "expiredAt" character varying(64),
                "suppressUntil" character varying(64),
                "organizationId" character varying(120),
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6715f37a9ac20fdaa0cc2ec1749" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e10d660dad2d66214f545131c1" ON "sentinel_alarms" ("subjectId", "status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_0875b5f1ad6ac1443ac9512b9d" ON "sentinel_alarms" ("fingerprint")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_684d1c38ac7dd1f94a4f4e0706" ON "sentinel_alarms" ("status", "severity")
        `);
    await queryRunner.query(`
            CREATE TABLE "sentinel_ai_recommendations" (
                "id" character varying(120) NOT NULL,
                "kind" character varying(64) NOT NULL,
                "summary" text NOT NULL,
                "recommendations" text NOT NULL,
                "evidence" text NOT NULL,
                "confidence" double precision NOT NULL,
                "modelId" character varying(80) NOT NULL,
                "modelVersion" character varying(40) NOT NULL,
                "orchestratorVersion" character varying(40) NOT NULL,
                "requiresHumanReview" boolean NOT NULL DEFAULT true,
                "humanReviewStatus" character varying(16) NOT NULL DEFAULT 'pending',
                "disclaimer" text NOT NULL,
                "sourceState" character varying(16) NOT NULL DEFAULT 'live',
                "generatedAt" character varying(64) NOT NULL,
                "linkedEntityType" character varying(64),
                "linkedEntityId" character varying(120),
                "reviewedBy" character varying(120),
                "reviewedAt" character varying(64),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_aa18d119a2c9ea4fcc6897b5ef1" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_30c03721f4b5313759d15f2906" ON "sentinel_ai_recommendations" ("humanReviewStatus", "kind")
        `);
    await queryRunner.query(`
            CREATE TABLE "specialty_catalog" (
                "id" character varying(80) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "name" character varying(180) NOT NULL,
                "description" text,
                "assetIds" text NOT NULL DEFAULT '[]',
                "protocolAssetIds" text NOT NULL DEFAULT '[]',
                "simulationAssetIds" text NOT NULL DEFAULT '[]',
                "workflowAssetIds" text NOT NULL DEFAULT '[]',
                "dashboardAssetIds" text NOT NULL DEFAULT '[]',
                "defaultAiAgentId" character varying(80),
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_3c253bcbd458cf3dab5abf06bab" UNIQUE ("slug"),
                CONSTRAINT "PK_abc45833788e4b573f2ccd80d3c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "products" (
                "id" character varying(80) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "name" character varying(180) NOT NULL,
                "description" text,
                "productType" character varying(64) NOT NULL,
                "packIds" text NOT NULL DEFAULT '[]',
                "highlightAssetIds" text NOT NULL DEFAULT '[]',
                "outcomes" text NOT NULL DEFAULT '[]',
                "targetBuyers" text NOT NULL DEFAULT '[]',
                "buyerPersona" text NOT NULL DEFAULT '[]',
                "decisionMaker" text NOT NULL DEFAULT '[]',
                "stakeholders" text NOT NULL DEFAULT '[]',
                "expectedOutcomes" text NOT NULL DEFAULT '[]',
                "targetUsers" text NOT NULL DEFAULT '[]',
                "requiredBackendCapabilities" text NOT NULL DEFAULT '[]',
                "requiredIntegrations" text NOT NULL DEFAULT '[]',
                "aiWorkflows" text NOT NULL DEFAULT '[]',
                "dashboards" text NOT NULL DEFAULT '[]',
                "pricingTierPlaceholder" character varying(64),
                "readinessLabels" text NOT NULL DEFAULT '[]',
                "complexity" character varying(32),
                "commercialPlanIds" text NOT NULL DEFAULT '[]',
                "isPublished" boolean NOT NULL DEFAULT true,
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug"),
                CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "integration_offerings" (
                "id" character varying(80) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "name" character varying(180) NOT NULL,
                "description" text,
                "category" character varying(64) NOT NULL,
                "status" character varying(32) NOT NULL DEFAULT 'roadmap',
                "linkedAssetId" character varying(80),
                "docsUrl" character varying(512),
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_26b9f8114440108d819f44bf0e2" UNIQUE ("slug"),
                CONSTRAINT "PK_607c2a9b7a23d39b069813e214f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "commercial_plans" (
                "id" character varying(80) NOT NULL,
                "name" character varying(180) NOT NULL,
                "description" text,
                "includedProductIds" text NOT NULL DEFAULT '[]',
                "includedPackIds" text NOT NULL DEFAULT '[]',
                "maxPackIds" text NOT NULL DEFAULT '[]',
                "pricingTier" character varying(32) NOT NULL DEFAULT 'standard',
                "metadata" text,
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a47001062243f8d3fe88e462ef4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "care_pathways" (
                "id" character varying(80) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "name" character varying(180) NOT NULL,
                "description" text,
                "calculatorAssetIds" text NOT NULL DEFAULT '[]',
                "protocolAssetIds" text NOT NULL DEFAULT '[]',
                "workflowAssetIds" text NOT NULL DEFAULT '[]',
                "simulationAssetIds" text NOT NULL DEFAULT '[]',
                "aiAgentId" character varying(80),
                "outcomes" text NOT NULL DEFAULT '[]',
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_b93d5e537bcd0b76eb01a1e089b" UNIQUE ("slug"),
                CONSTRAINT "PK_12dc1af7e2fdb9e823da24bd5ee" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "role_profiles" (
                "id" character varying(80) NOT NULL,
                "label" character varying(120) NOT NULL,
                "intendedRoles" text NOT NULL DEFAULT '[]',
                "specialties" text NOT NULL DEFAULT '[]',
                "preferredAssetIds" text NOT NULL DEFAULT '[]',
                "hiddenAssetIds" text NOT NULL DEFAULT '[]',
                "defaultDashboard" character varying(64) NOT NULL DEFAULT 'command',
                "defaultAiAgentId" character varying(64),
                "requiredPermissions" text NOT NULL DEFAULT '[]',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_90128cc6aeac4d977489c2615e0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "platform_assets" (
                "id" character varying(120) NOT NULL,
                "assetType" character varying(40) NOT NULL,
                "title" character varying(180) NOT NULL,
                "description" text,
                "category" character varying(80),
                "clinicalSpecialty" character varying(80),
                "route" character varying(255),
                "launchType" character varying(64),
                "permissionPolicy" text,
                "organizationTypes" text NOT NULL DEFAULT '[]',
                "roleProfiles" text NOT NULL DEFAULT '[]',
                "intendedRoles" text NOT NULL DEFAULT '[]',
                "workspaceTags" text NOT NULL DEFAULT '[]',
                "specialties" text NOT NULL DEFAULT '[]',
                "primaryDepartment" character varying(80),
                "secondaryDepartments" text NOT NULL DEFAULT '[]',
                "recommendedRoles" text NOT NULL DEFAULT '[]',
                "requiredPermissions" text NOT NULL DEFAULT '[]',
                "riskLevel" character varying(32),
                "backendStatus" character varying(32),
                "demoStatus" character varying(32),
                "governance" text,
                "lifecycle" character varying(32) NOT NULL DEFAULT 'active',
                "pricingTier" character varying(32) NOT NULL DEFAULT 'standard',
                "packIds" text NOT NULL DEFAULT '[]',
                "dependencies" text NOT NULL DEFAULT '[]',
                "catalogVersion" character varying(16) NOT NULL DEFAULT '1.0.0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bbbd217cf324ff04cdf9426eebf" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_a577d100399ed45ed591c59761" ON "platform_assets" ("lifecycle")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8abd41229da6f0b0a7f63d49a7" ON "platform_assets" ("assetType")
        `);
    await queryRunner.query(`
            CREATE TABLE "organization_entitlements" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" uuid NOT NULL,
                "packId" character varying(80) NOT NULL,
                "status" character varying(32) NOT NULL DEFAULT 'enabled',
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1aef0a2d5f4b6c897e3814d5db3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_c8e0ec979c44b9f702dce44cc7" ON "organization_entitlements" ("organizationId", "packId")
        `);
    await queryRunner.query(`
            CREATE TABLE "asset_packs" (
                "id" character varying(80) NOT NULL,
                "name" character varying(180) NOT NULL,
                "slug" character varying(120) NOT NULL,
                "description" text,
                "organizationTypes" text NOT NULL DEFAULT '[]',
                "targetRoles" text NOT NULL DEFAULT '[]',
                "assetIds" text NOT NULL DEFAULT '[]',
                "requiredDependencies" text NOT NULL DEFAULT '[]',
                "salesMetadata" text,
                "buyerPersona" text NOT NULL DEFAULT '[]',
                "decisionMaker" text NOT NULL DEFAULT '[]',
                "stakeholders" text NOT NULL DEFAULT '[]',
                "expectedOutcomes" text NOT NULL DEFAULT '[]',
                "defaultModules" text NOT NULL DEFAULT '[]',
                "pricingTier" character varying(32) NOT NULL DEFAULT 'standard',
                "isPublished" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_19b0b3b7fdc15e1f8509122918f" UNIQUE ("slug"),
                CONSTRAINT "PK_88ab484a201e7a05cca337e5244" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_ai_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "preferredBehavior" character varying(80) NOT NULL DEFAULT 'clinical_copilot',
                "recentPrompts" text,
                "suggestedTools" text,
                "recommendedWorkflows" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_125119c3008a83f2ce38f13162c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3792314057204ff94514308559" ON "user_ai_preferences" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "saved_prompts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "workspaceId" uuid,
                "title" character varying(160) NOT NULL,
                "prompt" text NOT NULL,
                "tags" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4a748354f486c57017d5b31c86e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_4cfb4239c29420d47e44a5be13" ON "saved_prompts" ("userId", "workspaceId")
        `);
    await queryRunner.query(`
            CREATE TABLE "organization_memberships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "role" character varying(32) NOT NULL DEFAULT 'member',
                "roleProfileId" character varying(80),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cd7be805730a4c778a5f45364af" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2dfb6f4b36cdc195e118502ecd" ON "organization_memberships" ("organizationId", "userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" character varying NOT NULL DEFAULT 'general',
                "title" character varying(200) NOT NULL,
                "body" text NOT NULL,
                "data" text,
                "status" character varying NOT NULL DEFAULT 'pending',
                "fcmMessageId" character varying(500),
                "apnsMessageId" character varying(500),
                "errorMessage" text,
                "sentAt" TIMESTAMP,
                "deliveredAt" TIMESTAMP,
                "readAt" TIMESTAMP,
                "expiresAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9cc1d6981330422a3684f9b00f" ON "notifications" ("status", "createdAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_21e65af2f4f242d4c85a92aff4" ON "notifications" ("userId", "createdAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "notification_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "emergencyAlerts" boolean NOT NULL DEFAULT true,
                "medicationReminders" boolean NOT NULL DEFAULT true,
                "appointmentReminders" boolean NOT NULL DEFAULT true,
                "labResults" boolean NOT NULL DEFAULT true,
                "marketingCommunications" boolean NOT NULL DEFAULT false,
                "securityAlerts" boolean NOT NULL DEFAULT true,
                "systemUpdates" boolean NOT NULL DEFAULT true,
                "pushEnabled" boolean NOT NULL DEFAULT true,
                "emailEnabled" boolean NOT NULL DEFAULT true,
                "smsEnabled" boolean NOT NULL DEFAULT false,
                "quietHoursEnabled" boolean NOT NULL DEFAULT false,
                "quietHoursStart" TIME,
                "quietHoursEnd" TIME,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid,
                CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_b70c44e8b00757584a39322559" ON "notification_preferences" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "device_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "token" character varying(500) NOT NULL,
                "platform" character varying NOT NULL DEFAULT 'android',
                "deviceModel" character varying(255),
                "osVersion" character varying(100),
                "appVersion" character varying(100),
                "isActive" boolean NOT NULL DEFAULT true,
                "lastUsedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid,
                CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "short_memory_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "workspaceId" uuid,
                "type" character varying NOT NULL,
                "title" character varying(180) NOT NULL,
                "content" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_938e706787349f05e28e564af60" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_12acbe21c064249292195de3ef" ON "short_memory_entries" ("userId", "workspaceId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8779601a6929943a1ee8409568" ON "short_memory_entries" ("userId", "type", "updatedAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "long_memory_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "workspaceId" uuid,
                "type" character varying NOT NULL,
                "title" character varying(180) NOT NULL,
                "content" text,
                "tags" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1defeddeb0093f926f77909b698" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9ac5164d20cb2e43c340a5b647" ON "long_memory_entries" ("userId", "workspaceId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_a8bb8aa84e8fd1ad3d9016a083" ON "long_memory_entries" ("userId", "type", "updatedAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "clinical_memory_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "workspaceId" uuid,
                "patientId" character varying(96),
                "type" character varying NOT NULL,
                "title" character varying(180) NOT NULL,
                "content" text,
                "source" character varying(80),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_857b6d6d4a22756f6d3ebfef70f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1280cd6be766b62ffda04fdb70" ON "clinical_memory_entries" ("workspaceId", "updatedAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_ff0c8c1698bbdb869234c0e720" ON "clinical_memory_entries" ("userId", "patientId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_55d33d28754bc9751bbe88dec1" ON "clinical_memory_entries" ("userId", "type", "updatedAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "tool_results" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid,
                "toolType" character varying(100) NOT NULL,
                "input" text,
                "output" text,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a38543535180179f28c5d7749ff" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_aff8fc2e7559c769b9936b656b" ON "tool_results" ("toolType", "timestamp")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_20ee9717620f1516e9b0255446" ON "tool_results" ("userId", "timestamp")
        `);
    await queryRunner.query(`
            CREATE TABLE "integration_sources" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" character varying(120),
                "workspaceId" character varying(120),
                "sourceSystem" character varying(160) NOT NULL,
                "family" character varying(64) NOT NULL,
                "vendor" character varying(120),
                "status" character varying(80) NOT NULL DEFAULT 'active',
                "authMode" character varying(80) NOT NULL DEFAULT 'shared-secret-or-token',
                "labels" text NOT NULL DEFAULT '[]',
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_813bb55bd71cb107c5a55e2d228" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_61dbb81c718bd54317b0897c18" ON "integration_sources" (
                "organizationId",
                "workspaceId",
                "sourceSystem",
                "family"
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "integration_event_records" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sourceId" uuid NOT NULL,
                "organizationId" character varying(120),
                "workspaceId" character varying(120),
                "sourceSystem" character varying(160) NOT NULL,
                "family" character varying(64) NOT NULL,
                "eventType" character varying(120) NOT NULL,
                "vendor" character varying(160),
                "idempotencyKey" character varying(220),
                "processingStatus" character varying(80) NOT NULL DEFAULT 'received',
                "rawEvent" text NOT NULL,
                "routeResult" text,
                "normalizedEventId" uuid,
                "error" text,
                "receivedAt" TIMESTAMP NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_29d27d8f7710ffd37d08192e59a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_81ca209952c9959cdfb8d9b030" ON "integration_event_records" ("sourceSystem", "idempotencyKey")
            WHERE "organizationId" IS NULL
                AND "idempotencyKey" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2f5047dcc6b9ed5922dce7a2e6" ON "integration_event_records" (
                "organizationId",
                "sourceSystem",
                "idempotencyKey"
            )
            WHERE "organizationId" IS NOT NULL
                AND "idempotencyKey" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_53efc96062b9bcfec91d846eab" ON "integration_event_records" ("idempotencyKey")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_747904e84f0dacfe7c53c031d1" ON "integration_event_records" ("sourceId", "receivedAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2cb17f19cfd51dddeef2414d09" ON "integration_event_records" ("organizationId", "workspaceId", "receivedAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "normalized_integration_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "rawEventRecordId" uuid NOT NULL,
                "organizationId" character varying(120),
                "workspaceId" character varying(120),
                "kind" character varying(80) NOT NULL,
                "sourceFamily" character varying(64) NOT NULL,
                "sourceEventType" character varying(120) NOT NULL,
                "parserStatus" character varying(80) NOT NULL,
                "severity" character varying(40) NOT NULL,
                "normalizedEvent" text NOT NULL,
                "trigger" text,
                "safeAction" text NOT NULL,
                "labels" text NOT NULL DEFAULT '[]',
                "occurredAt" TIMESTAMP NOT NULL,
                "receivedAt" TIMESTAMP NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0146e260130c6aa0e22812eb103" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_ab42f7f4a6f8407261aafeecb3" ON "normalized_integration_events" ("kind", "severity")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7c42cbab7e1234e7131192cbf5" ON "normalized_integration_events" ("rawEventRecordId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_187f6fd84abec01ccc36a03612" ON "normalized_integration_events" ("organizationId", "workspaceId", "occurredAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "evaluation_runs" (
                "id" character varying(120) NOT NULL,
                "runJson" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_fbeb1f5d29c74ecda426e2e98f5" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "encryption_keys" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "keyVersion" integer NOT NULL,
                "keyMaterial" text NOT NULL,
                "algorithm" character varying(50) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT false,
                "status" character varying(50) NOT NULL DEFAULT 'pending_rotation',
                "rotationReason" character varying(255),
                "scheduledTime" TIMESTAMP,
                "progressPercentage" integer NOT NULL DEFAULT '0',
                "recordsProcessed" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "activatedAt" TIMESTAMP,
                "deletionScheduledAt" TIMESTAMP,
                "auditInfo" text,
                CONSTRAINT "PK_9b11c521c72b15e00ea39f32b6c" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "encryption_keys"."keyMaterial" IS 'Encrypted key material - store in secure vault (AWS KMS, HashiCorp Vault, etc.)';
            COMMENT ON COLUMN "encryption_keys"."status" IS 'pending_rotation | in_progress | re_encryption_complete | active | scheduled_for_deletion';
            COMMENT ON COLUMN "encryption_keys"."auditInfo" IS 'Audit information about the rotation'
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_98231fc7ffe9c88dadfdf23e9a" ON "encryption_keys" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3c34355870d80a117459cfcf7c" ON "encryption_keys" ("isActive")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8cfc2c718a6da172bd5ab2c7f6" ON "encryption_keys" ("keyVersion")
        `);
    await queryRunner.query(`
            CREATE TABLE "workflow_action_logs" (
                "id" character varying(64) NOT NULL,
                "tenantId" character varying(64),
                "patientId" character varying(64),
                "type" character varying(48) NOT NULL,
                "timestamp" character varying(32) NOT NULL,
                "payload" text NOT NULL,
                CONSTRAINT "PK_739fe2f79f55895e3946976c079" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_b6d61c0714db7978d2b6f5e3c6" ON "workflow_action_logs" ("patientId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3bfb73875ab91a79c84b700981" ON "workflow_action_logs" ("tenantId", "timestamp")
        `);
    await queryRunner.query(`
            CREATE TABLE "rooms" (
                "id" character varying(120) NOT NULL,
                "name" character varying(120) NOT NULL,
                "type" character varying(32) NOT NULL,
                "status" character varying(32) NOT NULL,
                "patientId" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "staff" (
                "id" character varying(120) NOT NULL,
                "organizationId" uuid,
                "name" character varying(120) NOT NULL,
                "role" character varying(16) NOT NULL,
                "active" boolean NOT NULL,
                "email" character varying(255),
                "onDuty" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "referrals" (
                "id" character varying(120) NOT NULL,
                "patientId" character varying(120) NOT NULL,
                "requestingStaffId" character varying(120) NOT NULL,
                "targetDepartment" character varying(120) NOT NULL,
                "specialty" character varying(120) NOT NULL,
                "urgency" character varying(32) NOT NULL,
                "reason" text NOT NULL,
                "clinicalSummary" text NOT NULL,
                "status" character varying(32) NOT NULL,
                "workflow" character varying(64) NOT NULL,
                "requestedAt" character varying(64) NOT NULL,
                "statusUpdatedAt" character varying(64),
                "lastActionByStaffId" character varying(120),
                "lastActionByName" character varying(160),
                "responseNote" text,
                "organizationId" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1a3687f43c0a90d68524034085" ON "referrals" ("patientId")
        `);
    await queryRunner.query(`
            CREATE TABLE "patients" (
                "id" character varying(120) NOT NULL,
                "organizationId" character varying(120),
                "mrn" character varying(64) NOT NULL,
                "mrnEncrypted" bytea,
                "firstName" character varying(120) NOT NULL,
                "firstNameEncrypted" bytea,
                "lastName" character varying(120) NOT NULL,
                "lastNameEncrypted" bytea,
                "dob" character varying(32) NOT NULL,
                "dobEncrypted" bytea,
                "age" integer NOT NULL,
                "sex" character varying(16) NOT NULL,
                "arrivalTime" character varying(64) NOT NULL,
                "triageTime" character varying(64),
                "chiefComplaint" text NOT NULL,
                "complaintCategory" character varying(64) NOT NULL,
                "state" character varying(32) NOT NULL,
                "priority" character varying(8) NOT NULL,
                "vitals" text NOT NULL,
                "flags" text NOT NULL,
                "assignedStaffId" character varying(120),
                "roomId" character varying(120),
                "notes" text NOT NULL,
                "timeline" text NOT NULL,
                "triageAssist" text,
                "triageAssistGeneratedAt" character varying(64),
                "arrivalMode" character varying(32),
                "registrationStatus" character varying(32),
                "triagePending" boolean,
                "firstContactAt" character varying(64),
                "queueDestination" character varying(32),
                "arrival" text,
                "quickSafetyFlags" text,
                "highRiskComplaintFlags" text,
                "piiFieldsEncrypted" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fad0a4cb49357a1e79ae0c3774" ON "patients" ("mrn")
            WHERE "organizationId" IS NULL
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_8f448d15cecb4ec861743f7f87" ON "patients" ("organizationId", "mrn")
            WHERE "organizationId" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_976f324a1a35c5b57fbe1539b5" ON "patients" ("organizationId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_46fbdf612936a14d0900ea39a0" ON "patients" ("priority")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8855f26ab70bb3ec18baca5b42" ON "patients" ("state")
        `);
    await queryRunner.query(`
            CREATE TABLE "ed_encounters" (
                "id" character varying(160) NOT NULL,
                "organizationId" character varying(120),
                "patientId" character varying(120) NOT NULL,
                "status" character varying(20) NOT NULL,
                "startedAt" character varying(64) NOT NULL,
                "endedAt" character varying(64),
                "arrivalTime" character varying(64),
                "chiefComplaint" text,
                "complaintCategory" character varying(120),
                "priority" character varying(16),
                "state" character varying(40),
                "arrivalMode" character varying(40),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1a0de31cde5d9cf5d442233c360" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1dbffb9770231c4b9a2b999cda" ON "ed_encounters" ("organizationId", "patientId", "status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7a938a09326432c7edc77b0ab4" ON "ed_encounters" ("organizationId", "patientId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_de410d92a6b46c21ee8f71a401" ON "ed_encounters" ("organizationId")
        `);
    await queryRunner.query(`
            CREATE TABLE "emergency_os_settings" (
                "organizationId" character varying(120) NOT NULL,
                "settingsJson" text NOT NULL,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_245077116784a2b7e600cd27c52" PRIMARY KEY ("organizationId")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "copilot_interactions" (
                "id" character varying(120) NOT NULL,
                "patientId" character varying(120),
                "recordJson" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_39164a46cd3f802e5b4314974af" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9415c746661ea4a810310c13c2" ON "copilot_interactions" ("patientId")
        `);
    await queryRunner.query(`
            CREATE TABLE "ems_arrival_status" (
                "id" character varying(120) NOT NULL,
                "status" character varying(32) NOT NULL,
                "patientId" character varying(120),
                "unitId" character varying(96),
                "unitName" character varying(120),
                "arrivedAt" character varying(64),
                "handoffStartedAt" character varying(64),
                "handoffCompletedAt" character varying(64),
                "source" character varying(48),
                "requestedByStaffId" character varying(96),
                "requestedByName" character varying(160),
                "reason" character varying(2000),
                "urgency" character varying(8),
                "location" character varying(300),
                "handoffAcceptedByStaffId" character varying(96),
                "handoffAcceptedByStaffName" character varying(160),
                "handoffIdentityStatus" character varying(24),
                "handoffVitalsReceived" boolean,
                "handoffMedicationsEnRoute" text,
                "handoffCriticalFlags" text,
                "handoffPatientDestination" character varying(24),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_59165a8e321f524063a3281b520" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1e7ff4c44b3332d3cf74fb3a84" ON "ems_arrival_status" ("patientId")
        `);
    await queryRunner.query(`
            CREATE TABLE "clinical_calculator_results" (
                "id" character varying(120) NOT NULL,
                "patientId" character varying(120),
                "recordJson" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_515c7d0c838026053a8a969aa8f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_44070d76268b04582f98303dce" ON "clinical_calculator_results" ("patientId")
        `);
    await queryRunner.query(`
            CREATE TABLE "alerts" (
                "id" character varying(120) NOT NULL,
                "organizationId" character varying(120),
                "severity" character varying(16) NOT NULL,
                "title" character varying(200) NOT NULL,
                "message" text NOT NULL,
                "patientId" character varying(120),
                "dispatchedAt" character varying(64) NOT NULL,
                "dismissed" boolean NOT NULL DEFAULT false,
                "ownerRole" character varying(32),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5259a93699bf6b47307fbb2f04" ON "alerts" ("organizationId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_bd648736e769433d7b17710014" ON "alerts" ("patientId")
        `);
    await queryRunner.query(`
            CREATE TABLE "administrative_automation_tasks" (
                "id" character varying(120) NOT NULL,
                "organizationId" character varying(120) NOT NULL,
                "workspaceId" character varying(120) NOT NULL,
                "category" character varying(64) NOT NULL,
                "status" character varying(32) NOT NULL DEFAULT 'pending_review',
                "priority" character varying(32) NOT NULL DEFAULT 'medium',
                "patientId" character varying(120),
                "task" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d78c865c82841ffa70741a7863f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_bbeff697c41902fd85b5a61b1e" ON "administrative_automation_tasks" ("organizationId", "workspaceId", "updatedAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e53e2661341db559a297c163e5" ON "administrative_automation_tasks" ("organizationId", "workspaceId", "status")
        `);
    await queryRunner.query(`
            CREATE TABLE "collaboration_message_reactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "messageId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "emoji" character varying(16) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8aed83b998e4f1e0a3cc3e8d097" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d963901ed96be9aa8972a56629" ON "collaboration_message_reactions" ("messageId", "userId", "emoji")
        `);
    await queryRunner.query(`
            CREATE TABLE "collaboration_messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "channelId" uuid NOT NULL,
                "threadRootId" uuid,
                "senderId" uuid,
                "senderType" character varying NOT NULL DEFAULT 'user',
                "body" text NOT NULL,
                "mentionedUserIds" text,
                "pinnedAt" TIMESTAMP,
                "pinnedByUserId" uuid,
                "sourceType" character varying,
                "sourceId" character varying(96),
                "editedAt" TIMESTAMP,
                "deletedAt" TIMESTAMP,
                "deletedByUserId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1c6746955a53e257fd0bdb687f1" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_72139295a1f75ea7b9d8a20e21" ON "collaboration_messages" ("threadRootId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3337d336b4311d3e5f5e31e01a" ON "collaboration_messages" ("channelId", "createdAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "collaboration_channels" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" character varying(64) NOT NULL,
                "workspaceId" uuid,
                "type" character varying NOT NULL,
                "name" character varying(160) NOT NULL,
                "description" text,
                "departmentKey" character varying(64),
                "patientId" character varying(96),
                "status" character varying NOT NULL DEFAULT 'active',
                "isSystemManaged" boolean NOT NULL DEFAULT false,
                "incidentSeverity" character varying(40),
                "incidentTriggerType" character varying(80),
                "incidentSourceId" character varying(96),
                "createdByUserId" uuid,
                "retentionPolicyDays" integer,
                "archivedAt" TIMESTAMP,
                "resolvedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7e4d3d042682c8b7562a2068e53" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_0a9ab03f864312544f94b5b208" ON "collaboration_channels" ("patientId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_f69a62cd7ec26fabc8493f3f3e" ON "collaboration_channels" ("organizationId", "departmentKey")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2af638ad5fb64ae13327fa2c41" ON "collaboration_channels" ("organizationId", "type")
        `);
    await queryRunner.query(`
            CREATE TABLE "collaboration_channel_memberships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "channelId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "role" character varying NOT NULL DEFAULT 'member',
                "status" character varying NOT NULL DEFAULT 'active',
                "notificationPreference" character varying NOT NULL DEFAULT 'all',
                "lastReadMessageId" uuid,
                "lastReadAt" TIMESTAMP,
                "joinedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_fab99bf50c92bd7fc5e50f31a76" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d2bfa9c358abe47c8159f6880e" ON "collaboration_channel_memberships" ("userId", "status")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a87d01b8ac400e9efa932bfaed" ON "collaboration_channel_memberships" ("channelId", "userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "collaboration_external_links" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "channelId" uuid NOT NULL,
                "provider" character varying NOT NULL,
                "externalChannelId" character varying(255),
                "config" text,
                "enabled" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bb430a740eddbfdeb29fc4bb640" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1ca6126d9e4c1867cf97c7c787" ON "collaboration_external_links" ("channelId", "provider")
        `);
    await queryRunner.query(`
            CREATE TABLE "collaboration_attachments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "messageId" uuid NOT NULL,
                "fileName" character varying(255) NOT NULL,
                "mimeType" character varying(120) NOT NULL,
                "kind" character varying NOT NULL DEFAULT 'file',
                "sizeBytes" integer NOT NULL,
                "storageProvider" character varying(40) NOT NULL DEFAULT 'local',
                "storageKey" character varying(500) NOT NULL,
                "url" character varying(1000),
                "uploadedByUserId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_adc72dfde32f5db5878a734fa3e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_98b32eed975063d5524763d772" ON "collaboration_attachments" ("messageId")
        `);
    await queryRunner.query(`
            CREATE TABLE "protocols" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "category" character varying(100) NOT NULL,
                "description" text NOT NULL,
                "steps" text NOT NULL,
                "priority" character varying(50),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_69900eec42c88582ac8affff3e1" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_47766cc4b5858da849e3166d96" ON "protocols" ("category")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_fc511e940657b6d4d7e792f5c1" ON "protocols" ("name")
        `);
    await queryRunner.query(`
            CREATE TABLE "drugs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "genericName" character varying(255) NOT NULL,
                "category" character varying(100) NOT NULL,
                "dosage" text NOT NULL,
                "indications" text NOT NULL,
                "contraindications" text,
                "sideEffects" text,
                "interactions" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a3788abdeb2ec977862b17351ad" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1e89bf5a37fb5b01a0476b620f" ON "drugs" ("category")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_68ee1c951216ab60f778d0dbed" ON "drugs" ("name")
        `);
    await queryRunner.query(`
            CREATE TABLE "cig_snapshots" (
                "tenant_id" character varying(120) NOT NULL,
                "version" bigint NOT NULL,
                "generated_at" TIMESTAMP NOT NULL,
                "node_count" integer NOT NULL,
                "edge_count" integer NOT NULL,
                "projector_generation" character varying(64),
                "durability" character varying(16) NOT NULL DEFAULT 'session',
                "redis_key" character varying(320),
                CONSTRAINT "PK_5a3001930050d55f01841948cf0" PRIMARY KEY ("tenant_id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "cig_outbox" (
                "id" SERIAL NOT NULL,
                "tenant_id" character varying(120) NOT NULL,
                "event_id" character varying(120) NOT NULL,
                "payload_json" text NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "processed_at" TIMESTAMP,
                CONSTRAINT "PK_e91aed1ea9f9e06cf5643f5ee21" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_outbox_unprocessed" ON "cig_outbox" ("created_at")
            WHERE processed_at IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_outbox_tenant_created" ON "cig_outbox" ("tenant_id", "created_at")
        `);
    await queryRunner.query(`
            CREATE TABLE "cig_nodes" (
                "id" character varying(320) NOT NULL,
                "tenant_id" character varying(120) NOT NULL,
                "organization_id" character varying(120),
                "workspace_id" character varying(120),
                "entity_type" character varying(64) NOT NULL,
                "source_id" character varying(160) NOT NULL,
                "source_module" character varying(120) NOT NULL,
                "label" character varying(500) NOT NULL,
                "summary" text,
                "route" character varying(500),
                "severity" character varying(32),
                "state_json" text NOT NULL,
                "metadata_json" text NOT NULL,
                "phi_class" character varying(16) NOT NULL,
                "durability" character varying(16) NOT NULL,
                "source_updated_at" TIMESTAMP NOT NULL,
                "version" integer NOT NULL,
                "projector_generation" character varying(64) NOT NULL DEFAULT '0',
                "content_hash" character varying(64),
                "last_graph_version" bigint,
                "archived_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "audit_cursor" character varying(120),
                CONSTRAINT "PK_d792e48a3e1421f0733fe907c61" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_cig_nodes_tenant_entity_source" ON "cig_nodes" ("tenant_id", "entity_type", "source_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_nodes_tenant_active" ON "cig_nodes" ("tenant_id")
            WHERE archived_at IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_nodes_tenant_phi" ON "cig_nodes" ("tenant_id", "phi_class")
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_nodes_tenant_updated" ON "cig_nodes" ("tenant_id", "updated_at")
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_nodes_tenant_type" ON "cig_nodes" ("tenant_id", "entity_type")
        `);
    await queryRunner.query(`
            CREATE TABLE "cig_events" (
                "event_id" character varying(120) NOT NULL,
                "tenant_id" character varying(120) NOT NULL,
                "name" character varying(120) NOT NULL,
                "version" integer NOT NULL,
                "occurred_at" TIMESTAMP NOT NULL,
                "received_at" TIMESTAMP,
                "producer" character varying(160) NOT NULL,
                "durability" character varying(16) NOT NULL,
                "pii_class" character varying(16) NOT NULL,
                "payload_json" text NOT NULL,
                "correlation_id" character varying(120),
                "causation_id" character varying(120),
                "organization_id" character varying(120),
                "workspace_id" character varying(120),
                CONSTRAINT "PK_bac9d14825a313225832259f283" PRIMARY KEY ("event_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_events_tenant_name" ON "cig_events" ("tenant_id", "name")
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_events_tenant_occurred" ON "cig_events" ("tenant_id", "occurred_at")
        `);
    await queryRunner.query(`
            CREATE TABLE "cig_edges" (
                "id" character varying(640) NOT NULL,
                "tenant_id" character varying(120) NOT NULL,
                "type" character varying(64) NOT NULL,
                "from_id" character varying(320) NOT NULL,
                "to_id" character varying(320) NOT NULL,
                "label" character varying(500),
                "weight" double precision,
                "confidence" double precision,
                "valid_from" TIMESTAMP NOT NULL,
                "valid_to" TIMESTAMP,
                "source_module" character varying(120) NOT NULL,
                "evidence_json" text,
                "durability" character varying(16) NOT NULL,
                "metadata_json" text,
                CONSTRAINT "PK_4f3331a5ff3372c1b428729e099" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_edges_type_current" ON "cig_edges" ("tenant_id", "type")
            WHERE valid_to IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_edges_to_current" ON "cig_edges" ("tenant_id", "to_id")
            WHERE valid_to IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_edges_from_current" ON "cig_edges" ("tenant_id", "from_id")
            WHERE valid_to IS NULL
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "cig_edges_current_uniq" ON "cig_edges" ("tenant_id", "type", "from_id", "to_id")
            WHERE valid_to IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_edges_tenant_type" ON "cig_edges" ("tenant_id", "type")
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_edges_tenant_to" ON "cig_edges" ("tenant_id", "to_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "cig_edges_tenant_from" ON "cig_edges" ("tenant_id", "from_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "care_tasks" (
                "id" character varying(120) NOT NULL,
                "organizationId" character varying(120) NOT NULL,
                "taskType" character varying(40) NOT NULL,
                "status" character varying(20) NOT NULL,
                "priority" character varying(16) NOT NULL,
                "ownerRole" character varying(60),
                "ownerUserId" character varying(120),
                "patientId" character varying(120),
                "encounterId" character varying(120),
                "reason" text NOT NULL,
                "sourceEvent" character varying(80) NOT NULL,
                "dedupeKey" character varying(160) NOT NULL,
                "deepLink" character varying(300),
                "dueAt" character varying(64),
                "acknowledgedAt" character varying(64),
                "acknowledgedBy" character varying(120),
                "completedAt" character varying(64),
                "completedBy" character varying(120),
                "cancelledAt" character varying(64),
                "cancelledBy" character varying(120),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7e112d3ff20185f325a848d4e72" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_552e32b683e0ae1d0078f1b762" ON "care_tasks" ("organizationId", "dedupeKey")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_ef4de54d29005e6b064225d1c6" ON "care_tasks" ("organizationId", "status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8534c23252b82b85d7e1196441" ON "care_tasks" ("organizationId")
        `);
    await queryRunner.query(`
            CREATE TABLE "automation_audit_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "triggerFired" character varying(255) NOT NULL,
                "conditionsEvaluated" text NOT NULL,
                "actionSelected" character varying(255) NOT NULL,
                "userId" character varying(120) NOT NULL,
                "userName" character varying(200) NOT NULL,
                "tenantId" character varying(120) NOT NULL,
                "tenantName" character varying(200) NOT NULL,
                "workspaceId" character varying(120) NOT NULL,
                "workspaceName" character varying(200) NOT NULL,
                "aiInvolved" boolean NOT NULL DEFAULT false,
                "aiSummary" text,
                "toolCalled" character varying(160) NOT NULL,
                "backendEndpoint" character varying(255) NOT NULL,
                "status" character varying NOT NULL,
                "reason" text,
                "error" text,
                "timestamp" TIMESTAMP NOT NULL,
                "reviewerRequired" boolean NOT NULL DEFAULT false,
                "reviewerName" character varying(200),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1d325e378cc18aa806c798b29b2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c0c4281542746d3742de2f965e" ON "automation_audit_events" ("status", "timestamp")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_87153043d26ea38ba9510439d9" ON "automation_audit_events" ("tenantId", "timestamp")
        `);
    await queryRunner.query(`
            CREATE TABLE "biometric_configs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "isEnabled" boolean NOT NULL DEFAULT false,
                "biometricType" character varying,
                "deviceId" character varying(500),
                "deviceName" character varying(255),
                "challengeToken" character varying(500),
                "lastUsedAt" TIMESTAMP,
                "usageCount" integer NOT NULL DEFAULT '0',
                "failedAttempts" integer NOT NULL DEFAULT '0',
                "lockedUntil" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_b614e06a6c0828edb36145b8e0b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c22fcdfef88940cc8db57a82be" ON "biometric_configs" ("userId")
        `);
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "token" text NOT NULL,
                "user_id" uuid NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "revoked" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_19847b88d090c565c216842ac0" ON "refresh_tokens" ("user_id", "expires_at")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token")
        `);
    await queryRunner.query(`
            CREATE TABLE "artifacts" (
                "id" character varying(96) NOT NULL,
                "type" character varying(40) NOT NULL,
                "title" character varying(180) NOT NULL,
                "description" text NOT NULL,
                "tags" text,
                "relationships" text,
                "version" character varying(32) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6516bbed3c129918e05c5012edb" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_6235c6630b7a90aee51b3ca279" ON "artifacts" ("version")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_37e60dbaec20da2fe8dd446396" ON "artifacts" ("type")
        `);
    await queryRunner.query(`
            CREATE TABLE "artifact_versions" (
                "id" character varying(96) NOT NULL,
                "artifactId" character varying(96) NOT NULL,
                "type" character varying(40) NOT NULL,
                "title" character varying(180) NOT NULL,
                "description" text NOT NULL,
                "tags" text,
                "relationships" text,
                "version" character varying(32) NOT NULL,
                "changeSummary" character varying(180),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_62eb900d5d5094f96e73ca41884" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3e5638eb37683503879bba8655" ON "artifact_versions" ("artifactId", "version")
        `);
    await queryRunner.query(`
            CREATE TABLE "analytics_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "event" character varying NOT NULL,
                "userId" character varying,
                "organizationId" character varying,
                "workspaceId" character varying,
                "sessionId" character varying NOT NULL,
                "properties" text,
                "platform" character varying,
                "userAgent" character varying,
                "screenResolution" character varying,
                "referrer" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_42589da045825b9fba75e0c51c" ON "analytics_events" ("sessionId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_17e272bfd55320a3f48a6383ff" ON "analytics_events" ("event", "createdAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_89639a7cf8b3cd156a5d3b9a30" ON "analytics_events" ("userId", "createdAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_38567b7e44db8bcd3bbae43398" ON "analytics_events" ("organizationId", "createdAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "ai_feedback" (
                "id" character varying(120) NOT NULL,
                "runId" character varying(120) NOT NULL,
                "capabilityId" character varying(80),
                "userId" character varying(120) NOT NULL,
                "organizationId" character varying(120),
                "rating" character varying(20) NOT NULL,
                "comment" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_aa34b6654c98bf014129c13c1b0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e216fd08772168a7a36ea3f1d8" ON "ai_feedback" ("organizationId", "createdAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_ab925e24419e1ae58d3ed5d131" ON "ai_feedback" ("runId")
        `);
    await queryRunner.query(`
            CREATE TABLE "ai_queries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "prompt" text NOT NULL,
                "response" text,
                "status" character varying NOT NULL DEFAULT 'success',
                "model" character varying(100) NOT NULL,
                "promptTokens" integer NOT NULL DEFAULT '0',
                "completionTokens" integer NOT NULL DEFAULT '0',
                "totalTokens" integer NOT NULL DEFAULT '0',
                "cost" numeric(10, 6) NOT NULL DEFAULT '0',
                "latencyMs" integer,
                "conversationId" character varying(100),
                "feature" character varying(50),
                "organizationId" uuid,
                "workspaceId" uuid,
                "assetId" character varying(100),
                "agentId" character varying(100),
                "modelClass" character varying(50),
                "modelVersion" character varying(100),
                "routingExpert" character varying(100),
                "retrievalPolicy" character varying(50),
                "requiresHumanReview" boolean NOT NULL DEFAULT false,
                "estimatedCost" numeric(10, 6),
                "intentClassified" character varying(50),
                "toolUsed" character varying(50),
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c9e2473e6b18d6c48f8e6126d4c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_a6f9a3e58c18b1c5b3de5b42bd" ON "ai_queries" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3da65969a7452a6391fab561bf" ON "ai_queries" ("createdAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7689160323d9de082514da9681" ON "ai_queries" ("userId", "createdAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "ai_action_proposal_audit_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "proposalId" character varying(36) NOT NULL,
                "sequenceIndex" integer NOT NULL,
                "fromState" character varying(20),
                "toState" character varying(20) NOT NULL,
                "actorUserId" character varying(64),
                "occurredAt" character varying(32) NOT NULL,
                "metadataJson" text,
                "previousHash" character varying(64),
                "entryHash" character varying(64) NOT NULL,
                CONSTRAINT "PK_8cd40e5a6dced15af8ca13823f9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d8f39d23179f5a95c7da7c1842" ON "ai_action_proposal_audit_entries" ("proposalId", "sequenceIndex")
        `);
    await queryRunner.query(`
            CREATE TABLE "ai_action_proposals" (
                "proposalId" character varying(36) NOT NULL,
                "organizationId" character varying(36),
                "state" character varying(20) NOT NULL,
                "updatedAt" character varying(32) NOT NULL,
                "payload" text NOT NULL,
                CONSTRAINT "PK_f129766ee403a7c65a95531e8f8" PRIMARY KEY ("proposalId")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9f0f35d527982a513cc630d6c4" ON "ai_action_proposals" ("updatedAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_6a1b3aebf2fc02835c8be19ee5" ON "ai_action_proposals" ("organizationId", "state")
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_memberships"
            ADD CONSTRAINT "FK_75e5adf447e36b703e22f3cea9e" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_memberships"
            ADD CONSTRAINT "FK_1fdcbaf8c3472d03fb615eb0893" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspaces"
            ADD CONSTRAINT "FK_8f75913774150a5d5dde56513b1" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_profiles"
            ADD CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_accounts"
            ADD CONSTRAINT "FK_4c22f13249ce02f89dc6d226e9c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "two_factor_auth"
            ADD CONSTRAINT "FK_ceebe2fe995d01aeff8cb013f53" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "subscriptions"
            ADD CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "audit_logs"
            ADD CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "notification_preferences"
            ADD CONSTRAINT "FK_b70c44e8b00757584a393225593" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "device_tokens"
            ADD CONSTRAINT "FK_511957e3e8443429dc3fb00120c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "collaboration_messages"
            ADD CONSTRAINT "FK_c20d215b44c79d64a1913b667cb" FOREIGN KEY ("channelId") REFERENCES "collaboration_channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "collaboration_channel_memberships"
            ADD CONSTRAINT "FK_b1a7dec6076d8b2b021cd4a4a40" FOREIGN KEY ("channelId") REFERENCES "collaboration_channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "collaboration_channel_memberships"
            ADD CONSTRAINT "FK_977b63e0120a54d1110a5af1392" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "biometric_configs"
            ADD CONSTRAINT "FK_c22fcdfef88940cc8db57a82be7" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "ai_queries"
            ADD CONSTRAINT "FK_6204be0fb7f67ae4bba8761c05b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "ai_queries" DROP CONSTRAINT "FK_6204be0fb7f67ae4bba8761c05b"
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"
        `);
    await queryRunner.query(`
            ALTER TABLE "biometric_configs" DROP CONSTRAINT "FK_c22fcdfef88940cc8db57a82be7"
        `);
    await queryRunner.query(`
            ALTER TABLE "collaboration_channel_memberships" DROP CONSTRAINT "FK_977b63e0120a54d1110a5af1392"
        `);
    await queryRunner.query(`
            ALTER TABLE "collaboration_channel_memberships" DROP CONSTRAINT "FK_b1a7dec6076d8b2b021cd4a4a40"
        `);
    await queryRunner.query(`
            ALTER TABLE "collaboration_messages" DROP CONSTRAINT "FK_c20d215b44c79d64a1913b667cb"
        `);
    await queryRunner.query(`
            ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_511957e3e8443429dc3fb00120c"
        `);
    await queryRunner.query(`
            ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_b70c44e8b00757584a393225593"
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"
        `);
    await queryRunner.query(`
            ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab"
        `);
    await queryRunner.query(`
            ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84"
        `);
    await queryRunner.query(`
            ALTER TABLE "two_factor_auth" DROP CONSTRAINT "FK_ceebe2fe995d01aeff8cb013f53"
        `);
    await queryRunner.query(`
            ALTER TABLE "oauth_accounts" DROP CONSTRAINT "FK_4c22f13249ce02f89dc6d226e9c"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspaces" DROP CONSTRAINT "FK_8f75913774150a5d5dde56513b1"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_memberships" DROP CONSTRAINT "FK_1fdcbaf8c3472d03fb615eb0893"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_memberships" DROP CONSTRAINT "FK_75e5adf447e36b703e22f3cea9e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_6a1b3aebf2fc02835c8be19ee5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9f0f35d527982a513cc630d6c4"
        `);
    await queryRunner.query(`
            DROP TABLE "ai_action_proposals"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d8f39d23179f5a95c7da7c1842"
        `);
    await queryRunner.query(`
            DROP TABLE "ai_action_proposal_audit_entries"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7689160323d9de082514da9681"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3da65969a7452a6391fab561bf"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a6f9a3e58c18b1c5b3de5b42bd"
        `);
    await queryRunner.query(`
            DROP TABLE "ai_queries"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ab925e24419e1ae58d3ed5d131"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e216fd08772168a7a36ea3f1d8"
        `);
    await queryRunner.query(`
            DROP TABLE "ai_feedback"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_38567b7e44db8bcd3bbae43398"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_89639a7cf8b3cd156a5d3b9a30"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_17e272bfd55320a3f48a6383ff"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_42589da045825b9fba75e0c51c"
        `);
    await queryRunner.query(`
            DROP TABLE "analytics_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3e5638eb37683503879bba8655"
        `);
    await queryRunner.query(`
            DROP TABLE "artifact_versions"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_37e60dbaec20da2fe8dd446396"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_6235c6630b7a90aee51b3ca279"
        `);
    await queryRunner.query(`
            DROP TABLE "artifacts"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4542dd2f38a61354a040ba9fd5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_19847b88d090c565c216842ac0"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c22fcdfef88940cc8db57a82be"
        `);
    await queryRunner.query(`
            DROP TABLE "biometric_configs"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_87153043d26ea38ba9510439d9"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c0c4281542746d3742de2f965e"
        `);
    await queryRunner.query(`
            DROP TABLE "automation_audit_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8534c23252b82b85d7e1196441"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ef4de54d29005e6b064225d1c6"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_552e32b683e0ae1d0078f1b762"
        `);
    await queryRunner.query(`
            DROP TABLE "care_tasks"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_tenant_from"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_tenant_to"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_tenant_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_current_uniq"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_from_current"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_to_current"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_edges_type_current"
        `);
    await queryRunner.query(`
            DROP TABLE "cig_edges"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_events_tenant_occurred"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_events_tenant_name"
        `);
    await queryRunner.query(`
            DROP TABLE "cig_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_nodes_tenant_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_nodes_tenant_updated"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_nodes_tenant_phi"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_nodes_tenant_active"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."UQ_cig_nodes_tenant_entity_source"
        `);
    await queryRunner.query(`
            DROP TABLE "cig_nodes"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_outbox_tenant_created"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."cig_outbox_unprocessed"
        `);
    await queryRunner.query(`
            DROP TABLE "cig_outbox"
        `);
    await queryRunner.query(`
            DROP TABLE "cig_snapshots"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_68ee1c951216ab60f778d0dbed"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1e89bf5a37fb5b01a0476b620f"
        `);
    await queryRunner.query(`
            DROP TABLE "drugs"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fc511e940657b6d4d7e792f5c1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_47766cc4b5858da849e3166d96"
        `);
    await queryRunner.query(`
            DROP TABLE "protocols"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_98b32eed975063d5524763d772"
        `);
    await queryRunner.query(`
            DROP TABLE "collaboration_attachments"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1ca6126d9e4c1867cf97c7c787"
        `);
    await queryRunner.query(`
            DROP TABLE "collaboration_external_links"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a87d01b8ac400e9efa932bfaed"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d2bfa9c358abe47c8159f6880e"
        `);
    await queryRunner.query(`
            DROP TABLE "collaboration_channel_memberships"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2af638ad5fb64ae13327fa2c41"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_f69a62cd7ec26fabc8493f3f3e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_0a9ab03f864312544f94b5b208"
        `);
    await queryRunner.query(`
            DROP TABLE "collaboration_channels"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3337d336b4311d3e5f5e31e01a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_72139295a1f75ea7b9d8a20e21"
        `);
    await queryRunner.query(`
            DROP TABLE "collaboration_messages"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d963901ed96be9aa8972a56629"
        `);
    await queryRunner.query(`
            DROP TABLE "collaboration_message_reactions"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e53e2661341db559a297c163e5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_bbeff697c41902fd85b5a61b1e"
        `);
    await queryRunner.query(`
            DROP TABLE "administrative_automation_tasks"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_bd648736e769433d7b17710014"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5259a93699bf6b47307fbb2f04"
        `);
    await queryRunner.query(`
            DROP TABLE "alerts"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_44070d76268b04582f98303dce"
        `);
    await queryRunner.query(`
            DROP TABLE "clinical_calculator_results"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1e7ff4c44b3332d3cf74fb3a84"
        `);
    await queryRunner.query(`
            DROP TABLE "ems_arrival_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9415c746661ea4a810310c13c2"
        `);
    await queryRunner.query(`
            DROP TABLE "copilot_interactions"
        `);
    await queryRunner.query(`
            DROP TABLE "emergency_os_settings"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_de410d92a6b46c21ee8f71a401"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7a938a09326432c7edc77b0ab4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1dbffb9770231c4b9a2b999cda"
        `);
    await queryRunner.query(`
            DROP TABLE "ed_encounters"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8855f26ab70bb3ec18baca5b42"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_46fbdf612936a14d0900ea39a0"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_976f324a1a35c5b57fbe1539b5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8f448d15cecb4ec861743f7f87"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fad0a4cb49357a1e79ae0c3774"
        `);
    await queryRunner.query(`
            DROP TABLE "patients"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1a3687f43c0a90d68524034085"
        `);
    await queryRunner.query(`
            DROP TABLE "referrals"
        `);
    await queryRunner.query(`
            DROP TABLE "staff"
        `);
    await queryRunner.query(`
            DROP TABLE "rooms"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3bfb73875ab91a79c84b700981"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b6d61c0714db7978d2b6f5e3c6"
        `);
    await queryRunner.query(`
            DROP TABLE "workflow_action_logs"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8cfc2c718a6da172bd5ab2c7f6"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3c34355870d80a117459cfcf7c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_98231fc7ffe9c88dadfdf23e9a"
        `);
    await queryRunner.query(`
            DROP TABLE "encryption_keys"
        `);
    await queryRunner.query(`
            DROP TABLE "evaluation_runs"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_187f6fd84abec01ccc36a03612"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7c42cbab7e1234e7131192cbf5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ab42f7f4a6f8407261aafeecb3"
        `);
    await queryRunner.query(`
            DROP TABLE "normalized_integration_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2cb17f19cfd51dddeef2414d09"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_747904e84f0dacfe7c53c031d1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_53efc96062b9bcfec91d846eab"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2f5047dcc6b9ed5922dce7a2e6"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_81ca209952c9959cdfb8d9b030"
        `);
    await queryRunner.query(`
            DROP TABLE "integration_event_records"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_61dbb81c718bd54317b0897c18"
        `);
    await queryRunner.query(`
            DROP TABLE "integration_sources"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_20ee9717620f1516e9b0255446"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_aff8fc2e7559c769b9936b656b"
        `);
    await queryRunner.query(`
            DROP TABLE "tool_results"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_55d33d28754bc9751bbe88dec1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ff0c8c1698bbdb869234c0e720"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1280cd6be766b62ffda04fdb70"
        `);
    await queryRunner.query(`
            DROP TABLE "clinical_memory_entries"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a8bb8aa84e8fd1ad3d9016a083"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9ac5164d20cb2e43c340a5b647"
        `);
    await queryRunner.query(`
            DROP TABLE "long_memory_entries"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8779601a6929943a1ee8409568"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_12acbe21c064249292195de3ef"
        `);
    await queryRunner.query(`
            DROP TABLE "short_memory_entries"
        `);
    await queryRunner.query(`
            DROP TABLE "device_tokens"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b70c44e8b00757584a39322559"
        `);
    await queryRunner.query(`
            DROP TABLE "notification_preferences"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_21e65af2f4f242d4c85a92aff4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9cc1d6981330422a3684f9b00f"
        `);
    await queryRunner.query(`
            DROP TABLE "notifications"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2dfb6f4b36cdc195e118502ecd"
        `);
    await queryRunner.query(`
            DROP TABLE "organization_memberships"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4cfb4239c29420d47e44a5be13"
        `);
    await queryRunner.query(`
            DROP TABLE "saved_prompts"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3792314057204ff94514308559"
        `);
    await queryRunner.query(`
            DROP TABLE "user_ai_preferences"
        `);
    await queryRunner.query(`
            DROP TABLE "asset_packs"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c8e0ec979c44b9f702dce44cc7"
        `);
    await queryRunner.query(`
            DROP TABLE "organization_entitlements"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8abd41229da6f0b0a7f63d49a7"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a577d100399ed45ed591c59761"
        `);
    await queryRunner.query(`
            DROP TABLE "platform_assets"
        `);
    await queryRunner.query(`
            DROP TABLE "role_profiles"
        `);
    await queryRunner.query(`
            DROP TABLE "care_pathways"
        `);
    await queryRunner.query(`
            DROP TABLE "commercial_plans"
        `);
    await queryRunner.query(`
            DROP TABLE "integration_offerings"
        `);
    await queryRunner.query(`
            DROP TABLE "products"
        `);
    await queryRunner.query(`
            DROP TABLE "specialty_catalog"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_30c03721f4b5313759d15f2906"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_ai_recommendations"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_684d1c38ac7dd1f94a4f4e0706"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_0875b5f1ad6ac1443ac9512b9d"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e10d660dad2d66214f545131c1"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_alarms"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_996aa6af32c7ae14c5b67ac149"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_alarm_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c1819da4e7775e08afcefc5a21"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_14ac7f7a313b8675c5aefbc125"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_ems_episodes"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_0065829aa9b0a16b20718047d1"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_eta_snapshots"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_866c73a129b7372a6a2d13c160"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_geofence_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_64769d3af20a06eeb84c051049"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_geofences"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c22780937bfc9a237939af02c4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2e664413bde9c6b6b1ad753b7d"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_86c2099c59b4731907ad4a9e4c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_108027c09dfc1e0d5efb764e2a"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_inbound_patients"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_integration_cursors"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_6ae638400abae7dbee1f2b90e8"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_outbox"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9c69885b3f17358df1e5bde9e3"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d80de9982455c22102c621154d"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_positions"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_43a725bf403559e0999bac4b5e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fc30ec8968f42154a2f734aad2"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d998eb5bf1a0249b6e96d18d28"
        `);
    await queryRunner.query(`
            DROP TABLE "sentinel_units"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7605cbbb6cfa6355939917387b"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3c19e19139bef895b382e3e663"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_003cebcec87546489d717cb938"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_96c330b231b42af211905c2757"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8675ed0ba5adafd015cd5f77ed"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_85308d1f9672093da83d9f55e5"
        `);
    await queryRunner.query(`
            DROP TABLE "usage_events"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fd22b272d0ac47a0d3d970acad"
        `);
    await queryRunner.query(`
            DROP TABLE "surface_views"
        `);
    await queryRunner.query(`
            DROP TABLE "training_runs"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_aa8efbc38c6e6a1b838c7f3c52"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_307aad0bb31b42cc9ac67f6aaf"
        `);
    await queryRunner.query(`
            DROP TABLE "user_activities"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_39f14701fcd89b15361c21cc6d"
        `);
    await queryRunner.query(`
            DROP TABLE "professional_profiles"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b6202d1cacc63a0b9c8dac2abd"
        `);
    await queryRunner.query(`
            DROP TABLE "user_preferences"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_65bf0f1c91acea1b3dcf5b98f1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_402d0beaced1d723bb74f9ccb4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_67c4ff6334797c722a15eec21f"
        `);
    await queryRunner.query(`
            DROP TABLE "audit_logs"
        `);
    await queryRunner.query(`
            DROP TABLE "subscriptions"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ceebe2fe995d01aeff8cb013f5"
        `);
    await queryRunner.query(`
            DROP TABLE "two_factor_auth"
        `);
    await queryRunner.query(`
            DROP TABLE "oauth_accounts"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8481388d6325e752cd4d7e26c6"
        `);
    await queryRunner.query(`
            DROP TABLE "user_profiles"
        `);
    await queryRunner.query(`
            DROP TABLE "organizations"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5d4603199aec9dca2cdc2f9e53"
        `);
    await queryRunner.query(`
            DROP TABLE "user_workspace_states"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_31e95fb27ca3ed76cd476565aa"
        `);
    await queryRunner.query(`
            DROP TABLE "workspaces"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_32eb7bea0dcef6763235d7b594"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace_invitations"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_822143ae1e972a993a781efbd8"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_45f60c90c7a7cb6cdb1d2ad3c0"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace_memberships"
        `);
  }
}
