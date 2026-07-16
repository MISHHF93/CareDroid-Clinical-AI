# Capability Matrix — Architect Mode Stage A

**Legend**

| Class | Meaning |
|-------|---------|
| VERIFIED ACTIVE | Source→outcome proven by test or traced path |
| APPEARS COMPLETE | UI/route/API exists; full chain unproven |
| DUPLICATE | Multiple implementations |
| DISCONNECTED | Code without mount/consumer |
| UNFINISHED | Stub / TODO / partial |
| UNSAFE | Auth, tenant, error, or AI safety gap |
| OBSOLETE | Eligible for removal after proof |

---

## Core platform

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| FE single App entry | VERIFIED ACTIVE | `src/main.tsx` → `src/app/App.tsx`; Stage 0 tests | Keep |
| Canonical routes map | VERIFIED ACTIVE | `routes.config.ts` + redirect tests scripts | Enforce no invent paths |
| AppShell chrome | VERIFIED ACTIVE | `AppShell.tsx` wired in router | Stage E density/theme |
| shell/* named exports | VERIFIED ACTIVE | Re-exports real AppShell (not parallel UI) | Document only |
| Emergency Zustand store | VERIFIED ACTIVE | `emergency-store.test.ts`  + workflow tests Stage 0 | Stage F sync clarity |
| Result/error contracts | APPEARS COMPLETE | `src/contracts/results.ts` + tests; not universal adoption | Stage C |
| Domain brands (PatientId) | APPEARS COMPLETE | `src/contracts/domains.ts`; parallel types in `types/emergency` | Merge Stage C |

## Reception & intake

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| Reception workspace route | VERIFIED ACTIVE | router lazy + ReceptionWorkspace | Characterization Stage B |
| Pipeline URL contract | VERIFIED ACTIVE | `receptionIntakeBridge.RECEPTION_PIPELINE_URL_CONTRACT` | Test deep links |
| EMS convert → registration | VERIFIED ACTIVE | `convertEmsArrivalForReception` + store convert | e2e EMS-copilot exists |
| Smart intake overlay | APPEARS COMPLETE | components + services | Prove API when online |
| Identity search | APPEARS COMPLETE | PatientSearchResults / reception search | Stage B |
| Drafts / temp records | APPEARS COMPLETE | intake services | Stage B |
| Documents / OCR | UNFINISHED / UNSAFE risk | ocr.service exists; validation gate incomplete | Stage G |
| Waiting queues KPIs | APPEARS COMPLETE | reception queue models | Stage F counter consistency |
| Escalation workflow | APPEARS COMPLETE | receptionEscalationWorkflow | Stage B |
| Reception preload gate | VERIFIED ACTIVE | main.tsx path-conditional Cycle 68 | Keep |

## EMS

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| Express EMS routes | APPEARS COMPLETE | routes-registry `/ems` | Auth via runtime-auth |
| EMS websocket | APPEARS COMPLETE | ems.socket + main.ts register | JWT middleware Cycle |
| FE EMS pipeline | APPEARS COMPLETE | EMSPipeline.tsx modified C63–68 | e2e handoff |
| EMS handoff permissions | VERIFIED ACTIVE | emsHandoffPermission.contract.test Stage 0 | Keep |
| EMS–Copilot e2e | APPEARS COMPLETE | spec file present; not re-run Stage 0 | Stage B snapshot |

## AI / RAG / Copilot

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| RAG orchestration | VERIFIED ACTIVE | rag.service + unit specs | Workflow wiring Stage G |
| Tenant filter retrieval | VERIFIED ACTIVE | retrieval.tenant-adversarial 13 suite pass | HTTP isolation Stage H |
| pgvector store | VERIFIED ACTIVE | pgvector.store.spec Jest pass | Migration clean/upgrade Stage H |
| Pinecone / in-memory | DUPLICATE adapters | vector-db interface | Keep interface; pick durable |
| Embeddings multi-provider | APPEARS COMPLETE | embedding.service + xenova/openai | Offline default |
| Reranking | APPEARS COMPLETE | cohere + local | Fallback required |
| Transport safety | VERIFIED ACTIVE | transportSafety tests Stage 0 | Apply all egress |
| Groq demo adapter | VERIFIED ACTIVE | groqAdapter tests Stage 0 | Config-only demo |
| Accountable AI envelope | UNFINISHED | Partial confidence/citations UI | Stage G contract |
| MoE + foundation dual | DUPLICATE | modules/moe-router + ai/foundation | Unify behind gateway |
| Copilot chrome | APPEARS COMPLETE | CopilotPanel + shell access hooks | Stage B |
| AI eval baseline | APPEARS COMPLETE | data/ai-eval/v1 BASELINE | Re-measure Stage J |

## Auth / permissions / tenant

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| Nest JWT + Permission enum | VERIFIED ACTIVE | auth module, permission.enum | Keep server authority |
| Nest UserRole (4) | UNSAFE gap | physician/nurse/student/admin only | Map 12 FE roles Stage D |
| FE emergency roles (12) | VERIFIED ACTIVE | EMERGENCY_ROLE_IDS | Map to Nest |
| runtime-auth legacy | VERIFIED ACTIVE | runtime-auth.spec Jest pass | Cover all Express mounts |
| Platform entitlements | APPEARS COMPLETE | UserIdentityContext / assets | Align Stage D |
| Cross-tenant HTTP suite | UNFINISHED | RAG unit only | Stage H |
| Query JWT SSE | UNSAFE residual | Prior discovery | Migrate header/cookie |

## Data / migrations

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| TypeORM migrations set | APPEARS COMPLETE | database/migrations/* | Clean+upgrade Stage H |
| pgvector migration file | VERIFIED ACTIVE | 1772701300000 present | Run Stage H |
| SQLite dev store | APPEARS COMPLETE | caredroid*.sqlite | Label non-prod |
| Production synchronize ban | UNFINISHED proof | Must assert Stage H | Config test |
| Mongoose dual path | DUPLICATE / UNSAFE risk | enableMongooseEmergencyOs flag | Parity then retire |

## UX / design

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| Design system CSS | APPEARS COMPLETE | design-system.css | Medical Light Stage E |
| Competing CSS namespaces | DUPLICATE | reception-desk, alarm, role accent | Consolidate |
| Responsive / a11y Playwright | APPEARS COMPLETE | configs present | Run Stage E/J |
| Lazy specialty calculators | VERIFIED ACTIVE | Stage 0 tests | Keep |
| Dashboard chart split | VERIFIED ACTIVE | dashboardBundleContract | Keep |

## Engines / workflows

| Capability | Class | Evidence | Next |
|------------|-------|----------|------|
| Engines started in AppShell | APPEARS COMPLETE | multiple start*Engine calls | Classify durable vs session Stage F |
| Workflow action logging | APPEARS COMPLETE | store tests | Durable claim audit |
| Calculators deterministic | VERIFIED ACTIVE | clinical-calculators + hub tests | Keep non-LLM |

---

## Summary counts (Stage A draft)

| Class | Approx count |
|-------|-------------:|
| VERIFIED ACTIVE | 18 |
| APPEARS COMPLETE | 22 |
| DUPLICATE | 6 |
| UNFINISHED | 5 |
| UNSAFE / gap | 4 |

*Counts are classifications of rows above, not all product features.*
