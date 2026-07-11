# CareDroid AI Capability Maturity Matrix v1

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Frozen at** | `2026-07-11` |
| **Companion** | [`AI_BASELINE_REPORT_v1.md`](./AI_BASELINE_REPORT_v1.md) |

## Legend

| Code | Meaning |
|------|---------|
| **I** | Implemented — production-shaped path with real execution |
| **H** | Heuristic / rules — decision support without foundation-model inference |
| **L** | Local ML — trained classifier/embedding heads (not clinical foundation model) |
| **P** | Partial — plumbing exists; quality, wiring, or corpus incomplete |
| **F** | Future / registry placeholder / demo |
| **X** | Absent or not started |
| **S** | Seeded / demo metrics — do not cite as measured quality |

Risk: L = low, M = medium, H = high (from service registry where available).

---

## A. Platform services (`lib/ai/config.ts` registry)

| Service ID | Name | Maturity | Risk | Human review | Notes |
|------------|------|----------|------|--------------|-------|
| `copilot` | ED Copilot | **I** | M | Yes | Anthropic path when enabled; tools + optional RAG |
| `smartIntakeVerification` | Smart Intake Verification | **P** | M | Yes | LLM assist off by default; intake pipeline exists |
| `referralSummarization` | Referral Summarization | **P** | M | Yes | Tenant flag default off |
| `analyticsExplanation` | Operational Analytics Explanation | **P** | L | Yes | Tenant flag default off |
| `clinicalWorkflowLauncher` | Clinical Workflow Launcher | **P** | M | Yes | Tenant flag default off |
| `calculatorExplanation` | Calculator Explanation | **P** | M | Yes | Must not invent inputs / scores |
| `protocolTrigger` | Protocol Auto-Trigger | **H** | H | Rules | Local rule-based |
| `textMining` | Clinical Text Mining | **H** | L | No | Local entity extraction |
| smart handover (legacy) | Smart Handover | **P**/**H** | M | Yes | Structured templates + legacy LLM service mark |
| AI triage assistant (legacy) | AI Triage Assistant | **P**/**H** | M | Yes | CTAS suggestion for nurse review |
| ambient documentation (legacy) | Ambient Clinical Documentation | **F** | M | Yes | Registry legacy; Azure GPT-4o placeholder |
| deterioration prediction | Deterioration Prediction | **F**/**H** | H | Yes | Deterministic/heuristic model id |
| discharge prediction | Discharge Prediction | **F**/**H** | M | Yes | Heuristic readiness |
| START-AI | Admission Prediction | **F** | M | Yes | Ensemble placeholder |
| MoH patient matching | Patient Matching | **F**/**H** | H | Yes | Identity resolution — high risk if oversold |
| federated EMS triage | Federated EMS Triage | **F** | H | Yes | Edge federated placeholder |
| edge AI ambulance | Edge AI Ambulance | **F** | H | Yes | Deterministic demo US/vitals |

---

## B. Runtime paths

| Path | Maturity | Primary files | Notes |
|------|----------|---------------|-------|
| Conversational chat | **I**/**P** | `chat.service.ts`, `serverClient.ts` | Depends on keys + flags |
| Structured AI Node (18 intents) | **H** | `careDroidAI.ts` | Confidence not calibrated LLM uncertainty |
| Unified AI Node (NLU + artifact) | **L** | `backend/ml-services/` | Small NLU test set; metrics file missing on disk |
| Keyword copilot | **H** | `copilot.service.ts` | Separate from Claude |
| RAG retrieve + cite | **P** | `backend/src/modules/rag/` | 4 seed docs; rerank off |
| AI gateway envelope | **I** | `ai-gateway/` | Audit depends on user context |
| MoE routing | **P** | `moe-router/` | Cost/plan routing present |
| LLM security filters | **P** | `llm-security/` | Pattern-based PHI/injection |
| Human review queue | **P** | `human-review/` | Thin over governance |
| Evaluation dashboard | **S** | `evaluation.service.ts` | DEFAULT_METRICS seed |
| Sentinel AI envelopes | **H** | `lib/sentinel/aiEnvelope.ts` | Always human review |
| Frontend AI Chief UX | **I** | `src/components/ai/`, services | Product-complete; honesty labels needed |
| Provider failover | **X**/**P** | config only | Anthropic-centric client |
| CDS Hooks | **X** | — | Not implemented |
| SMART on FHIR | **X** | — | Not implemented |

---

## C. Structured CareDroid AI intents

All intents: maturity **H** (heuristic), `requiresClinicianReview: true` by contract.

| Intent | Typical use |
|--------|-------------|
| `critical_alert_assessment` | Alert prioritization support |
| `three_minute_response_plan` | 3-minute mission planning |
| `patient_intake_assist` | Intake assistance |
| `triage_recommendation` | Triage suggestion for nurse |
| `patient_summary` | Case summary draft |
| `department_routing` | Routing insight |
| `wait_time_prediction` | Wait estimate (heuristic) |
| `staff_resource_insight` | Staffing insight |
| `hospital_command_insight` | Command-center insight |
| `service_bottleneck_analysis` | Bottleneck narrative |
| `workflow_delay_analysis` | Delay analysis |
| `fallback_recommendation` | Degraded-mode suggestion |
| `three_minute_risk_projection` | Risk projection |
| `operational_root_cause_summary` | Root cause summary |
| `escalation_recommendation` | Escalation suggestion |
| `handoff_summary` | Handoff draft |
| `emergency_call_risk_summary` | Call risk summary |
| `ems_prearrival_risk_summary` | EMS pre-arrival risk |

---

## D. Tools & calculators

| Surface | Maturity | Notes |
|---------|----------|-------|
| ED copilot read tools (4) | **I** | Store/API backed |
| ED copilot mutating tools (5) | **I** | Confirm-required |
| Backend calculator executors (~22) | **I** | Deterministic |
| FE calculator utils (40+) | **I** | Pure functions |
| MVP clinical calculator registry (6) | **I** | qSOFA, HEART, Wells, GCS, NEWS2, NIHSS |
| NLU tool IDs without executor (~280) | **P** | Honesty gap — must mark unsupported |

---

## E. Knowledge & interoperability

| Capability | Maturity | Notes |
|------------|----------|-------|
| Seed medical markdown (4) | **P** | Insufficient for specialty coverage |
| Governed evidence registry | **X** | Phase 1 |
| Pinecone production index | **P** | Env-dependent |
| NEMSIS subset inbound | **P** | Not full schema |
| FHIR minimal Bundle out | **P** | Not US Core |
| HL7 v2 wire | **X** | Label only |
| CDS Hooks | **X** | — |

---

## F. UI honesty requirements (pre-pilot)

Surfaces that must **not** imply measured foundation-model quality until eval harness exists:

1. Evaluation / transparency dashboards using seed aggregates  
2. Edge ambulance / deterioration confidence displays  
3. NLU accuracy 100% messaging  
4. “Multi-provider AI” marketing if only Anthropic is wired  

---

## G. Change control

Update this matrix only with a version bump (`v1.1`, `v2.0`) when:

- A service status changes (future → active), or  
- A measured eval series replaces a seed, or  
- A provider adapter is actually wired and tested.
