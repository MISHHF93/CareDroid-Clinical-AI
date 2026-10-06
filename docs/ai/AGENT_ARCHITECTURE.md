# CareDroid — Agentic AI & Autonomous Clinical Orchestration

**Document Version:** 2.2.0  
**Status:** Living Agentic Architecture Specification  
**Lead Authors:** Chief AI Architect, Principal Multi-Agent Systems Engineer  

---

## 1. Agentic Ecosystem Architecture

CareDroid utilizes specialized autonomous agents operating within bounded clinical scopes to assist frontline staff:

```mermaid
flowchart TD
    BedsideEvents[Bedside Events & Telemetry Stream] --> Dispatcher[Agent Orchestration Dispatcher]
    
    subgraph Agents["Specialized Clinical & Operational Subagents"]
        TriageAgent["Triage Copilot Agent: Vital Analysis & Flag Extraction"]
        ScribeAgent["Ambient Scribe Agent: H&P Note Structuring"]
        BedFlowAgent["Bed Flow Agent: Inpatient Boarding Bottleneck Predictor"]
        SafetyAgent["Patient Safety Agent: Drug-Allergy & Dosing Validator"]
    end

    Dispatcher --> TriageAgent
    Dispatcher --> ScribeAgent
    Dispatcher --> BedFlowAgent
    Dispatcher --> SafetyAgent

    TriageAgent --> HumanApproval["Clinician Approval & Oversight Barrier"]
    ScribeAgent --> HumanApproval
    BedFlowAgent --> HumanApproval
    SafetyAgent --> HumanApproval
```

---

## 2. Agent Operational Boundaries & Safety Interlocks

1. **Read Authority:** Agents possess broad read access across active encounters, lab results, and telemetry within the tenant enclave.
2. **Draft Authority:** Agents may create drafts (clinical notes, suggested acuity tiers, recommended bed allocations).
3. **Zero Autonomous Commit:** No agent may execute a mutating clinical order, administer medications, or discharge a patient without explicit human clinician biometric or cryptographic approval.

---

