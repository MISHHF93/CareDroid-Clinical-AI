# Production AI monitoring v1

| Field | Value |
|-------|--------|
| **Code** | `lib/ai/productionMonitoring.ts` |
| **Wired** | Egress success/failure, kill switch, canary, shadow, PHI redaction (incl. patient-context gate), unsupported tool, retrieval miss |

## Events

| Type | When | Call sites |
|------|------|------------|
| `egress_success` / `egress_failure` | LLM egress completes or fails | `lib/ai/providers/egress.ts` |
| `kill_switch` | Kill engaged | `egress.ts` |
| `canary_served` | Canary path returned to user | `egress.ts` |
| `shadow_candidate` | Shadow candidate invoked (log-only) | `egress.ts` |
| `phi_redaction` | PHI minimize redacted tokens **or** patient-context gate stripped ids | `egress.ts` (`detail.reason` may be `patient_context_gate`) |
| `unsupported_tool` | Tool id not resolvable / no executor | `tool-orchestrator.service.ts`, `tool-execution.service.ts` |
| `retrieval_miss` | RAG retrieve returned zero chunks | `retrieval.service.ts` |
| `clinician_override` | Product hooks later | — |
| `provenance_missing` | Reserved | — |

## Usage

```ts
import { getAiMonitorSnapshot, recordAiMonitorEvent } from '../lib/ai/productionMonitoring';

recordAiMonitorEvent('clinician_override', { intent: 'triage_recommendation' });
console.log(getAiMonitorSnapshot());
```

Enable console stream: `AI_MONITOR_LOG=1`.

## Tests

```bash
node node_modules/vitest/vitest.mjs run lib/ai/productionMonitoring.test.ts lib/ai/providers --reporter=dot
```

## Next

- Export snapshot on `/api/ai/monitor` (auth-gated)
- Prometheus counters
- Alert on kill_switch spikes / unsupported_tool storms / retrieval_miss rate
