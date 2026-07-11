# CareDroid AI Assurance Engineering Report v1

| Field | Value |
|-------|--------|
| **Document ID** | `AI_ASSURANCE_ENGINEERING_REPORT_v1` |
| **Version** | `1.0.0` |
| **Date** | `2026-07-11` |
| **Program** | Professor Mode — AI Discovery, Knowledge Expansion, Training & Controlled Upgrade |
| **Scope** | PR-1 through PR-11 (documentation, harnesses, architecture; **no foundation-model fine-tuning**) |

---

## 1. Executive summary

CareDroid now has a **traceable, human-governed AI control plane**:

1. **Honest baseline** of what is live vs heuristic vs seed/demo  
2. **Governed knowledge registry** with hash/license gates  
3. **Single LLM egress** with PHI minimize, multi-provider adapters, kill switch  
4. **Offline safety eval gate** (35 synthetic cases) as promotion blocker  
5. **Hybrid RAG** + citation entailment grounding  
6. **Response provenance contract** on structured AI + chat composers  
7. **Tool capability honesty** (no fake server execute success)  
8. **UI maturity labels** (heuristic / seed / RAG-grounded / …)  
9. **Model registry** + shadow/canary flags + rollback runbooks  

**Not done (by design):** training Claude/GPT on CareDroid data; claiming FDA SaMD clearance; full CDS Hooks / SMART EHR; live LLM-judge clinical quality scores as sole promotion metric.

---

## 2. Original architecture (as discovered)

```
UI (Copilot / Chat / AI Chief)
  ├─ Structured: POST /api/ai/node → careDroidAI heuristics (18 intents)
  ├─ Conversational: ChatService → gateway → NLU/MoE → optional RAG → Anthropic → compose
  ├─ Local ML: Unified AI Node (Xenova embeddings + MLP heads)
  └─ Keyword copilot: rule/regex path
```

**Primary generation:** Anthropic `claude-sonnet-4-6`  
**Gaps found:** multi-provider docs vs Anthropic-only runtime; seeded evaluation metrics; 4-doc RAG corpus; predictive “AI” often heuristic/future; dual AI mental models.

Full snapshot: [`AI_BASELINE_REPORT_v1.md`](./AI_BASELINE_REPORT_v1.md), [`AI_CAPABILITY_MATURITY_MATRIX_v1.md`](./AI_CAPABILITY_MATURITY_MATRIX_v1.md).

---

## 3. Sources & knowledge artifacts

### Accepted (seed registry)

| Artifact | Path | Grade | Status | RAG |
|----------|------|-------|--------|-----|
| ACLS summary | `kn-acls-cardiac-arrest-v1` | summary | accepted_with_limitations | yes |
| Sepsis Hour-1 | `kn-sepsis-hour-1-v1` | summary | accepted_with_limitations | yes |
| SOFA overview | `kn-sofa-overview-v1` | summary | accepted_with_limitations | yes |
| Warfarin–aspirin | `kn-warfarin-aspirin-v1` | summary | accepted_with_limitations | yes |
| Stroke FAST + pediatric/pregnancy cautions | (3 ids) | summary | accepted_with_limitations | yes |
| FHIR R4 citation | `kn-fhir-r4-citation-v1` | N/A | accepted_with_limitations | **citation_only** |
| NEMSIS citation | `kn-nemsis-citation-v1` | N/A | accepted_with_limitations | **citation_only** |

Bodies: `data/medical-knowledge/*.md`  
Metadata: `data/knowledge-registry/artifacts/`  
Policy: `data/knowledge-registry/policy.json`  
Validate: `npm run verify:knowledge-registry`

### Rejected (illustrative)

- Community forum clinical advice (`reddit.com` denylist)  
- Promotional affiliate drug content  

Log: [`knowledge-registry/REJECTED.md`](./knowledge-registry/REJECTED.md)

**Licensing honesty:** seed texts are **CareDroid internal educational digests**, not full AHA/SSC copyrighted manuals. Do not present as universal institutional protocols.

---

## 4. Datasets created

| Dataset | Location | Use |
|---------|----------|-----|
| Offline AI eval v1 | `data/ai-eval/v1/` | Safety/contract CI (35 cases) |
| Data card | `data/ai-eval/v1/DATA_CARD.md` | Lineage / PHI / limits |
| Measured series | `qa/ai-baseline/measured-series.from-eval.json` | Baseline metrics (measured) |
| Seed metrics (do not use) | `qa/ai-baseline/seeded-evaluation-defaults.DO_NOT_USE_AS_MEASURED.json` | Demo only |

**No production chat entered any training set.**

---

## 5. Retrieval improvements (PR-5)

| Capability | Implementation |
|------------|----------------|
| Hybrid fusion | `lib/rag/hybridRetrieval.ts` — lexical TF + dense RRF-style |
| Metadata filters | jurisdiction, evidence grade, expiry, ragIngestAllowed |
| Citation entailment | `lib/rag/citationEntailment.ts` + `CitationService.groundAnswer` |
| Registry on ingest | `knowledge-registry-enrichment.ts` |

Doc: [`RAG_HYBRID_RETRIEVAL_v1.md`](./RAG_HYBRID_RETRIEVAL_v1.md)

**Limits:** not full BM25 index; not neural NLI; hybrid re-ranks dense candidates.

---

## 6. Prompts, models, egress (PR-3)

| Item | Detail |
|------|--------|
| Egress | `lib/ai/providers/egress.ts` — kill → PHI minimize → adapter → fallback |
| Adapters | anthropic, openai, azure-openai, gemini, local |
| Kill | `AI_KILL_SWITCH` / `AI_EXTERNAL_LLM_DISABLED` |
| Deploy flags | `AI_DEPLOY_MODE` shadow/canary/full (`lib/ai/deploymentFlags.ts`) |
| Doc | [`LLM_EGRESS_v1.md`](./LLM_EGRESS_v1.md) |

**Training methods used:** none for foundation LLMs. Local MLP heads remain the only trainable CareDroid models (existing pipeline).

---

## 7. Tools & workflows repaired / hardened

| Area | Change |
|------|--------|
| Unsupported tools | Honest `UNSUPPORTED_TOOL` + `describeToolCapability` + chat “not executed” |
| Aliases | Expanded executor aliases (heart, gcs, news-2, wells, …) |
| Provenance | Structured + chat responses carry contract v1 |
| UI | `AiMaturityBadge` + provenance panel on recommendation cards |
| Eval service | Seed runs labeled `seedOnly`; prefers measured harness runs |

Docs: [`TOOL_CAPABILITY_HONESTY_v1.md`](./TOOL_CAPABILITY_HONESTY_v1.md), [`RESPONSE_PROVENANCE_CONTRACT_v1.md`](./RESPONSE_PROVENANCE_CONTRACT_v1.md)

---

## 8. Clinical & adversarial evaluation

### Offline suite (`npm run ai:eval:gate`)

| Pack | Blocking |
|------|----------|
| Refusal / injection | Yes |
| Calculator parity (qSOFA oracle) | Yes |
| Protocol retrieval + citation | Yes |
| Tool selection | Yes |
| PHI leak minimize | Yes |
| Structured provenance | Yes |
| Unsupported claims | Yes |
| Missing info | Soft |

**Latest result:** 35/35 cases pass; blocking gates green (see `qa/ai-eval/results/latest.json`).

### Clinician review

Template: [`CLINICIAN_REVIEW_CHECKLIST_v1.md`](./CLINICIAN_REVIEW_CHECKLIST_v1.md) — required before clinical-facing candidate promotion beyond fixtures.

### Subgroup analysis

**Not yet measured** in v1 suite (peds/geriatric/pregnancy packs deferred). Treat as residual risk.

---

## 9. Files & services modified (high signal)

| Area | Paths |
|------|--------|
| Baseline / QA | `docs/ai/AI_BASELINE_*`, `qa/ai-baseline/`, `qa/ai-eval/` |
| Knowledge registry | `data/knowledge-registry/**`, `scripts/validate-knowledge-registry.mjs`, ingest gate |
| Egress / providers | `lib/ai/providers/**`, `lib/ai/llmTransport.ts`, `lib/ai/serverClient.ts` |
| Eval | `data/ai-eval/**`, `scripts/ai-eval-*.mjs`, `evaluation.service.ts` honesty |
| RAG | `lib/rag/**`, `retrieval.service.ts`, `citation.service.ts`, registry enrichment |
| Provenance | `lib/ai/provenanceContract.ts`, composers, `careDroidAI*` |
| Tools | `tool-orchestrator.registry.ts`, service honesty payloads |
| UI | `AiMaturityBadge.tsx`, `AIRecommendationCard.tsx` |
| Model registry | `data/model-registry/**`, `lib/ai/modelRegistry.ts`, `deploymentFlags.ts` |
| Runbooks | `docs/ai/runbooks/**` |

---

## 10. Model registry entries

See [`MODEL_REGISTRY_v1.md`](./MODEL_REGISTRY_v1.md) and `data/model-registry/entries/`.

| ID | Status |
|----|--------|
| mdl-claude-sonnet-4-6-v1 | approved |
| mdl-unified-ai-node-v1 | approved |
| mdl-caredroid-heuristic-node-v1 | approved |
| mdl-local-deterministic-v1 | approved |
| mdl-offline-eval-harness-v1 | approved |

Validate: `npm run verify:model-registry`

---

## 11. Deployment status

| Control | State |
|---------|--------|
| Default generation | Anthropic Sonnet 4.6 via egress |
| Kill switch | Env-ready (`AI_KILL_SWITCH`) |
| Shadow/canary | Env flags ready (`AI_DEPLOY_MODE`, `AI_CANARY_PERCENT`, candidate provider/model) |
| Shadow candidate log | Best-effort `[AI_SHADOW_CANDIDATE]` (non-blocking) |
| Offline CI gate | `npm run ai:eval:gate` |
| Knowledge ingest gate | Default on (`KNOWLEDGE_REGISTRY_GATE`) |

Runbooks:

- [`runbooks/ROLLBACK_AND_KILL_SWITCH.md`](./runbooks/ROLLBACK_AND_KILL_SWITCH.md)  
- [`runbooks/SHADOW_CANARY_DEPLOYMENT.md`](./runbooks/SHADOW_CANARY_DEPLOYMENT.md)  

---

## 12. Unresolved risks

| Risk | Severity | Mitigation / next |
|------|----------|-------------------|
| Tiny clinical knowledge corpus | High | Expand registry with licensed sources only |
| Offline fixtures ≠ live LLM quality | High | Optional live LLM eval pack (de-identified) under canary |
| Subgroup performance unmeasured | Medium | Eval suite v1.1 |
| PHI minimize pattern-only | Medium | Full de-id pipeline before patient-context on |
| NLU tiny test set / missing metrics file | Medium | Retrain + larger held-out (only if residual gap) |
| Dual FE/BE RBAC & legacy routes | Medium | Security review outside AI PR stream |
| Predictive/edge demos still present | Medium | Keep experimental maturity labels |
| No CDS Hooks / SMART | Low for ED-native | Explicit non-goal until ladder complete |

---

## 13. Regulatory considerations (process, not certification)

- Outputs positioned as **informational / non-device CDS** style decision support with **human review required**  
- Align practices with NIST AI RMF risk tracking, WHO health-AI human oversight themes, FDA CDS “non-device” boundaries where applicable — **no clearance claimed**  
- Jurisdiction-specific protocols must remain labeled; never universalized  
- BAA / contractual controls required before any PHI to external training APIs (currently prohibited by policy)

---

## 14. Validation evidence (commands)

```bash
npm run verify:knowledge-registry
npm run verify:model-registry
npm run ai:eval:gate
node node_modules/vitest/vitest.mjs run lib/ai lib/rag src/components/ai --reporter=dot
# backend (from backend/):
# jest tool-orchestrator.registry / citation / retrieval / evaluation specs
```

---

## 15. Rollback instructions (summary)

1. **Immediate:** `AI_KILL_SWITCH=1`  
2. **Degrade:** `AI_PROVIDER=local`  
3. **Canary abort:** `AI_DEPLOY_MODE=full`, clear candidate envs, `AI_CANARY_PERCENT=0`  
4. **Classifier:** restore prior `classifier.json` artifacts  
5. **Knowledge:** do not ingest unregistered files; re-run registry validate  

Details: rollback runbook.

---

## 16. Prioritized roadmap (post v1)

### Completed post-v1 (same day continuation)

| Item | Evidence |
|------|----------|
| Subgroup safety pack | `subgroup_safety` — peds/geriatric/pregnancy/language; gate `subgroup_min_accuracy` |
| Knowledge corpus +3 | stroke FAST, pediatric fever, pregnancy ED (7 registry artifacts) |
| Eval dashboard honesty | Seed banner + measured/seed chips on `AiEvaluationDashboard` |
| Live-local smoke | `node scripts/ai-eval-run.mjs --live-local` |
| Production monitor stub | `lib/ai/productionMonitoring.ts` (egress-wired) |

### Remaining

| Priority | Item |
|----------|------|
| P0 | Expand **externally licensed** knowledge (beyond internal summaries) |
| P0 | Full live de-identified LLM candidate scoring pack |
| P1 | Broader fairness study beyond fixtures |
| P2 | Full de-id pipeline before `AI_PATIENT_CONTEXT_ENABLED` |
| P2 | NLU retrain only if residual gap proven |
| P3 | CDS Hooks / SMART if EHR embed required |
| P3 | Prometheus export of AI monitor counters |

---

## 17. Conclusion

CareDroid is **not** an unverified model trained on indiscriminate internet content. It is a **layered clinical AI platform** with:

- governed knowledge  
- single egress + safety filters  
- deterministic calculators  
- offline safety gates  
- provenance and maturity honesty  
- model registry + kill/canary controls  

Promotion of any new model/prompt/RAG corpus **must** pass registry validation, offline eval gate, and clinical review checklist — never silent overwrite of production behavior.

---

## Document control

| Role | Responsibility |
|------|----------------|
| Engineering | Keep runbooks and gates green |
| Clinical informatics | Review maturity labels and clinical packs |
| Security/privacy | Kill switch drills; PHI egress |
| Next revision | v1.1 after live eval pack + corpus expansion |
