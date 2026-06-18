# Arrival-to-Discharge Trace

Date: 2026-06-17

## Scope

Extends [`arrival-to-triage-trace.md`](./arrival-to-triage-trace.md) through **discharge**, documenting journey states, queue exits, and fixes verified in the Reception-First convergence pass (prompt 39).

**Canonical journey** (`engine/journeyEngine.ts`):

```text
Arrival → Registration → Triage → Waiting → Assessment → Orders → Results
  → Disposition → (Referral | Admission → Discharge)
```

---

## Stage map (post-triage)

| Stage | `PatientState` | Primary surfaces | Queue / filter |
| --- | --- | --- | --- |
| Waiting | `Waiting` | Whiteboard, queues route | `Waiting` filter |
| Assessment | `Assessment` | Patient card, detail panel | Provider filter |
| Orders / Results | `Orders`, `Results` | Clinical workflow | State filters |
| Disposition | `Disposition` | Discharge / referral actions | Discharge filter |
| Admission | `Admission` | Boarding, capacity strip | Admission filter |
| Discharge | Terminal | `dischargePatientSafely` | Removed from active queues |

---

## Key services

| Transition | Service | Notes |
| --- | --- | --- |
| Intake → Triage | `completeIntakeHandoff` → `enterTriageQueue` | Reception-first origin |
| Triage → Waiting | `enterWaitingQueue` | Staff or AI assist accept |
| Any → Disposition | `movePatientToState` | Journey engine legal check |
| Admission → Discharge | `journeyEngine` transition | **Fixed** — was blocked pre-convergence |
| Safe discharge | `dischargePatientSafely` | Clears flags, syncs queues, workflow log |

---

## UI entry points

| Action | Component | Role gate |
| --- | --- | --- |
| Move next (triage) | `PatientCard.tsx`, `PatientDetailPanel.tsx` | `triage.manage` |
| Discharge selected | `Header.tsx` | Discharge permission |
| Journey-aware card actions | `resolvePatientCardWorkflowProfile` | Role-specific |

---

## Verified fixes (prompt 39)

| Issue | Fix | Status |
| --- | --- | --- |
| `Admission → Discharge` illegal transition | `journeyEngine.ts` allows terminal discharge from admission | **Fixed** |
| Discharge left patient on board | `dischargePatientSafely` in `queueAssignment.ts` | **Fixed** |
| Card actions ignored journey | Journey-aware handlers in `PatientCard` / `PatientDetailPanel` | **Fixed** |
| Clerk reaching clinical discharge | Registration screen hides discharge control | **Pass** |

---

## End-to-end walkthrough (demo patient)

1. **Arrival** — Reception quick create or Smart Intake (`p-new`).
2. **Handoff** — `completeReceptionHandoff` → `PatientState.Triage`, pretriage queue.
3. **Triage assist** — Triage nurse accepts suggestion → `enterWaitingQueue`.
4. **Clinical flow** — Whiteboard card transitions through assessment states.
5. **Disposition** — Staff opens discharge from header or patient panel.
6. **Discharge** — `dischargePatientSafely` removes patient from active filters; workflow event recorded.

---

## Deferred / demo paths

| Path | Status |
| --- | --- |
| Backend-authoritative journey sync | Store-first; `backendApiCapabilities.js` incremental |
| Provincial MPI discharge notifications | Demo labels when capability off |
| Automated discharge without staff confirm | Not implemented (by design) |

---

## Related docs

- [`arrival-to-triage-trace.md`](./arrival-to-triage-trace.md)
- [`queue-assignment-automation.md`](./queue-assignment-automation.md)
- [`reception-first-strategy.md`](./reception-first-strategy.md)
