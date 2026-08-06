# Reception Dependency Map

> Auto-generated from full codebase audit. Maps every visible Reception element
> to its source, state, service, backend endpoint, and permission gate.

---

## 1. Page Entry Point

```
/src/pages/emergency/ReceptionWorkspace.tsx  (779 lines)
  ├─ EmergencyRoutePage (emergencyRouteShared.tsx) — zone composition shell
  │   └─ OperationalPageTemplate — 7 zones:
  │       operationalSummary | primaryActions | activeWork | supportingContext
  │       analytics | history | (children = activeWork)
  └─ CSS: ReceptionWorkspace.css, emergency-route.css, reception-desk-theme.css
```

---

## 2. Hook Chain (State Resolution)

```
ReceptionWorkspace
  ├─ useEmergencyRolePermissions()
  │     └─ emergencyStore.emergencySettings (permissionsOverrides)
  │     └─ UserContext (currentUser)
  │     └─ UserIdentityContext (operationalProfile)
  │     └─ useEmergencyDeviceContext() (deviceContextId)
  │     └─ useRouteScreenMode() → resolveEmergencyScreenMode()
  │     └─ Config: emergencyRolePermissions.ts, emergencyRoleScreenMatrix,
  │                 emergencyActionPresentationModel, demoPersonaModel,
  │                 emergencyRoleNavigationModel, canonicalAccess,
  │                 securityAccessService, demoUsers
  │
  ├─ useRouteScreenMode()
  │     └─ emergencyStore.emergencySettings
  │     └─ UserContext (currentUser)
  │     └─ URL: pathname, ?display=, ?queue=
  │     └─ useEmergencyDeviceContext()
  │     └─ Config: careDroidScreenModes.ts
  │
  ├─ useReceptionDeskUi()
  │     └─ useEmergencyRolePermissions() → role
  │     └─ useRouteScreenMode() → screenMode
  │     └─ useLocation() → isReceptionRoute check
  │     └─ receptionDeskUiModel.ts → resolveReceptionDeskUi()
  │
  ├─ useReceptionPinnedActions()
  │     └─ localStorage: careDroid.reception.pinnedActions.v1  (self-contained)
  │
  ├─ useProfileNavigate()
  │     └─ useNavigate() (React Router)
  │     └─ useEmergencyRolePermissions()
  │     └─ useEffectiveUserProfile() → saasRole
  │     └─ profileRouteLaunch.ts → navigateProfileAware()
  │
  └─ useReceptionScreen()  (imported but resolved inline via resolveReceptionScreenCapabilities)
        └─ useScreenModeCapabilities() → useRouteScreenMode() → emergencyStore
        └─ useEmergencyRolePermissions() → can, presentAction, role, roleLabel
```

---

## 3. Store Selectors (Zustand)

| Selector | Type | Purpose |
|----------|------|---------|
| `state.patients` | `Patient[]` | Full patient list; filtered to reception queue |
| `state.alerts` | `Alert[]` | Full alert list; filtered to reception-critical |
| `state.capacity` | `CapacitySnapshot` | Hospital site name for header badge |
| `state.selectedPatientId` | `string \| null` | Currently selected patient in rail |
| `state.selectPatient` | `action` | Sets selected patient |
| `state.submitReceptionEscalation` | `action` (imperative) | Builds + dispatches escalation alert |

---

## 4. Service Layer (Client-Side)

### 4a. Core Reception Services

| Service | Import Path | Purpose | Backend Connection |
|---------|-------------|---------|-------------------|
| `receptionIntakeOrchestrator` | `src/services/receptionIntakeOrchestrator.ts` (878 lines) | Full intake lifecycle: draft validation, AI triage assist, patient creation, routing | Indirect — calls `useEmergencyStore.getState().addPatient()`, then `receptionHandoff.completeReceptionHandoff()` |
| `arrivalControlLayer` | `src/services/arrivalControlLayer.ts` (487 lines) | Arrival mode derivation, queue destination, registration status, safety flags | Indirect — operates on store patient list |
| `provisionalIdentityIntake` | `src/services/provisionalIdentityIntake.ts` (230 lines) | Unknown/temporary/identity-pending patient creation | Indirect — calls `store.addPatient()`, `receptionHandoff.completeIntakeHandoff()` |
| `receptionEscalationWorkflow` | `src/services/receptionEscalationWorkflow.ts` (524 lines) | 5 escalation reasons, alert creation, notification targets | Indirect — creates alerts in store |
| `receptionHandoff` | `src/services/receptionHandoff.ts` | Patient handoff from reception → triage queue | **Direct: POST /api/emergency/reception/handoff** |
| `receptionQuickIntakeService` | `src/services/receptionQuickIntakeService.ts` | Quick intake data processing, age calculation | Indirect — used by orchestrator |
| `patientArrivalModel` | `src/services/patientArrivalModel.ts` | Arrival record construction, patient sync | Indirect — used by arrivalControlLayer |
| `triageAssist` | `src/services/triageAssist.ts` | Client-side triage scoring (buildClientTriageAssist) | No backend — purely client-side rule engine |
| `careDroidInteractionFeedback` | `src/services/careDroidInteractionFeedback.ts` | showActionError / showActionSuccess toast feedback | No backend — UI feedback only |
| `workflowNavigationFeedback` | `src/services/workflowNavigationFeedback.ts` | notifyWorkflowHandoffComplete — post-handoff navigation toast | No backend — UI feedback only |

### 4b. Supporting Services (used by components within reception)

| Service | Used By | Purpose |
|---------|---------|---------|
| `waitingRoomCommunicationLog` | `receptionEscalationWorkflow` | Communication log entries for escalation records |
| `highRiskComplaintFlags` | `arrivalControlLayer` | High-risk complaint detection and flag patching |
| `arrivalDerivations` | `arrivalControlLayer` | Queue destination, registration status, triage pending derivation |
| `intakeEncounterChain` | `arrivalControlLayer` | Arrival reason extraction from patient records |
| `queueAssignment` | `arrivalControlLayer` | Queue filter constants |

---

## 5. Backend Endpoints

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| `GET` | `/api/emergency/reception/snapshot` | `ReceptionWorkspaceService.getReceptionSnapshot()` | Returns reception workspace data: recent arrivals, waiting patients, verification queue, pre-triage, EMS inbound, queue metrics |
| `POST` | `/api/emergency/reception/handoff` | `ReceptionWorkspaceService.postReceptionHandoff()` | Completes patient handoff from reception → triage. Body: patientId, source, actorName, encounterId, arrivalReason, complaintCategory, verificationSummary, triageAssist, triageAssistGeneratedAt |
| `GET` | `/api/emergency/realtime/stream` | `EmergencyRealtimeController.stream()` | SSE stream: carries `whiteboard_snapshot`, `central_node_snapshot`, `journey_state_changed`, `patient_created`, `capacity_updated`, `ems_updated` events containing reception data |

### Backend Service Chain

```
ReceptionWorkspaceService (emergency-os.services.ts:1448-1546)
  ├─ EmergencyPatientService.movePatientToState()
  │     └─ persistPatientToDatabase() → patients table
  │     └─ realtimeService.publishBoardMutations() → SSE
  ├─ WorkflowActionLogService.record() (in-memory buffer, up to 500 entries)
  │     └─ syncToCollaborationHub() → collaboration_channels (RECEPTION dept)
  └─ No direct audit logging (workflow logs are in-memory only)
```

---

## 6. Database Entities Touched

| Table | Entity | Reception Access |
|-------|--------|-----------------|
| `patients` | `Patient` | Direct write via `movePatientToState()` on handoff. Columns: `arrival`, `registrationStatus`, `queueDestination`, `triagePending` |
| `alerts` | `Alert` | Indirect — escalation creates alerts, handoff may trigger capacity/escalation alerts |
| `collaboration_channels` | `CollaborationChannel` | `RECEPTION` department channel seeded per org. Workflow events from handoffs sync into patient threads |
| `workflow_action_logs` | (in-memory) | `record()` with `source: 'reception-workspace'`, `handoff: 'reception.handoff'`. **NOT persisted to DB** — buffered in-memory only |

---

## 7. Permission Gates (RBAC)

### Registration Clerk Role — Allowed Actions

| Action Key | Permission | Frontend Gate |
|------------|-----------|---------------|
| `createPatient` | `patientCreate` | `canCreatePatient` prop → `emergencyRole.canMutate(EMERGENCY_ACTIONS.createPatient)` |
| `editPatientDemographics` | `patientDemographicsEdit` | `receptionCapabilities.canVerifyIdentity` (via screen model) |
| `createEncounter` | `encounterCreate` | `receptionCapabilities.canCreateEncounter` |
| `verifyIntake` | `intakeVerify` | `receptionCapabilities.canVerifyIdentity` |
| `convertEmsArrival` | `emsConvertArrival` | `receptionCapabilities.canConvertEmsArrival` |
| `receptionEscalate` | `receptionEscalate` | `receptionCapabilities.canEscalateToNurse` |

### Registration Clerk Role — Denied Actions

| Action | Why Denied |
|--------|-----------|
| `triage` (assign acuity) | Clinical decision — no clinical override authority |
| `writeVitals` | Clinical data entry |
| `writeNote` | Clinical documentation |
| `dischargePatient` | Disposition decision |
| `manageCapacity` | Operational management |
| `reassignWorkload` | Staff management |

### Backend RBAC

| Config | Value |
|--------|-------|
| Role ID | `registration-clerk` |
| Asset Pack | `['core-platform', 'reception-desk']` |
| Permissions | `READ_PHI`, `WRITE_PHI` |
| Aliases | `receptionist`, `ed clerk`, `ed_clerk`, `emergency receptionist` |

---

## 8. UI Component Tree (Rendered on /emergency/reception)

```
EmergencyRoutePage
├─ Header (shared)
│   ├─ Clock
│   ├─ CentralNodeBadge
│   ├─ OperationalAlertRail
│   ├─ [Register button HIDDEN on reception route]
│   ├─ PatientSearch
│   ├─ OperationsCenterMenu
│   ├─ ProfileRoleSwitcher
│   └─ UserAccountMenu
├─ Sidebar (shared)
│   └─ Role-scoped navigation (filtered by registrationClerk permissions)
├─ OperationalSummary zone
│   ├─ Reception meta (user name, role badge, shift, site)
│   ├─ ReceptionEscalationAttentionStrip
│   └─ ReceptionEscalationQuickActions (conditional on canEscalateToNurse)
├─ PrimaryActions zone
│   └─ ReceptionDeskToolbar (3 groups: Actions, Filters, Flow Status)
├─ SupportingContext zone
│   └─ ReceptionOperationalRail (queue list, alerts, selected patient)
├─ ActiveWork zone (= children)
│   ├─ Stepper (ReceptionFlowGraphic + progress steps)
│   ├─ Guardrail banner (if clinical override blocked)
│   ├─ UnifiedIntakePanel (full intake form)
│   ├─ ContextualGuidance hint
│   ├─ Result banner (post-routepatient)
│   ├─ PreparePatientChooser (modal, conditional)
│   ├─ ReceptionSmartIntakeOverlay (overlay, conditional)
│   └─ ReceptionEscalationPanel (dialog, conditional)
```

---

## 9. CSS Dependency Chain

```
ReceptionWorkspace.css           — page grid, responsive breakpoints
emergency-route.css              — EmergencyRoutePage layout, situation brief
reception-desk-theme.css         — token overrides (--cd-accent → white)
receptionDeskToolbar.css         — toolbar 3-group layout
ReceptionOperationalRail (CSS)   — queue rail layout
UnifiedIntakePanel (CSS)         — intake form layout
ReceptionEscalationPanel.css     — escalation dialog
ReceptionSmartIntakeOverlay.css  — smart intake overlay
ReceptionSearchHint.css          — search hint (BROKEN CSS syntax line 10)
PreparePatientChooser.css        — chooser modal
ReceptionEscalationAttentionStrip.css
ReceptionEscalationQuickActions.css
ReceptionJourneyTimeline.css
ReceptionFlowGraphic (CdlGraphicKit)
ContextualGuidance (CSS)

Global overrides affecting reception:
  clinical-figma-polish.css      — !important overrides
  color-normalization.css        — wildcard (reception exclusion)
  medical-color-layer.css        — --medical-surface-page → white
  emergency-tokens.css           — --ed-surface-base → white
  clinical-page-canvas.css       — canvas background → white
  app-shell.css                  — shell bg, chrome context → white
```

---

## 10. Complete File Inventory

### Pages (4)
- `src/pages/emergency/ReceptionWorkspace.tsx`
- `src/pages/emergency/ReceptionPipelineShell.tsx`
- `src/pages/emergency/SmartIntake.tsx`
- `src/pages/emergency/SelfArrivalCheckIn.tsx`

### Components — TSX (29)
- `src/components/reception/ReceptionDeskToolbar.tsx`
- `src/components/reception/ReceptionOperationalRail.tsx`
- `src/components/reception/ReceptionEscalationPanel.tsx`
- `src/components/reception/ReceptionEscalationQuickActions.tsx`
- `src/components/reception/ReceptionEscalationAttentionStrip.tsx`
- `src/components/reception/ReceptionSmartIntakeOverlay.tsx`
- `src/components/reception/ReceptionJourneyTimeline.tsx`
- `src/components/reception/UnifiedIntakePanel.tsx`
- `src/components/reception/PreparePatientChooser.tsx`
- `src/components/reception/ReceptionWorkQueues.tsx`
- `src/components/reception/ReceptionOperationalStrip.tsx`
- `src/components/reception/ReceptionQuickIntake.tsx`
- `src/components/reception/AiTriageAssistPanel.tsx`
- `src/components/reception/ReceptionPatientAnswersPanel.tsx`
- `src/components/reception/ReceptionAlertRail.tsx`
- `src/components/reception/ReceptionSearchHint.tsx`
- `src/components/reception/ReceptionQueueBadgeStack.tsx`
- `src/components/reception/ReceptionThroughputAttentionCluster.tsx`
- `src/components/reception/RecentArrivalsPanel.tsx`
- `src/components/reception/ArrivalControlBadge.tsx`
- `src/components/reception/DuplicatePatientBanner.tsx`
- `src/components/reception/EmsPreArrivalPanel.tsx`
- `src/components/reception/HighRiskComplaintFlagBadge.tsx`
- `src/components/reception/HighRiskComplaintFlagSelector.tsx`
- `src/components/reception/IntakeArtifactPicker.tsx`
- `src/components/reception/ReceptionEmbeddedCalculator.tsx`
- `src/components/reception/SelfCheckin.tsx`
- `src/components/reception/TriageRuleBuilder.tsx`
- `src/components/reception/VoiceInterviewKiosk.tsx`

### Components — CSS (27)
All `.css` files matching `src/components/reception/*.css` (see Section 9)

### Hooks (6)
- `src/hooks/useReceptionDeskUi.ts`
- `src/hooks/useReceptionPinnedActions.ts`
- `src/hooks/useReceptionScreen.ts`
- `src/hooks/useEmergencyRolePermissions.ts`
- `src/hooks/useRouteScreenMode.ts`
- `src/hooks/useProfileNavigate.ts`

### Services (10+)
- `src/services/receptionIntakeOrchestrator.ts`
- `src/services/arrivalControlLayer.ts`
- `src/services/provisionalIdentityIntake.ts`
- `src/services/receptionEscalationWorkflow.ts`
- `src/services/receptionHandoff.ts`
- `src/services/receptionQuickIntakeService.ts`
- `src/services/patientArrivalModel.ts`
- `src/services/patientArrivalBackendSync.ts`
- `src/services/triageAssist.ts`
- `src/services/careDroidInteractionFeedback.ts`
- `src/services/workflowNavigationFeedback.ts`
- `src/services/waitingRoomCommunicationLog.ts`
- `src/services/highRiskComplaintFlags.ts`
- `src/services/arrivalDerivations.ts`

### Config (8)
- `src/config/receptionScreenModel.ts`
- `src/config/receptionFirstUx.config.ts`
- `src/config/emergencyRolePermissions.ts`
- `src/config/emergencyPermissionRegistry.ts`
- `src/config/emergencyRoleActionMatrix.ts`
- `src/config/careDroidScreenModes.ts`
- `src/config/routes.config.ts`
- `src/config/receptionScreenModel.ts`

### Store (1)
- `src/store/emergencyStore.ts` (shared — reception uses patients, alerts, capacity, selectedPatientId, selectPatient, submitReceptionEscalation)

### Types (1)
- `src/types/emergency.ts` (shared — Patient, Alert, PatientState, PatientFlag, Priority, etc.)

### Styles (13 global)
- `src/styles/reception-desk-theme.css`
- `src/styles/clinical-figma-polish.css`
- `src/styles/color-normalization.css`
- `src/styles/medical-color-layer.css`
- `src/styles/emergency-tokens.css`
- `src/styles/clinical-page-canvas.css`
- `src/styles/primitives.css`
- `src/styles/tokens.css`
- `src/styles/CCDL-SPECIFICATION.md`
- `src/styles/role-accent-theme.css`
- `src/styles/clinical-ultrawide-layer.css`
- `src/components/app-shell.css`
- `src/components/Header.css`

### Backend (6)
- `backend/src/modules/emergency-os/emergency-os.services.ts` (ReceptionWorkspaceService:1448-1546)
- `backend/src/modules/emergency-os/emergency-os.controller.ts` (2 endpoints)
- `backend/src/modules/emergency-os/emergency-os.module.ts`
- `backend/src/modules/emergency-os/emergency-os.types.ts` (PatientArrivalRecord)
- `backend/src/modules/user-profile/saas-profile.constants.ts` (registration-clerk role)
- `backend/src/modules/user-profile/saas-profile-rbac.config.ts` (reception-desk pack)
