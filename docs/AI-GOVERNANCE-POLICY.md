# CareDroid Emergency OS - AI Governance Policy

## 1. Purpose

This policy establishes the framework for safe, ethical, and compliant use of artificial intelligence within CareDroid Emergency OS. All AI features must adhere to:

- NIST AI Risk Management Framework
- WHO Ethical Guidelines for AI in Healthcare
- HIPAA Security Rule (45 CFR §164.308)
- FDA Software as a Medical Device (SaMD) framework

## 2. AI Services Inventory

| Service | Purpose | Risk Level | Human Review Required |
|---|---|---|---|
| ED Copilot | Operational assistant | Low | Yes |
| Smart Handover | Clinical summaries | Medium | Yes |
| Protocol Trigger | Deterioration detection | High | No, rule-based |
| Deterioration Prediction | Advance warning | Medium | Yes |
| Discharge Prediction | Readiness scoring | Low | Yes |
| Admission Prediction (START-AI) | Bed coordination | Medium | Yes |
| Triage Support | Acuity recommendations | High | Yes |
| Ambient Documentation | SOAP note generation | Medium | Yes |
| Text Mining | Entity extraction | Low | No |
| MoH Patient Matching | Identity verification | High | Yes |

## 3. Safety Rules

The following safety rules are enforced programmatically, not only documented.

### 3.1 Cannot Lower Priority For

- DPS 1 or DPS 2 patients
- Patients with active stroke protocol
- Patients with active sepsis protocol
- Patients with active chest pain protocol
- Patients with abnormal vitals: HR > 120, BP < 90/60, O2 < 92, RR > 24

### 3.2 Required Disclaimers

All generative AI outputs must include:

- "Human review required"
- "Not a replacement for clinical judgment"
- "AI-generated content - verify before acting"

### 3.3 Rate Limits By Role

| Role | Requests Per Minute |
|---|---:|
| Physician | 60 |
| Charge Nurse | 45 |
| Nurse | 30 |
| EMS | 20 |
| Clerk | 10 |

## 4. Audit Requirements

All AI interactions are logged with:

- Timestamp
- User ID and role
- Service name
- Input and output
- Safety check result
- Human review status
- Latency
- Cost where available

Retention period: 7 years, aligned to medical record retention expectations.

## 5. Human Review Requirements

| Service | Review Required By | Review Window |
|---|---|---|
| Smart Handover | Receiving clinician | Before patient handoff |
| Triage Support | Triage nurse | Before acuity assignment |
| Ambient Documentation | Attending physician | Within 24 hours |
| Deterioration Prediction | Primary nurse | Within 15 minutes |
| MoH Patient Matching | Registration clerk | Before record creation |

## 6. Prohibited Use Cases

The following are strictly prohibited:

- Autonomous clinical decision-making
- Patient diagnosis without human oversight
- Medication recommendations without physician review
- Treatment planning without physician review
- Lowering priority based on AI alone
- Autonomous identity matching or patient merge
- Autonomous external health record import

## 7. Incident Response

Any safety violation triggers:

1. Immediate logging to audit trail
2. Notification to clinical leadership
3. Review within 24 hours
4. Corrective action if needed

## 8. Model Validation Schedule

| Model | Validation Frequency | Last Validated |
|---|---|---|
| Deterioration Prediction | Monthly | 2026-05-15 |
| Admission Prediction | Quarterly | 2026-04-01 |
| Triage Support | Monthly | 2026-05-20 |
| Text Mining | Semi-annually | 2026-01-10 |

## 9. Compliance Reporting

Quarterly reports are provided to:

- Hospital AI Committee
- Quality and Safety Board
- Compliance Officer
- Privacy Officer

## 10. Policy Owner

Responsible Department: Clinical Informatics  
Contact: ai-governance@caredroid.com  
Effective Date: 2026-06-12  
Review Date: 2026-12-12
