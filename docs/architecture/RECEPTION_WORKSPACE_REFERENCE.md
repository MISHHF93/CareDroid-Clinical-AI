# Reception Workspace — Reference Implementation

This document captures the architectural patterns of the Reception workspace as the canonical template for all role workspaces in the CareDroid ED OS.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  Route: /emergency/reception                            │
│  → <ReceptionWorkspace />                               │
├─────────────────────────────────────────────────────────┤
│  Screen Mode: RECEPTION_SCREEN                          │
│  → 18 visible widgets, 10 available actions             │
│  → useMinimalAppChrome: true                            │
├─────────────────────────────────────────────────────────┤
│  Role: registration_clerk                               │
│  → Cluster B (Reception & Intake)                       │
│  → 7 permissions, 7 nav items                           │
├─────────────────────────────────────────────────────────┤
│  KPIs: 10 reception-specific metrics                    │
│  → arrivals-today, awaiting-triage, queue-size, etc.    │
├─────────────────────────────────────────────────────────┤
│  Services: receptionIntakeOrchestrator,                 │
│  receptionEscalationWorkflow, receptionHandoff          │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── pages/emergency/
│   ├── ReceptionWorkspace.tsx          # Main page (865 lines)
│   ├── ReceptionWorkspace.css
│   ├── ReceptionPipelineShell.tsx      # Stage-based pipeline rail
│   └── ReceptionPipelineShell.css
├── components/reception/
│   ├── ReceptionDeskToolbar.tsx        # Primary action toolbar
│   ├── ReceptionOperationalRail.tsx    # Right-side queue list
│   ├── ReceptionOperationalStrip.tsx   # Horizontal KPI strip
│   ├── UnifiedIntakePanel.tsx          # Full intake form
│   ├── ReceptionSmartIntakeOverlay.tsx # AI-assisted intake modal
│   ├── SelfCheckin.tsx                 # Patient self-check-in
│   ├── PreparePatientChooser.tsx       # Arrival type chooser
│   ├── ReceptionEscalationPanel.tsx    # Escalation dialog
│   ├── ReceptionEscalationQuickActions.tsx
│   ├── ReceptionEscalationAttentionStrip.tsx
│   ├── ReceptionJourneyTimeline.tsx    # Visual pipeline
│   ├── HighRiskComplaintFlagBadge.tsx
│   ├── AiTriageAssistPanel.tsx
│   ├── receptionQueueModel.ts          # Queue filtering/sorting
│   ├── receptionCopy.ts                # All UI text
│   └── receptionAlertRailModel.ts      # Alert rail data
├── hooks/
│   ├── useReceptionScreen.ts           # Screen capabilities
│   ├── useReceptionDeskUi.ts           # Desk UI mode
│   └── useReceptionPinnedActions.ts    # Pinned queue tab
├── services/
│   ├── receptionIntakeOrchestrator.ts  # Core intake logic
│   ├── receptionIntakeBridge.ts        # Backend bridge
│   ├── receptionEscalationWorkflow.ts  # Escalation logic
│   ├── receptionHandoff.ts             # Triage handoff
│   ├── receptionQuickIntakeService.ts  # Fast walk-in
│   ├── receptionThroughputModel.ts     # Timing models
│   └── receptionPatientAnswersModel.ts
├── config/
│   ├── receptionScreenModel.ts         # Widget/action mapping
│   ├── receptionDeskUi.config.ts       # Desk UI flags
│   ├── receptionDeskUiModel.ts         # Desk UI state
│   ├── receptionFirstUx.config.ts      # Reception-first UX
│   └── receptionTrainingAuditModel.ts  # Training audit
├── utils/
│   ├── receptionQueueRowModel.ts       # Queue row rendering
│   └── receptionQueryParams.ts         # URL param parsing
└── styles/
    └── reception-desk-theme.css        # CSS theme
```

## Key Patterns

### 1. Page Component Pattern
```tsx
export default function ReceptionWorkspace() {
  // 1. Hook into role permissions
  const emergencyRole = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();
  
  // 2. Hook into store (only what's needed)
  const patients = useEmergencyStore((s) => s.patients);
  const alerts = useEmergencyStore((s) => s.alerts);
  const capacity = useEmergencyStore((s) => s.capacity);
  
  // 3. Resolve screen capabilities
  const capabilities = useMemo(
    () => resolveReceptionScreenCapabilities({ screenMode, can: emergencyRole.can, ... }),
    [emergencyRole]
  );
  
  // 4. Local UI state (not duplicated in store)
  const [draft, setDraft] = useState<ReceptionIntakeDraft>(EMPTY_DRAFT);
  const [showChooser, setShowChooser] = useState(false);
  
  // 5. Render layout
  return (
    <EmergencyRoutePage>
      <WorkspaceHeader ... />
      <ReceptionOperationalStrip ... />
      <div className="reception-workspace__body">
        <ReceptionDeskToolbar ... />
        <UnifiedIntakePanel ... />
        <ReceptionOperationalRail ... />
      </div>
      <ReceptionEscalationPanel ... />
    </EmergencyRoutePage>
  );
}
```

### 2. Capability Resolution Pattern
```tsx
// Config maps screen mode + role permissions to capabilities
const capabilities = resolveReceptionScreenCapabilities({
  screenMode,
  can: emergencyRole.can,
  presentAction: emergencyRole.presentAction,
  role: emergencyRole.role,
  roleLabel: emergencyRole.roleLabel,
});

// Capabilities control:
// - Which widgets are visible
// - Which actions are available
// - Which UI surfaces are shown/hidden
```

### 3. KPI Resolution Pattern
```tsx
// emergencyScreenKpiPolicy.ts defines reception-specific KPIs
const RECEPTION_KPIS: EmergencyScreenKpiId[] = [
  'arrivals-today',
  'awaiting-verification',
  'awaiting-triage',
  'longest-untriaged-wait',
  'triage-breach-approaching',
  'triage-breached',
  'rapid-review-flags',
  'queue-size',
  'ems-inbound',
  'crowd-level',
];

// KPIs map to operational strip metrics
const RECEPTION_STRIP_MAP = {
  'longest-untriaged-wait': 'door-to-triage',
  'arrivals-today': 'arrivals-today',
  // ...
};
```

### 4. Service Orchestration Pattern
```tsx
// Services are pure functions, not classes
import { 
  createPatientAndRouteFromReception,
  detectReceptionRedFlags,
  runReceptionAiIntakeAssist,
} from '../../services/receptionIntakeOrchestrator';

// Services compose store state + draft data
const result = createPatientAndRouteFromReception(draft, {
  patients,
  emergencyRole,
  screenMode,
});

// Services return results, never mutate store directly
// Store mutations happen via useEmergencyStore actions
```

### 5. Escalation Pattern
```tsx
// Escalation is a separate workflow, not inline
import { 
  type ReceptionEscalationInput,
  type ReceptionEscalationReasonId,
} from '../../services/receptionEscalationWorkflow';

// Quick actions for common escalations
<ReceptionEscalationQuickActions onEscalate={handleEscalate} />

// Full dialog for complex escalations
<ReceptionEscalationPanel
  open={escalationDialogOpen}
  reasonId={escalationReasonId}
  patient={selectedPatient}
  onSubmit={handleEscalationSubmit}
  onClose={() => setEscalationDialogOpen(false)}
/>
```

### 6. Handoff Pattern
```tsx
// Reception hands off to triage via:
// 1. Patient state transition (Registration → Waiting)
// 2. Queue assignment
// 3. Optional escalation flag

import { completeProvisionalIntake } from '../../services/provisionalIdentityIntake';
import { notifyWorkflowHandoffComplete } from '../../services/workflowNavigationFeedback';

const handleHandoff = async (patient: Patient) => {
  await completeProvisionalIntake(patient.id);
  notifyWorkflowHandoffComplete('reception-to-triage', patient.id);
};
```

## Role Permissions

| Action | Permission |
|--------|------------|
| Create patient | `patient.create` |
| Edit demographics | `patient.demographics.edit` |
| Create encounter | `encounter.create` |
| Verify identity | `intake.verify` |
| Convert EMS arrival | `ems.convertArrival` |
| Escalate to triage | `reception.escalate` |
| Screen access | `screen.registration` |

## Navigation

| Order | Nav Item | Route |
|-------|----------|-------|
| 1 | reception | /emergency/reception |
| 2 | patients | /emergency/patients |
| 3 | pulse | /emergency/pulse |
| 4 | shift | /emergency/shift |
| 5 | alerts | /emergency/alerts |
| 6 | collaboration | /emergency/collaboration |
| 7 | help | /emergency/help |

## Design Principles

1. **Reception-first UX**: Front desk is the default entry experience
2. **Minimal chrome**: `useMinimalAppChrome: true`, layout tier: minimal
3. **Fast workflow**: Design pattern: `'simple-fast'`
4. **Clear escalation**: One-tap escalation buttons, separate escalation dialog
5. **Queue visibility**: Operational rail shows real-time queue status
6. **AI assist**: Smart intake overlay for identity verification
7. **Training audit**: 5-minute rule compliance tracking
