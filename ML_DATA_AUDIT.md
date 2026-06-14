# ML1 Data Audit

Generated for ML1 only. No models were trained, no clinical prediction APIs were created, no application code was changed for ML1, and no data artifacts were modified.

## Root CSV

- CSV in repo root: **NONE found**
- Root clinical CSV such as `synthetic_medical_triage.csv`: **not found**
- Safe-use recommendation: proceed with artifact/code metadata only; do not infer that any clinical CSV exists.

## CSV Inventory

| Path | Columns | Rows | Sample row shape | Likely purpose | PHI/PII risk | Safe for ML training? |
| --- | --- | ---: | --- | --- | --- | --- |
| `data/artifacts/caredroid_artifacts.csv` | `artifactId`, `name`, `type`, `category`, `route`, `sourceFile`, `frontendStatus`, `backendStatus`, `demoStatus`, `assetPack`, `product`, `workspace`, `roles`, `organizationTypes`, `riskLevel`, `description`, `dependencies`, `tags`, `embeddingText`, `status` | ~1814 | One row per product/code artifact with route, source file, statuses, tags, and embedding text | Repository/product artifact catalog | Low. Contains clinical terminology and role names, but no patient-level records observed in sample. | Yes, for repository/code artifact intelligence. Do not use as clinical model data. |
| `data/artifacts/caredroid_artifact_features.csv` | `artifactId`, `normalizedText`, `tags`, `typeEncoding`, `roleEncoding`, `workspaceEncoding`, `packEncoding`, `dependencyCount`, `riskScore`, `readinessScore` | ~1278 | One row per artifact with encoded metadata and numeric scores | Artifact feature table | Low. Derived artifact metadata only. | Yes, for repository/code artifact classification. |
| `data/ml/artifact_training_dataset.csv` | `inputText`, `targetArtifactId`, `targetCategory`, `targetWorkspace`, `targetPack`, `targetProduct`, `labelType`, `confidence` | ~3834 | Weak training row mapping text/route/tag cues to artifact IDs and product metadata | Existing artifact-intelligence training dataset | Low. Artifact labels/routes/tags only. | Yes, for artifact intelligence baseline. |

## Data Artifact Audit

Discovery found:

- CSV files: 3, all under `data/`.
- Data/artifact files under `data` or `src/data`: 351 matched files.
- Explicit fixture/seed/mock/demo files: 26 matched files.
- Prisma schema: none found.
- Drizzle config/schema: none found.
- Supabase migrations: none found.
- Backend migrations: Mongo-style migration scripts and TypeORM migrations found.

### Patient/Clinical/Operational Seed Files

| Path | Format | Approx records | Fields/shape observed | PHI/PII risk | Safe-use recommendation |
| --- | --- | ---: | --- | --- | --- |
| `src/data/edScenarioFixtures.js` | JS seed/demo data | Base patient definitions: 15 visible `pt-*` seeds; first-customer scenario references 100-patient/day walkthrough with 42 active census | `id`, `mrn`, `firstName`, `lastName`, `dob`, `age`, `sex`, `arrivalTime`, `triageTime`, `chiefComplaint`, `complaintCategory`, `state`, `priority`, `vitals`, `flags`, `assignedStaffId`, `roomId`, `timeline` | Medium/high. Appears synthetic/demo, but includes patient-like names, DOB/MRN-like values, complaints, vitals. | Do not train on raw rows. Use only after redaction/minimization and with synthetic/demo label retained. |
| `src/data/firstCustomerDemoMode.js` | JS demo data | 100 patient/day scenario; active demo census 42 | Demo names, complaints, state plans, capacity/queue/analytics outputs | Medium/high. Synthetic but highly patient-like. | Exclude from ML training unless redacted to aggregate operational metrics. |
| `backend/src/modules/emergency-os/emergency-os.fixtures.ts` | TS fixture data | 4 patient fixtures visible in sampled file, plus staff/rooms/alerts | `EmergencyPatient[]`, vitals, flags, timeline, `EmergencyStaff[]`, `EmergencyRoom[]`, `EmergencyAlert[]` | Medium/high. Synthetic patient-level clinical fixtures. | Exclude raw patient rows; aggregate only if needed. |
| `src/data/smartIntakeFixtures.js` | JS smart-intake fixture | 1 intake demo object; 9 extracted fields, 2 candidate matches | `firstName`, `lastName`, `dateOfBirth`, `sex`, `phone`, `healthCardNumber`, `address`, allergies, medications, candidate patient IDs | High. Contains phone/address/health-card-like values and identity-linking demo data. | Do not train on raw fields. Redact or skip. |
| `backend/src/fixtures/smart-intake.fixtures.ts` | TS smart-intake fixture | 6 input fixtures | manual identity fields, phone/address/MRN/health-card-like identifiers, EMS temporary ID, medications, allergies | High. Synthetic but identity and health data-like. | Do not train on raw fields. Redact or skip. |
| `src/data/smartIntakeVerticalSlice.js` | JS fixture/demo | Vertical slice demo data | Smart Intake workflow and Emergency OS validation shape | Medium/high if patient fields present. | Inspect/redact before any training use. |
| `src/data/demoHospitalMapData.js` | JS demo operational map data | Demo hospital/location records | Operational/location data | Low/medium. Operational metadata, likely no patient PHI in sampled discovery. | Safe for non-patient operational artifact intelligence after spot check. |
| `src/utils/demoLiveState.js` | JS demo live state | Demo operational state | Live-state UI/ops fixture | Low/medium. Needs spot check before use. | Prefer aggregate/non-patient fields only. |
| `src/services/emergencyDemoEnvironmentService.js` | JS service fixture | Demo environment metrics | Patient volume and Emergency OS readiness metrics | Low/medium. | Use aggregate metrics only. |
| `backend/src/modules/product-catalog/data/product-catalog-seed.data.ts` | TS seed | Product/catalog seed records | Product, asset, capability metadata | Low. No patient records indicated. | Safe for repository/product artifact ML. |
| `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts` | TS seed | Platform asset seed records | Platform asset metadata | Low. | Safe for artifact intelligence. |
| `backend/src/modules/artifacts/artifact.seed.ts` | TS seed | Artifact seed records | Artifact metadata | Low. | Safe for artifact intelligence. |
| `backend/ml-services/nlu/data/train.jsonl` | JSONL | NLU training examples | Intent/training examples | Unknown/medium until fully scanned; may contain clinical prompt text. | Use only after PHI/PII scan; do not combine with patient fixture training. |
| `backend/ml-services/nlu/data/val.jsonl` | JSONL | NLU validation examples | Intent/eval examples | Unknown/medium until fully scanned. | Use only after PHI/PII scan. |
| `backend/ml-services/nlu/data/test.jsonl` | JSONL | NLU test examples | Intent/eval examples | Unknown/medium until fully scanned. | Use only after PHI/PII scan. |
| `data/artifacts/caredroid_artifacts.json` | JSON | ~1814 artifact objects | Same artifact schema as CSV plus `embeddingText` | Low for PHI; contains clinical product descriptions. | Safe for artifact intelligence. |

Additional explicit seed/fixture/demo/mock files discovered and requiring spot-check before ML use:

- `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts`
- `backend/src/modules/product-catalog/product-catalog.seed.service.ts`
- `src/utils/demoLiveState.js`
- `src/utils/demoLiveState.test.js`
- `src/data/testHelpers/fleetToolsTestFixtures.js`
- `src/data/testHelpers/pr2TestFixtures.js`
- `src/data/testHelpers/clinicalToolsTestFixtures.js`
- `src/data/testHelpers/pr4aTestFixtures.js`
- `store/firstCustomerDemoMode.test.ts`
- `backend/src/fixtures/smart-intake.fixtures.ts`
- `src/data/edScenarioFixtures.d.ts`
- `src/data/testHelpers/pr1TestFixtures.js`
- `src/data/edScenarioFixtures.js`
- `backend/src/modules/product-catalog/data/product-catalog-seed.data.ts`
- `src/services/emergencyDemoEnvironmentService.js`
- `src/data/edScenarioFixtures.test.js`
- `src/pages/demoLiveStateReconciliation.test.js`
- `src/data/firstCustomerDemoMode.js`
- `src/data/smartIntakeFixtures.js`
- `backend/src/modules/emergency-os/emergency-os.fixtures.ts`
- `src/data/testHelpers/pr3TestFixtures.js`
- `backend/src/modules/platform-assets/platform-assets.seed.service.spec.ts`
- `backend/src/modules/platform-assets/platform-assets.seed.service.ts`
- `src/services/disabledBackendMocks.js`
- `src/data/demoHospitalMapData.js`
- `backend/src/modules/artifacts/artifact.seed.ts`

## Total Seeded Patients Estimate

- `src/data/edScenarioFixtures.js`: at least 15 base patient seeds visible, plus scenario extras and first-customer scenario integration.
- `src/data/firstCustomerDemoMode.js`: configured for `patientVolumePerDay: 100`, with `ACTIVE_DEMO_CENSUS = 42`.
- `backend/src/modules/emergency-os/emergency-os.fixtures.ts`: 4 visible backend Emergency OS patient fixtures in sampled lines.
- Smart Intake fixtures: 6 backend intake inputs plus 1 frontend identity-review demo with 2 candidate matches.

Estimated seeded/demo patient-like records: **at least 100+**, depending on scenario composition. These appear synthetic/demo but include direct identifiers and clinical fields, so they must be treated as PHI/PII-risk for ML.

## Database Schema Audit

### Mongo-Style Migrations

| Collection/table | Source | Columns/fields/indexes discovered | ML relevance |
| --- | --- | --- | --- |
| `patients` | `backend/migrations/004_emergency_os_cleanup.js`, `005_add_patient_verification_fields.js`, `006_add_emergency_scenario_fields.js` | indexes on patient flow and verification fields; added `verification_status`, `verification_method`, `verified_at`, `verified_by`, `mrn`, `decisionToAdmitTime`, `boardingStartTime`, `boardingStatus`, `boardTimeMinutes`, `virtualRecheckScheduled`, `virtualRecheckTime`, `safetyAlerts`, `continuousVitals`, `triggeredProtocols`, `mciBatchId`, `triageColor`, `dischargeReadinessScore`, `wearableDeviceId` | ML-relevant but PHI/clinical. Use only redacted aggregates. |
| `unified_patients` | `backend/migrations/009_create_unified_patients.js`, `010_migrate_to_unified_patients.js` | indexes on `mrn`, `phn`, `currentState`, `dpsScore`, `boardingStartTime`, `mciBatchId`, `wearableDeviceId`, `triggeredProtocols.status`, `nextReassessmentDue`, `emsStatus`, `etaMinutes`, `identifiers.type/value` | ML-relevant but high PHI/PII risk. |
| `surge_events` | `backend/migrations/007_create_new_collections.js` | `type`, `activationTime`, `status`, `estimatedPatientCount`, `actualPatientCount` | Operational aggregate; potentially safe if not patient-linked. |
| `safety_incidents` | `backend/migrations/007_create_new_collections.js` | `timestamp`, `severity` indexes | Sensitive safety data; use only de-identified aggregates. |
| `virtual_rechecks` | `backend/migrations/007_create_new_collections.js` | `scheduledTime`, `patientId` indexes | Patient-linked; exclude raw rows. |
| `wearable_data` | `backend/migrations/007_create_new_collections.js` | `patientId`, `timestamp`, `deviceType` indexes | Patient-linked clinical/telemetry; exclude raw rows. |
| `protocol_audit` | `backend/migrations/007_create_new_collections.js` | `patientId`, `triggeredAt`, `protocolId` indexes | Patient-linked clinical workflow; exclude raw rows. |

### TypeORM Migrations

| Table | Source | Columns discovered | ML relevance |
| --- | --- | --- | --- |
| `ai_queries` | `backend/src/database/migrations/1738348800000-CreateAIQueryTable.ts` | `id`, `userId`, `prompt`, `response`, `status`, `model`, `promptTokens`, `completionTokens`, `totalTokens`, `cost`, `latencyMs`, `conversationId`, `feature`, `intentClassified`, `toolUsed`, `metadata`, `createdAt` | AI usage analytics. Raw prompts/responses may contain PHI and must not be used without redaction. |
| `short_memory_entries` | `backend/src/database/migrations/1770000000000-CreateMemoryTables.ts` | `id`, `userId`, `workspaceId`, `type`, `title`, `content`, `createdAt`, `updatedAt` | User/workspace memory; potential PII. |
| `long_memory_entries` | `backend/src/database/migrations/1770000000000-CreateMemoryTables.ts` | `id`, `userId`, `workspaceId`, `type`, `title`, `content`, `tags`, `createdAt`, `updatedAt` | User/workspace memory; potential PII. |
| `clinical_memory_entries` | `backend/src/database/migrations/1770000000000-CreateMemoryTables.ts` | `id`, `userId`, `workspaceId`, `patientId`, `type`, `title`, `content`, `source`, `createdAt`, `updatedAt` | Patient-linked clinical memory; exclude raw rows. |
| `encryption_keys` | `backend/src/database/migrations/1706609000000-EncryptPhiColumns.ts` | `id`, `keyVersion`, `keyMaterial`, `algorithm`, `isActive`, `status`, `rotationReason`, `scheduledTime`, `progressPercentage`, `recordsProcessed`, `createdAt`, `activatedAt`, `deletionScheduledAt`, `auditInfo` | Security metadata; never use key material for ML. |
| `users` / `user_profiles` encrypted columns | `backend/src/database/migrations/1706609000000-EncryptPhiColumns.ts` | `email_encrypted`, `phone_encrypted`, `ssn_encrypted`, `date_of_birth_encrypted`, `medical_history_encrypted`, `allergies_encrypted`, `medications_encrypted`, `encryption_key_version`, `phi_fields_encrypted` | Strong PHI/PII signal; excluded. |
| `artifacts` | `backend/src/database/migrations/1769385600000-CreateArtifactsTables.ts` | `id`, `type`, `title`, `description`, `tags`, `relationships`, `version`, `createdAt`, `updatedAt` | Safe target for artifact intelligence. |
| `artifact_versions` | `backend/src/database/migrations/1769385600000-CreateArtifactsTables.ts` | `id`, `artifactId`, `type`, `title`, `description`, `tags`, `relationships`, `version`, `changeSummary`, `createdAt` | Safe target for artifact intelligence. |
| `platform_review_items` | `backend/src/database/migrations/1770500000000-CreatePlatformGovernanceTables.ts` | `organizationId`, `patientId`, `runId`, `capabilityId`, `reviewType`, `severity`, `status`, `assignedTo`, `dueAt`, `payload`, `decision` | May be patient-linked; use only aggregate/de-identified data. |
| `platform_consent_records` | `backend/src/database/migrations/1770500000000-CreatePlatformGovernanceTables.ts` | `patientId`, `organizationId`, `scope`, `status`, `grantedAt`, `expiresAt`, `revokedAt`, `source`, `capturedBy`, `metadata` | Patient-linked consent; exclude raw rows. |
| `platform_privacy_requests` | `backend/src/database/migrations/1770500000000-CreatePlatformGovernanceTables.ts` | `patientId`, `requestType`, `status`, `requestedBy`, `reviewedBy`, `dueAt`, `resultArtifactUri`, `metadata` | Patient-linked privacy data; exclude raw rows. |
| `clinical_release_gates` | `backend/src/database/migrations/1770600000000-CreateClinicalGovernanceWorkflowTables.ts` | `capabilityId`, `changeType`, `artifactVersion`, `riskLevel`, `validationRunId`, `status`, `requiredApprovals`, `decision` | Safe for artifact/governance intelligence. |
| `clinical_safety_findings` | `backend/src/database/migrations/1770600000000-CreateClinicalGovernanceWorkflowTables.ts` | `runId`, `capabilityId`, `severity`, `findingType`, `source`, `description`, `ownerUserId`, `status`, `resolution` | Governance metadata; may include sensitive descriptions; redact before training. |

### Mongoose Model Audit

`backend/src/models/unified-patient.model.ts` defines a rich `UnifiedPatient` schema/interface with ML-relevant but sensitive fields:

- Identifiers/demographics: `mrn`, `phn`, `name`, `age`, `gender`, `dob`, `identifiers`, `phone`, `email`, `address`, `emergencyContact`.
- Clinical context: `chiefComplaint`, `hpi`, `pmh`, `medications`, `allergies`, `codeStatus`.
- Vitals/triage: `currentVitals`, `vitalHistory`, `triage`, `dpsScore`, `dpsHistory`, `lastReassessment`, `nextReassessmentDue`.
- Flow/operations: `currentState`, `stateHistory`, `waitTimeMinutes`, `decisionToAdmitTime`, `boardingStartTime`, `boardingStatus`, `boardTimeMinutes`, `bedRequest`, `bedAssignment`, `emsStatus`, `etaMinutes`.
- Safety/AI fields: `triggeredProtocols`, `deteriorationPrediction`, `aiRecommendations`, `safetyAlerts`, `mergeTracking`.

This model is **not safe for raw ML training**. Only de-identified aggregate operational features should be used, and ML1 did not train on any of it.

## ML-Relevant Tables Requested

| Requested table/entity | Status discovered | Notes |
| --- | --- | --- |
| `patients` | Available as Mongo collection and unified model | High PHI/PII risk. |
| `vitals` | Embedded in patient models/fixtures as `vitals`, `currentVitals`, `vitalHistory`, `continuousVitals`, `wearable_data` | Patient-linked clinical data. |
| `clinical_scores` | No standalone table found in sampled schema; score-like fields exist in calculators/events and `dpsScore`/`dischargeReadinessScore` | Treat as clinical decision-support data. |
| `patient_flags` | Embedded as `flags`, `riskFlags`, `safetyAlerts`, `patient flags` | Patient-linked. |
| `journey_events` | Embedded as `timeline`, `stateHistory`; patient flow states indexed in patient collections | Patient-linked. |
| `referrals` | Referral concepts found in seed/service data; no standalone table found in sampled migrations | Patient-linked if present. |
| `ems_units` | EMS unit/patient fields found in fixtures and unified patient fields (`emsStatus`, `etaMinutes`) | Patient-linked operational data. |
| `alerts` | Emergency fixture alerts and safety incidents/protocol audit collections | Sensitive if patient-linked. |
| `staff_assignments` | `assignedStaffId`, `staff`, `assignedTo`, `capturedBy`, `ownerUserId` fields found | Staff/user identifiers; avoid raw training. |

## ML-Ready Fields Identified

Safe for ML2 artifact/code intelligence:

- Artifact metadata: `artifactId`, `name`, `type`, `category`, `route`, `sourceFile`, `frontendStatus`, `backendStatus`, `demoStatus`, `assetPack`, `product`, `workspace`, `roles`, `organizationTypes`, `riskLevel`, `description`, `dependencies`, `tags`, `embeddingText`, `status`.
- Derived artifact features: `normalizedText`, `typeEncoding`, `roleEncoding`, `workspaceEncoding`, `packEncoding`, `dependencyCount`, `riskScore`, `readinessScore`.
- Repository/code features to derive later: file path, extension, folder, import/export counts, route/endpoint/component/service status, test coverage indicator, Emergency OS keywords, legacy keywords, Android/mobile keywords, AI/ML keywords, integration keywords.

Conditionally usable only after redaction/minimization:

- Aggregate operational counts: census, queue counts, wait time distributions, boarding counts, capacity bands, reassessment counts, EMS counts.
- Non-identifying schema flags: field presence, table/collection names, index names, workflow state names.

Excluded from raw ML training:

- Names, DOB/dateOfBirth, MRN/PHN/health-card numbers, phone, email, address, emergency contacts, patient IDs, patient-linked free text, raw prompts/responses, memory entries, clinical notes, medication/allergy lists, vitals tied to identifiers, wearable patient telemetry.

## PHI/PII Risk Findings

- CSVs found are artifact/code metadata and appear low PHI/PII risk.
- Multiple JS/TS fixture and seed files contain realistic patient-like demo records: names, MRNs, DOBs, phone/address/health-card-like values, medication/allergy examples, clinical complaints, vitals, flags, and journey states.
- Database migrations and Mongoose models confirm PHI/PII-bearing fields exist in application schemas, including encrypted email/phone/SSN/DOB/medical history/allergies/medications.
- `ai_queries.prompt`, `ai_queries.response`, memory `content`, and governance/review `payload` may contain sensitive text and must not be used without redaction.

Safe-use recommendation:

1. ML2 may safely proceed only on artifact/code metadata CSVs and derived repository features.
2. Do not use raw patient fixtures, clinical memory, AI prompts/responses, wearable data, protocol audit, or patient collections for training.
3. If operational metrics are needed, derive aggregate, non-identifying features only.
4. No automatic deletion, archiving, or routing changes should be made from ML predictions.

## ML1 Scope Confirmation

- Models trained: **NONE**
- Clinical prediction APIs created: **NONE**
- PHI/PII used for training: **NONE**
- Data artifacts modified: **NONE**
- Application code modified for ML1: **NONE**
- Report created: `ML_DATA_AUDIT.md`

## Can ML2 Proceed?

Yes, with restrictions: ML2 can safely proceed if it remains a repository/code artifact intelligence task using `data/artifacts/*` and derived codebase features. It should not train on raw patient/demo clinical fixtures or any patient-linked schema data unless a separate redaction/minimization step is explicitly approved and validated.
