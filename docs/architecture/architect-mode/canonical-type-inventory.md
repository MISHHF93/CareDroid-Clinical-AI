# Canonical Type Inventory — Architect Mode Stage A

## Authority rules

1. **New shared domain types** → `src/contracts/domains.ts`  
2. **Operation results / errors** → `src/contracts/results.ts` (`Result`, `ErrorCode`)  
3. **Emergency operational FE types** (legacy rich model) → `src/types/emergency` until merged  
4. **Nest DTOs / entities** → `backend/src/modules/**/dto|entities` — wire via OpenAPI/shared package long-term  
5. **Do not** introduce parallel `Patient` interfaces in page files  

## Frontend contracts (canonical seed)

| Type / symbol | File | Status |
|---------------|------|--------|
| `Result`, `ok`, `err`, `ErrorCode` | `src/contracts/results.ts` | Canonical error taxonomy |
| `PatientId`, `PatientStatus`, `TriageAcuity`, `Patient`, `WorkflowStage` | `src/contracts/domains.ts` | Canonical brands — **partially adopted** |
| `Patient` (emergency) | `src/types/emergency` | **DUPLICATE** rich model used by store |
| Emergency role ids | `EMERGENCY_ROLE_IDS` frozen object | Canonical FE roles |
| Routes | `CANONICAL_ROUTES` | Canonical paths |
| API paths | `api.config.ts` | Canonical FE path strings |

## Backend types

| Type / symbol | File | Status |
|---------------|------|--------|
| `UserRole` | `users/entities/user.entity.ts` | 4-value auth role |
| `Permission` | `auth/enums/permission.enum.ts` | Server authz atoms |
| `User` entity | user.entity.ts | Auth identity |
| RAG DTOs | `rag/dto/*` | Retrieval/ingest |
| `VectorRecord` | `vector-db.interface.ts` | Vector adapter contract |
| `RAG_GLOBAL_ORG_SCOPE` | `rag.service.ts` | Tenant global sentinel |
| AI query entity | `ai/entities/ai-query.entity.ts` | Durable AI log |
| Audit log entity | `audit/entities/audit-log.entity.ts` | Audit chain |
| Patient TypeORM | migrations + modules clinical/emergency | Durable patient |

## AI accountable response (Stage G target shape)

Not fully enforced yet — target fields:

```ts
type AccountableRecommendation = {
  content: string;
  evidence: Array<{ sourceId: string; citation: string; score?: number }>;
  provenance: { retrievedAt: string; corpusVersion?: number };
  confidence: number; // 0..1
  uncertainty: string;
  model: { provider: string; name: string; version?: string };
  promptVersion: string;
  safety: { status: 'ok' | 'abstain' | 'escalate'; reasons: string[] };
  humanReviewRequired: boolean;
};
```

## Error taxonomy (adopt widely Stage C)

From `ErrorCode`: VALIDATION, NOT_FOUND, CONFLICT, UNAUTHORIZED, FORBIDDEN, NETWORK, TIMEOUT, RATE_LIMIT, DEPENDENCY_UNAVAILABLE, DATABASE, INTERNAL, AI_UNAVAILABLE, AI_SAFETY_REJECTION, CANCELLED, STALE_VERSION, UNKNOWN.

## Merge plan

| Step | Action |
|------|--------|
| C1 | Map emergency Patient → contracts Patient + extension fields |
| C2 | All new services return `Result<T>` |
| C3 | Nest exception filter maps to same ErrorCode strings |
| D1 | Shared permission map types FE+BE |
| G1 | AccountableRecommendation on AI routes |
