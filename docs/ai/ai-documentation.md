# CareDroid AI Documentation

**Generated:** 2026-06-28  
**Source:** `backend/src/modules/ai*`, `backend/src/modules/medical-control-plane/`, `src/lib/ai/`, `src/data/clinicalIntentToolCatalog.ts`

**Baseline (read first):** [AI Baseline Report v1](./AI_BASELINE_REPORT_v1.md) · [Capability Maturity Matrix v1](./AI_CAPABILITY_MATURITY_MATRIX_v1.md) · [Knowledge registry](./knowledge-registry/README.md) · [Eval harness](./AI_EVAL_HARNESS_v1.md) · [Provenance](./RESPONSE_PROVENANCE_CONTRACT_v1.md) · [Model registry](./MODEL_REGISTRY_v1.md) · **[Assurance report](./AI_ASSURANCE_ENGINEERING_REPORT_v1.md)**.

---

## Core Principle

> CareDroid AI assists clinicians. It never replaces them.

Every AI output in CareDroid:
1. Is labeled with a confidence score or disclaimer
2. Requires human review before any clinical action
3. Is audit-logged with the reasoning and model used
4. Can be overridden by any clinician without justification

---

## 1. AI Architecture Overview

```
User Query (clinical text)
        │
        ▼
Medical Control Plane
├── Intent Classifier         — What type of query is this?
├── Tool Orchestrator         — Which tool should handle it?
└── Emergency Escalation      — Is this a critical pattern?
        │
        ▼
AI Gateway
├── Context Builder           — Assemble patient + department context
├── Model Router              — Select optimal LLM
├── RAG Engine                — Retrieve clinical evidence
└── Response Composer         — Format for clinical use
        │
        ▼
Clinical Response
├── Answer text
├── Confidence score
├── Evidence citations
├── Safety notice
└── Audit log entry
```

---

## 2. Intent Classification

### Purpose
Classify a clinical query to the appropriate tool category, enabling the system to route to the correct handler.

### Input
```typescript
{
  query: string;           // clinical free text
  patientContext?: object; // optional patient data
  role?: string;           // user role
}
```

### Output
```typescript
{
  intentId: string;        // matched intent profile ID
  category: string;        // tool category
  confidence: number;      // 0–1
  toolId: string;          // specific tool to invoke
  requiresHumanReview: boolean;
}
```

### How It Works
1. Pattern matching against 219 clinical intent profiles
2. ML classification for ambiguous queries
3. Emergency pattern detection (sepsis, stroke, cardiac arrest keywords)
4. Confidence threshold check — low confidence → fallback to generalist LLM

### Intent Categories
| Category | Examples |
|----------|---------|
| Emergency score | "qSOFA score", "NEWS2", "GCS calculation" |
| Cardiovascular | "HEART score", "Wells PE", "CHA2DS2-VASc" |
| Neurology | "NIHSS", "stroke pathway", "Hunt-Hess" |
| Pediatrics | "Pediatric GCS", "PECARN head injury", "Apgar" |
| Psychiatry | "PHQ-9", "Columbia suicide severity", "AUDIT-C" |
| Respiratory | "ROX index", "BODE", "A-a gradient" |
| Renal | "eGFR", "Creatinine clearance", "AKI staging" |
| Clinical workflow | "sepsis pathway", "DKA management", "ACS protocol" |
| Lab interpretation | "lactate result", "troponin rise", "ABG" |
| Drug safety | "drug interaction", "medication dose", "contraindication" |
| Guideline lookup | "antibiotics for pneumonia", "CURB-65 threshold" |

---

## 3. Tool Orchestration

### Purpose
Route classified intents to tool executors with pre-flight safety checks.

### Safety Pre-flight
Before executing any tool:
1. Verify patient context is available when required
2. Check LLM security filter (prompt injection detection)
3. Verify tool is accessible for user role
4. Check cost optimizer for routing

### Tool Tiers
| Tier | Execution | Examples |
|------|-----------|---------|
| A — Calculated | Frontend form, no LLM | SOFA, GCS, NEWS2 (92 forms) |
| B — Chat-assisted | LLM with structured seed | Wells DVT, GRACE ACS |
| C — Full AI page | Backend POST + LLM | SOFA score, drug checker, lab interpreter |
| clinical-page | LLM + RAG | Protocol lookup, antibiotic guide |

### Backend Executors (POST `/api/tools/:id/execute`)
Three backend POST executors exist:
1. **SOFA Score** (`sofa`) — calculates SOFA from organ dysfunction inputs
2. **Drug Interactions** (`drug-check`) — checks drug-drug interactions
3. **Lab Interpreter** (`lab-interp`) — interprets lab panel results

---

## 4. Emergency Escalation

### Purpose
Detect critical clinical patterns in queries and patient data, generate alerts for human review.

### Critical Patterns Detected
- Sepsis keywords in chief complaint or query
- Stroke code triggers (NIHSS ≥ threshold, "stroke", "facial droop", "arm weakness")
- Cardiac arrest patterns
- Critical vital breach (SpO2 < 90%, GCS < 8, HR > 150 or < 40)
- NEWS2 ≥ 7 (resuscitation team threshold)
- qSOFA ≥ 2 (high sepsis risk)

### Output
When a critical pattern is detected:
1. Alert generated → `clinical-alerts.service.ts`
2. Alert pushed to `emergencyStore.alerts`
3. `CriticalAlertBanner` visible on whiteboard
4. Bottleneck registry logs `severity: critical`
5. Human must acknowledge before alert clears

---

## 5. RAG Engine

### Purpose
Retrieve relevant clinical guidelines and evidence to augment LLM responses.

### Pipeline
```
Query → Embedding (text-embedding model)
      → Vector search (top-K chunks from guideline corpus)
      → Re-ranker (cross-encoder score)
      → Top-3 chunks selected
      → Injected into LLM prompt as context
      → Response includes citations
```

### Evidence Sources
- Clinical practice guidelines (ACEP, ACC, NICE, WHO)
- Drug reference databases
- Clinical scoring system documentation
- Hospital protocol library (configurable per tenant)

### Citation Format
Every RAG-backed response includes:
- Source name
- Guideline body
- Year
- Confidence level of source

---

## 6. AI Gateway (Multi-Model Router)

### Purpose
Route queries to the most appropriate and cost-effective LLM.

### Routing Logic
```
Query complexity score (cost-optimizer)
    ├── Simple (factual, calculator) → lightweight model
    ├── Medium (clinical reasoning) → mid-tier model
    └── Complex (differential, evidence synthesis) → most capable model
```

### Context Builder
Assembles the clinical context injected into every prompt:
```typescript
{
  patient: {
    age, sex, chiefComplaint,
    vitals: { HR, BP, RR, SpO2, Temp, GCS },
    flags: string[],
    activeAlerts: string[],
    news2Score: number,
    qsofaScore: number
  },
  department: {
    capacityBand: string,
    totalPatients: number,
    activeAlerts: number
  },
  role: string,
  timestamp: string
}
```

### Response Composer
Formats LLM output for clinical consumption:
- Structures as: summary → reasoning → recommendation → next steps
- Adds confidence score
- Adds evidence citations (if RAG used)
- Adds mandatory safety notice
- Formats calculator results in clinical table format

---

## 7. Native AI (On-Device)

### Components
**Frontend:** `src/components/native-ai/NativeAiCommandSuitePanel.tsx`  
**Backend:** `backend/src/modules/native-ai/`

### Features
| Feature | Description | Trigger |
|---------|-------------|---------|
| Clinical Acuity Dashboard | Patient acuity distribution + deterioration risk | Feature flag: `clinical_acuity_dashboard` |
| AI Transparency Dashboard | Model decision explanation | Feature flag: `ai_transparency_dashboard` |
| IoMT Alert Processing | Wearable device alert analysis | `wearable_iomt_processing` harness signal |
| VVT Scoring | Virtual visit triage candidates | `virtual_visit_track` harness signal |
| BRAG Forecast | 10-hour crowding forecast | `brag_forecast_10h` harness signal |

---

## 8. AI Clinical Intent Catalog (219 Profiles)

### Emergency / Critical Care
| ID | Tool | Purpose |
|----|------|---------|
| qsofa | qSOFA | Quick sepsis screening |
| sofa | SOFA Score | Organ dysfunction severity |
| news2 | NEWS2 | Early warning for deterioration |
| apache-ii | APACHE II | ICU mortality prediction |
| mews | MEWS | Early warning (Modified) |
| revised-trauma-score | Revised Trauma Score | Trauma severity |
| pews | PEWS | Pediatric early warning |

### Cardiovascular
| ID | Tool | Purpose |
|----|------|---------|
| heart-score | HEART | Chest pain risk stratification |
| timi-ua-nstemi | TIMI | ACS risk score |
| ascvd-risk | ASCVD | 10-year cardiovascular risk |
| chads2vasc | CHA₂DS₂-VASc | AF stroke risk |
| wells-pe | Wells PE | Pulmonary embolism probability |
| wells-dvt | Wells DVT | DVT probability |
| grace-acs | GRACE ACS | NSTEMI outcome risk |

### Neurology
| ID | Tool | Purpose |
|----|------|---------|
| gcs | GCS | Glasgow Coma Scale |
| nihss-summary-view | NIHSS | Stroke severity |
| hunt-hess-scale | Hunt-Hess | Subarachnoid hemorrhage |
| ich-score | ICH Score | Intracerebral hemorrhage |
| four-score | FOUR Score | Coma severity |
| modified-rankin-scale | Modified Rankin | Stroke disability |
| abcd2 | ABCD² | TIA stroke risk |

### Respiratory
| ID | Tool | Purpose |
|----|------|---------|
| curb-65 | CURB-65 | Pneumonia severity |
| psi | PSI | Pneumonia severity index |
| aa-gradient | A-a Gradient | Oxygen transfer efficiency |
| pao2-fio2-ratio | PaO₂/FiO₂ | ARDS severity |
| rox-index | ROX Index | High-flow O₂ success predictor |
| bode-index | BODE | COPD prognosis |

### Renal
| ID | Tool | Purpose |
|----|------|---------|
| egfr-ckd-epi | eGFR CKD-EPI | Kidney function |
| creatinine-clearance-cg | Creatinine Clearance | Cockcroft-Gault |
| kfre | KFRE | Kidney failure risk |
| fena | FeNa | Acute kidney injury differentiation |

### Psychiatry
| ID | Tool | Purpose |
|----|------|---------|
| phq9 | PHQ-9 | Depression screening |
| gad7 | GAD-7 | Anxiety screening |
| audit-c | AUDIT-C | Alcohol use disorder screening |
| pcl5 | PCL-5 | PTSD screening |
| columbia-suicide-severity-workflow | Columbia | Suicide risk |

---

## 9. Safety Architecture

### Rule 1: Human Superiority
Every AI recommendation is presented as a suggestion. The UI always shows:
- "Review before action" language
- Clear distinction between AI suggestion and human decision
- `ClinicalSafetyNotice` component on all AI outputs

### Rule 2: Confidence Display
Every AI output includes:
- Confidence score (0–100%)
- Model used (when appropriate)
- Evidence quality indicator

### Rule 3: Audit Trail
All AI interactions are logged:
- Query text
- Intent classified
- Tool invoked
- Response generated
- User role
- Patient context
- Timestamp
- AI model used

Stored in: `backend/src/modules/ai/entities/ai-query.entity.ts`

### Rule 4: Critical Escalation
AI-detected critical patterns always:
- Generate a clinical alert
- Are flagged for human review (`requiresHumanReview: true`)
- Cannot be auto-acted upon
- Appear in audit log with `escalation: true`

### Rule 5: Fallback Behavior
When AI is unavailable or confidence is too low:
- Response is: "AI assistance is not available. Please refer to clinical protocols."
- No partial AI output is shown
- Manual workflow is always available
- Clinical calculator forms work without AI (client-side calculation)

### Rule 6: LLM Security
Every query passes through `llm-security.module.ts`:
- Prompt injection detection
- Jailbreak pattern matching
- Medical contraindication for dangerous outputs
- Role-appropriate response filtering

---

## 10. AI Governance

### Human Review Module
`backend/src/modules/human-review/`
- Queues AI decisions above risk threshold for clinical review
- Tracks review completion
- Escalates if review not completed within SLA

### AI Governance Module
`backend/src/modules/governance/` + `backend/src/modules/platform-governance/`
- Policy rules for AI decision boundaries
- Audit trail completeness checks
- Model version tracking
- Performance monitoring

### AI Evaluation
`backend/src/modules/evaluation/`
- Accuracy benchmarks per intent category
- False positive/negative tracking
- Response quality scoring
- A/B model comparison

### AI Explainability
`backend/src/modules/clinical-intelligence/dto/explainability-audit.dto.ts`
- Every AI decision can be explained
- Reasoning chain logged
- Feature importance tracked
