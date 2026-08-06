# Tool capability honesty v1 (PR-7) & AI maturity labels (PR-8)

## PR-7 — Tool ID alignment + unsupported honesty

### Executable server tools

Canonical POST `/tools/:id/execute` ids live in:

`backend/.../tool-orchestrator.registry.ts` → `REGISTERED_EXECUTOR_TOOL_IDS` (39 calculators/tools as of this check — re-verify by comparing this array's length against `registerTool()` call count in `tool-orchestrator.service.ts` before citing, since this list has grown before without docs catching up).

Aliases expanded for common names (`heart`, `gcs`, `news-2`, `sofa`, `wells`, …) via `EXECUTOR_ID_ALIASES` and `REGISTRY_ID_TO_EXECUTOR_TOOL_ID`.

### Unsupported tools

NLU may route to many catalog ids that **do not** have `registerTool()` handlers. Those remain listed in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` and return:

- `success: false`
- `errorCode: UNSUPPORTED_TOOL` (when known)
- `result.data.honesty` from `describeToolCapability()`
- `result.disclaimer` — do not treat as completed clinical calculation
- Chat formatting: **“not executed”** + suggested surface

```ts
import { describeToolCapability } from './tool-orchestrator.registry';

describeToolCapability('qsofa');
// → unsupported | executable | unknown with honest message
```

### qSOFA note

qSOFA is available as a **frontend / pure calculator** path; it is **not** in `REGISTERED_EXECUTOR_TOOL_IDS`. Server execute will honestly refuse — use client calculator, not a fake API success.

## PR-8 — UI maturity labels

| Component | Role |
|-----------|------|
| `AiMaturityBadge` | Chip: heuristic / deterministic / measured / seed / experimental / rag-grounded / degraded |
| `inferAiMaturity` | From provenance `modelOrEngine` + evidence kinds |
| `AIRecommendationCard` | Shows maturity chip + provenance block (uncertainty, reviewer, limitations, evidence count) |

Never present seed evaluation metrics or heuristic nodes as measured foundation-model quality.
