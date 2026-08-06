# Phase 3: Orphaned/Dead Code Inventory

> Generated from full import graph audit across entire codebase.

---

## Orphaned Components (12 total)

### Category A: REMOVABLE — Dead code, no production imports, no value

| # | File | Lines | Reason |
|---|------|-------|--------|
| 1 | `DuplicatePatientBanner.tsx` + `.css` | ~120 | Zero production imports. Only string refs in registries/docs. |
| 2 | `EmsPreArrivalPanel.tsx` + `.css` | ~180 | Zero production imports. Only string refs in emptyStateRegistry, docs. |
| 3 | `IntakeArtifactPicker.tsx` + `.css` | ~150 | Zero production imports. Self-defines only. |
| 4 | `ReceptionEmbeddedCalculator.tsx` + `.css` | ~100 | Zero production imports. Docs only. |
| 5 | `ReceptionPatientAnswersPanel.tsx` + `.css` | ~130 | Zero production imports. String refs in cleanup configs. |
| 6 | `ReceptionSearchHint.tsx` + `.css` | ~80 | Zero production imports. Also has BROKEN CSS syntax. |
| 7 | `ReceptionThroughputAttentionCluster.tsx` + `.css` | ~160 | Zero production imports. String refs only. |
| 8 | `ReceptionWorkQueues.tsx` + `.css` | ~200 | Zero production imports. Superseded by ReceptionOperationalRail. |
| 9 | `TriageRuleBuilder.tsx` + `.css` | ~220 | Zero production imports. String refs in cleanup configs. |
| 10 | `VoiceInterviewKiosk.tsx` + `.css` | ~250 | Zero production imports. Docs only. |

### Category B: TEST-ONLY — Has test but no production import

| # | File | Lines | Reason |
|---|------|-------|--------|
| 11 | `ReceptionQuickIntake.tsx` + `.css` + `.smoke.test.tsx` | ~200 | Only imported by its own smoke test. Superseded by UnifiedIntakePanel. |

### Category C: EFFECTIVELY ORPHANED (transitive) — Only imported by other orphaned code

| # | File | Lines | Reason |
|---|------|-------|--------|
| 12 | `RecentArrivalsPanel.tsx` + `.css` | ~140 | Only imported by ReceptionWorkQueues (itself orphaned). |

**Total dead code: ~1,930 lines across 12 components + 12 CSS files**

---

## Reusable Components (7 production-imported)

| # | Component | Imported By | Verdict |
|---|-----------|-------------|---------|
| 1 | `AiTriageAssistPanel` | PatientDetailPanel, ReceptionWorkQueues (orphaned), emergency index | Keep — used in PatientDetailPanel |
| 2 | `ArrivalControlBadge` | RecentArrivalsPanel (orphaned), ReceptionWorkQueues (orphaned) | Effectively orphaned — both importers are dead |
| 3 | `HighRiskComplaintFlagBadge` | PatientCard, WaitingRoomSafetyBoard, multiple reception | Keep — core clinical badge |
| 4 | `HighRiskComplaintFlagSelector` | ReceptionQuickIntake (test-only) | Effectively orphaned — only importer is test-only |
| 5 | `ReceptionAlertRail` | ReceptionThroughputAttentionCluster (orphaned) | Effectively orphaned — only importer is dead |
| 6 | `ReceptionQueueBadgeStack` | ReceptionWorkQueues (orphaned) | Effectively orphaned — only importer is dead |
| 7 | `SelfCheckin` | SelfArrivalCheckIn page | Keep — active page component |

### Revised Orphaned List (including transitive orphans)

Adding these 5 to the orphaned list:

| # | File | Revised Reason |
|---|------|----------------|
| 13 | `ArrivalControlBadge.tsx` + `.css` | Both importers (RecentArrivalsPanel, ReceptionWorkQueues) are orphaned |
| 14 | `HighRiskComplaintFlagSelector.tsx` + `.css` | Only importer (ReceptionQuickIntake) is test-only |
| 15 | `ReceptionAlertRail.tsx` + `.css` | Only importer (ReceptionThroughputAttentionCluster) is orphaned |
| 16 | `ReceptionQueueBadgeStack.tsx` + `.css` | Only importer (ReceptionWorkQueues) is orphaned |
| 17 | `AiTriageAssistPanel.tsx` + `.css` | Keep — also imported by PatientDetailPanel (active). But reception-specific mock-only usage should be flagged. |

**Final: 16 orphaned components + 16 CSS files = ~2,600 lines removable**

---

## Reconnection Candidates

| Component | Could Be Reconnected To | Priority |
|-----------|------------------------|----------|
| `RecentArrivalsPanel` | ReceptionWorkspace supportingContext zone (replaces static queue list) | Medium |
| `ReceptionWorkQueues` | ReceptionWorkspace — but superseded by ReceptionOperationalRail | Low (superseded) |
| `ReceptionAlertRail` | Could be integrated into escalation attention strip | Low |

---

## Backend Dead Code

| Item | Location | Status |
|------|----------|--------|
| `workflow_action_logs` in-memory buffer | emergency-os.services.ts | Active but NOT persisted — data lost on restart. Should be persisted to DB or replaced with proper audit logging. |
| `ReceptionWorkspaceService` | emergency-os.services.ts:1448-1546 | Active — serves 2 endpoints. No RBAC guard. |

---

## CSS Dead Code

| File | Status |
|------|--------|
| 16 orphaned component CSS files | Safe to remove |
| `ReceptionSearchHint.css` | Safe to remove (broken syntax + orphaned) |
| Global CSS files | All connected — no removal candidates |

---

## Actions Taken

### Immediate (Phase 3)
- [x] Full orphan inventory complete
- [ ] Remove 16 orphaned components + 16 CSS files (~2,600 lines)
- [ ] Remove dead string references in registries/docs
- [ ] Fix ReceptionSearchHint.css broken syntax (if keeping for reconnection)

### Deferred (Phase 6-8)
- [ ] Reconnect RecentArrivalsPanel to ReceptionWorkspace
- [ ] Evaluate ReceptionAlertRail for escalation strip integration
