# Routes & pages

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 16

### Dispatch

Capture emergency signals, triage 911 calls, and dispatch EMS within the 3-minute response window. Owner: Dispatcher.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/dispatch`
- **Help topic:** `dispatcher`
- **Roles:** `ed_manager`, `charge_nurse`
- **Workflows:** `pre-arrival`

### EMS Pipeline

Coordinate inbound EMS, pre-arrival packets, offload pressure, and EMS-to-ED handoffs. Owner: EMS coordinator.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/ems`
- **Help topic:** `ems`
- **Roles:** `charge_nurse`, `ed_manager`
- **Workflows:** `pre-arrival`

### ED Readiness

Prepare rooms, staff, equipment, and specialty teams before patient arrival. Owner: Charge nurse.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/ed-readiness`
- **Help topic:** `ems-readiness`
- **Roles:** `charge_nurse`, `ed_manager`
- **Workflows:** `pre-arrival`

### Reception

Register arrivals, verify identity, capture complaint, and hand off to triage. Owner: Registration clerk.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/reception`
- **Help topic:** `reception`
- **Roles:** `registration_clerk`, `charge_nurse`
- **Workflows:** `arrival-intake`

### Hospital Command Center

Real-time ED operational awareness — occupancy, waits, staff, EMS, bottlenecks, alerts, AI recommendations, and 3-minute compliance in one picture. Owner: ED manager.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/command-center`
- **Help topic:** `command-center`
- **Roles:** `admin`, `physician`, `charge_nurse`, `ed_manager`
- **Workflows:** `journey-orchestration`

### Whiteboard

Department flow, who-next, patient cards, capacity, and reassessment signals. Owner: Charge nurse.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/whiteboard`
- **Help topic:** `whiteboard`
- **Roles:** `physician`, `charge_nurse`, `triage_nurse`
- **Workflows:** `clinical-action`

### Triage

Acuity assignment, vitals, red flags, AI triage support, and clinician override. Owner: Triage nurse.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/triage`
- **Help topic:** `triage`
- **Roles:** `triage_nurse`, `charge_nurse`
- **Workflows:** `triage-assessment`

### Alerts

Critical alert acknowledgement, escalation, and 3-minute response compliance. Owner: Assigned clinician.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/alerts`
- **Help topic:** `alerts`
- **Roles:** `physician`, `charge_nurse`, `triage_nurse`, `ed_manager`
- **Workflows:** `critical-alerts`

### Diagnostics

Coordinate lab, imaging, ECG, pharmacy review, and consult orders. Owner: Physician.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/diagnostics`
- **Help topic:** `diagnostics`
- **Roles:** `physician`, `charge_nurse`
- **Workflows:** `diagnostics-treatment`

### AI Chief

Case-aware AI recommendations for triage, routing, and clinical next steps. Owner: Clinician.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/ai-chief`
- **Help topic:** `copilot`
- **Roles:** `physician`, `charge_nurse`, `triage_nurse`
- **Workflows:** `ai-journey`

### Referrals

Consult, transfer, admission, and disposition coordination. Owner: Physician.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/referrals`
- **Help topic:** `referrals`
- **Roles:** `physician`, `charge_nurse`
- **Workflows:** `disposition-handoff`

### Handoffs

Structured EMS, admission, transfer, and discharge handoff readiness. Owner: Charge nurse.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/handoffs`
- **Help topic:** `handoffs`
- **Roles:** `charge_nurse`, `physician`
- **Workflows:** `disposition-handoff`

### Capacity

Room pressure, boarding load, bed availability, and flow bottlenecks. Owner: Patient flow coordinator.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/departments`
- **Help topic:** `capacity`
- **Roles:** `charge_nurse`, `ed_manager`
- **Workflows:** `disposition-handoff`

### Analytics

Wait time, triage time, throughput, occupancy, and operational KPIs. Owner: ED manager.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/analytics`
- **Help topic:** `analytics`
- **Roles:** `admin`, `ed_manager`
- **Workflows:** `reporting-analytics`

### Reports

Response compliance, bottleneck outcomes, and exportable operational summaries. Owner: Quality safety officer.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/reports`
- **Help topic:** `reports`
- **Roles:** `admin`, `ed_manager`
- **Workflows:** `reporting-analytics`

### Settings

Hospital configuration, roles, thresholds, AI safety, and notification rules. Owner: IT administrator.

- **Source:** `caredroidPageArchitecture.config.ts`
- **Route:** `/emergency/settings`
- **Help topic:** `settings`
- **Roles:** `admin`, `ed_manager`
- **Workflows:** `platform-admin`
