# Data Model Reference

> Exhaustive entity/model inventory. For the earlier conceptual model (canonical identity fields — organizationId, networkId, hospitalSiteId, departmentId, unitId, careTeamIds...), see [`docs/specs/data-model-spec.md`](../specs/data-model-spec.md) — that document explains *why* the identity model is shaped the way it is; this document lists *what actually exists* in the two persistence layers.

## Two persistence layers

CareDroid deliberately keeps two data stores, for two different domains:

| | Relational (TypeORM) | Document (Mongoose) |
|---|---|---|
| Engine | PostgreSQL (prod) / SQLite (dev), via `backend/src/data-source.ts` | MongoDB |
| Domain | Platform: identity, billing, audit, governance, AI usage, workspaces | Clinical: the live `UnifiedPatient` record and intake pipeline |
| Always on? | Yes | **No** — gated by `ENABLE_MONGOOSE_EMERGENCY_OS` (default `false` in `docker-compose.app.yml`) |
| Migrations | `backend/src/database/migrations/*.ts` (TypeORM) | `backend/migrations/*.js` (legacy, pre-TypeORM) |

Env: `DATABASE_CLIENT=sqlite|postgres`, `SQLITE_PATH`, `MONGODB_URI`/`DATABASE_MONGO_URI`. See [Configuration Reference](../configuration-reference.md#database).

---

## Relational entities (TypeORM), by module

`users` is the hub entity most others hang off of.

| Table | Entity | File (relative to `backend/src/`) | Key relations |
|---|---|---|---|
| `users` | `User` | `modules/users/entities/user.entity.ts` | ↔ `UserProfile` (1:1), ↔ `OAuthAccount` (1:N), ↔ `TwoFactor` (1:1), ↔ `Subscription` (1:1), ↔ `AuditLog` (1:N) |
| `user_profiles` | `UserProfile` | `modules/users/entities/user-profile.entity.ts` | ↔ `User` |
| `oauth_accounts` | `OAuthAccount` | `modules/users/entities/oauth-account.entity.ts` | ↔ `User` |
| `professional_profiles` | `ProfessionalProfile` | `modules/user-profile/entities/professional-profile.entity.ts` | |
| `user_preferences` | `UserPreference` | `modules/user-profile/entities/user-preference.entity.ts` | |
| `user_activities` | `UserActivity` | `modules/user-activity/entities/user-activity.entity.ts` | |
| `refresh_tokens` | `RefreshToken` | `modules/auth/entities/refresh-token.entity.ts` | ↔ `User` |
| `biometric_configs` | `BiometricConfig` | `modules/auth/entities/biometric-config.entity.ts` | ↔ `User` |
| `two_factor_auth` | `TwoFactor` | `modules/two-factor/entities/two-factor.entity.ts` | ↔ `User` (1:1) |
| `organizations` | `Organization` | `modules/workspaces/entities/organization.entity.ts` | |
| `organization_memberships` | `OrganizationMembership` | `modules/organizations/entities/organization-membership.entity.ts` | |
| `workspaces` | `Workspace` | `modules/workspaces/entities/workspace.entity.ts` | |
| `workspace_memberships` | `WorkspaceMembership` | `modules/workspaces/entities/workspace-membership.entity.ts` | |
| `workspace_invitations` | `WorkspaceInvitation` | `modules/workspaces/entities/workspace-invitation.entity.ts` | |
| `user_workspace_states` | `UserWorkspaceState` | `modules/workspaces/entities/user-workspace-state.entity.ts` | |
| `subscriptions` | `Subscription` | `modules/subscriptions/entities/subscription.entity.ts` | ↔ `User` (1:1) |
| `usage_events` | `UsageEvent` | `modules/subscriptions/entities/usage-event.entity.ts` | |
| `products` | `Product` | `modules/product-catalog/entities/product.entity.ts` | |
| `commercial_plans` | `CommercialPlan` | `modules/product-catalog/entities/commercial-plan.entity.ts` | |
| `care_pathways` | `CarePathway` | `modules/product-catalog/entities/care-pathway.entity.ts` | |
| `integration_offerings` | `IntegrationOffering` | `modules/product-catalog/entities/integration-offering.entity.ts` | |
| `platform_assets` | `PlatformAsset` | `modules/platform-assets/entities/platform-asset.entity.ts` | |
| `asset_packs` | `AssetPack` | `modules/platform-assets/entities/asset-pack.entity.ts` | |
| `role_profiles` | `RoleProfile` | `modules/platform-assets/entities/role-profile.entity.ts` | |
| `organization_entitlements` | `OrganizationEntitlement` | `modules/platform-assets/entities/organization-entitlement.entity.ts` | |
| `ai_queries` | `AIQuery` | `modules/ai/entities/ai-query.entity.ts` | ↔ `User` |
| `saved_prompts` | `SavedPrompt` | `modules/personalization/entities/saved-prompt.entity.ts` | |
| `user_ai_preferences` | `UserAiPreference` | `modules/personalization/entities/user-ai-preference.entity.ts` | |
| `artifacts` | `Artifact` | `modules/artifacts/entities/artifact.entity.ts` | |
| `artifact_versions` | `ArtifactVersion` | `modules/artifacts/entities/artifact-version.entity.ts` | |
| `clinical_memory_entries` | `ClinicalMemoryEntry` | `modules/memory/entities/clinical-memory-entry.entity.ts` | |
| `long_memory_entries` | `LongMemoryEntry` | `modules/memory/entities/long-memory-entry.entity.ts` | |
| `short_memory_entries` | `ShortMemoryEntry` | `modules/memory/entities/short-memory-entry.entity.ts` | |
| `tool_results` | `ToolResult` | `modules/medical-control-plane/tool-orchestrator/entities/tool-result.entity.ts` | |
| `drugs` | `Drug` | `modules/clinical/entities/drug.entity.ts` | |
| `protocols` | `Protocol` | `modules/clinical/entities/protocol.entity.ts` | |
| `administrative_automation_tasks` | `AdministrativeAutomationTaskEntity` | `modules/emergency-os/entities/administrative-automation-task.entity.ts` | |
| `automation_audit_events` | `AutomationAuditEvent` | `modules/automation-audit/entities/automation-audit-event.entity.ts` | |
| `audit_logs` | `AuditLog` | `modules/audit/entities/audit-log.entity.ts` | ↔ `User`; hash-chained (see `AddAuditLogHashing` migration) |
| `analytics_events` | `AnalyticsEvent` | `modules/analytics/entities/analytics-event.entity.ts` | |
| `notifications` | `Notification` | `modules/notifications/entities/notification.entity.ts` | ↔ `User` |
| `notification_preferences` | `NotificationPreference` | `modules/notifications/entities/notification-preference.entity.ts` | ↔ `User` |
| `device_tokens` | `DeviceToken` | `modules/notifications/entities/device-token.entity.ts` | ↔ `User` |
| `encryption_keys` | `EncryptionKey` | `modules/encryption/entities/encryption-key.entity.ts` | |
| `integration_sources` | `IntegrationSourceEntity` | `modules/interoperability/entities/integration-hub.entity.ts` | Module also has `integration_event_records`/`normalized_integration_events` tables not matched by a direct `@Entity` grep — verify against `modules/interoperability/` if you need their exact shape |

### Governance & compliance entities

All defined in one file, `modules/platform-governance/entities/platform-governance.entities.ts`:

| Table | Entity |
|---|---|
| `platform_governance_policies` | `PlatformGovernancePolicy` |
| `clinical_release_gates` | `PlatformClinicalReleaseGate` |
| `clinical_safety_findings` | `PlatformClinicalSafetyFinding` |
| `platform_security_events` | `PlatformSecurityEvent` |
| `platform_regulatory_classifications` | `PlatformRegulatoryClassification` |
| `platform_equity_metrics` | `PlatformEquityMetric` |
| `platform_validation_scenarios` | `PlatformValidationScenario` |
| `platform_review_items` | `PlatformReviewItem` |
| `platform_consent_records` | `PlatformConsentRecord` |
| `platform_privacy_requests` | `PlatformPrivacyRequest` |
| `platform_observability_events` | `PlatformObservabilityEvent` |
| `platform_source_provenance` | `PlatformSourceProvenance` |

Not yet independently verified against a dedicated entity file (present in the live SQLite DB, likely defined in `modules/interoperability/` or a clinical module): `integration_event_records`, `normalized_integration_events`, `specialty_catalog`.

### Notable migrations

| Migration | Significance |
|---|---|
| `AddAuditLogHashing` | Hash-chains `audit_logs` for tamper-evidence |
| `EncryptPhiColumns` | Column-level encryption for PHI-bearing fields |
| `CreateAIQueryTable` | AI usage/cost tracking |
| `CreateArtifactsTables` | Artifact-intelligence pipeline persistence |
| `CreateMemoryTables` | Short/long/clinical memory entries |
| `CreatePlatformGovernanceTables` | The 11-table governance suite above |
| `CreateClinicalGovernanceWorkflowTables` | Clinical release gates / safety findings |
| `CreateAdministrativeAutomationTasks` | Automation task tracking |

---

## Document model (Mongoose) — clinical patient domain

| Model | File | Purpose |
|---|---|---|
| `UnifiedPatient` | `backend/src/models/unified-patient.model.ts` | **The canonical patient record.** Rich typed schema: `Gender`, `CodeStatus`, `TriageAcuityCode` (CTAS1–5 / ESI1–5), `JourneyState` (`EMS_DISPATCHED` → ... → `DISCHARGE`), `DPSScore`, `EMSStatus`, `BoardingStatus`, `ProtocolStatus`, `DeteriorationRiskCategory`, `TriageColor`, `AIReviewStatus`, `SafetySeverity`; plus emergency contacts, patient identifiers, vitals, wearables, allergies, medications, AI recommendations, safety alerts, triggered protocols, DPS/reassessment history. |
| `Patient` | `backend/src/models/Patient.ts` | Thin re-export barrel: `Patient = UnifiedPatient` (legacy compat name — don't create a second, divergent schema under this name) |
| `PatientJourney` | `backend/src/models/PatientJourney.ts` | Not a Mongoose model — a pure TypeScript `JourneyState` type + `JourneyTransitions` state-machine map |
| `SmartIntake` | `backend/src/models/SmartIntake.ts` | Intake/verification/audit trail: `IntakeInputSource`, `VerificationDecision`, `FinalIntakeAction`, `IdentityAuditAction` enums. Backs the legacy `smart-intake.routes.ts` endpoints. |

**Runtime gate:** these models are only live when `registerEmergencyMongooseRuntime()` connects (env `ENABLE_MONGOOSE_EMERGENCY_OS=true` + a Mongo URI configured). In the default `docker-compose.app.yml` profile this is `false` — the SQLite/TypeORM path is what actually runs unless explicitly enabled. When disabled, the `reassessment.scheduler.ts` cron job also does not start (it operates on Mongo patient documents).

Legacy pre-TypeORM Mongo migrations for this same domain live at `backend/migrations/004_emergency_os_cleanup.js` through `010_rollback_unified_patients.js` — largely superseded by the current `UnifiedPatient` model but kept for migration history.

---

## Working with this data model

- **Adding a new relational entity:** create it under the owning module's `entities/` folder, generate a TypeORM migration, and add a row to this document.
- **Extending the patient domain:** changes belong in `unified-patient.model.ts`. Do not add a second, parallel patient schema — `Patient.ts` exists specifically to prevent that by re-exporting `UnifiedPatient`.
- **Checking whether patient data is live in your environment:** confirm `ENABLE_MONGOOSE_EMERGENCY_OS` first; a lot of "why is this patient endpoint returning nothing" debugging traces back to this flag.

See also: [Platform Architecture Overview §Data layer](../architecture/platform-architecture-overview.md#6-data-layer), [Configuration Reference](../configuration-reference.md).
