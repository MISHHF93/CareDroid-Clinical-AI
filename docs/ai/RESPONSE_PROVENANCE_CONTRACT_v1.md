# AI Response Provenance Contract v1 (PR-6)

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Code** | `lib/ai/provenanceContract.ts` |
| **Structured AI** | `CareDroidAIResponse.provenance` |
| **Chat / gateway** | `ResponseComposerService` → `response.provenance` + `metadata.provenance` |

## Required fields

Every clinically meaningful AI response includes:

| Field | Meaning |
|-------|---------|
| `evidence[]` | Supporting chunks / registry artifacts / rules / calculators |
| `sourceVersions[]` | Source id + version/retrievedAt |
| `confidence` | 0–1 model or handler confidence |
| `missingInformation[]` | Known gaps |
| `uncertainty` | Human-readable residual uncertainty |
| `applicablePopulation` | Who this applies to (never universal by default) |
| `limitations[]` | What the system cannot do |
| `recommendedReviewerRole` | Who should review |
| `requiresClinicianReview` | **Always `true`** |
| `contractVersion` | `1.0.0` |

## Builders

```ts
import { buildAiResponseProvenance } from '../lib/ai/provenanceContract';

const provenance = buildAiResponseProvenance({
  confidence: 0.7,
  ragChunks,
  ragSources,
  missingInformation: ['sbp'],
  recommendedReviewerRole: 'triage_nurse',
});
```

## Surfaces

1. **Structured node** (`runCareDroidAI`) — always attaches provenance on success and error.  
2. **Chat / copilot gateway composer** — attaches provenance from citations + RAG context.  
3. **Foundation composer** — same contract on alternate foundation path.

## Validation

`validateCareDroidAIResponse` now requires `provenance` with `requiresClinicianReview: true`.

## FE usage

Clients should surface at least:

- Confidence + uncertainty  
- Missing information chips  
- Evidence list / citations  
- “Human review required” + recommended role  
- Limitations expander  

Do not hide provenance for “cleaner” UI on clinical routes.
