# Reception Desk — Pilot Handoff Package

**Audience:** pilot engineers, ED super-users, implementation leads  
**Scope:** Registration clerk desk + user profile + skills + backend contracts  
**Status:** Handoff-ready pilot slice (single Nest instance + FE)

---

## 1. What you are receiving

A **front-door ED registration system**:

| Piece | Path / surface |
|-------|----------------|
| Desk UI | `/emergency/reception` → `ReceptionWorkspace.tsx` |
| Job profile | `src/config/receptionUserProfile.ts` |
| Executable skills + next-best-action | `src/config/receptionSkillModel.ts` |
| Runtime merge | `src/hooks/useReceptionDeskUi.ts` |
| Account Profile card | `ReceptionJobProfileCard` on `/profile` |
| Clerk guide | `docs/users/reception-guide.md` |
| Health report | `docs/reception-upgrade/RECEPTION_HEALTH_REPORT.md` |

**Enforcement** (can/cannot create patient, triage, etc.) is **only** `emergencyRolePermissions` / permission registry.  
**Skills/profile** shape UX (lookup, NBA, density) — they do not replace RBAC.

---

## 2. Login & role

| Role | Emergency role id | Default landing |
|------|-------------------|-----------------|
| Registration clerk | `registration_clerk` | `/emergency/reception` |
| Emergency receptionist (alias) | normalizes to clerk | same |

**Clerk may:** create patient, edit demographics, create encounter, verify intake, convert EMS, escalate.  
**Clerk may not:** assign triage acuity, write clinical vitals/notes as triage authority, discharge, manage capacity.

---

## 3. Golden path (click-by-click)

1. Sign in as registration clerk → open **Reception**.
2. **Find patient first** — search name / DOB / health card.
3. If no match → **New walk-in** (or Ctrl/Cmd+N).
4. Capture **chief complaint** + identity; set **language / interpreter** on the first screen.
5. Optional: **Scan / upload document** → review confidence → **Accept & fill form**.
6. If high-confidence duplicate → choose **Use this chart** or **Create new chart anyway**.
7. **Create patient & route to triage** → toast + patient on **Waiting for nurse** (or verification if provisional).
8. **Escalate** when needed → toast lists Triage · Charge; backend `POST /api/emergency/reception/escalation`.
9. End of shift → **What to do next** / shift clearance → record handoff note.
10. Open **Profile** → see **Reception job profile** + desk skills + Open reception desk.

**Crash path:** red flags / critical → **Send unknown / crash** or Other arrivals → Patient unknown.

### Prompt → open pages & tools (Reception Copilot)

Type natural open/show/launch phrases in **Reception Copilot** (Interactive AI). CareDroid matches a **closed catalog** only — the model cannot invent URLs.

| Example prompt | What happens |
|----------------|--------------|
| `Open reception desk` | Action card → **Open** → navigate to `/emergency/reception` |
| `Focus patient lookup` | **Open** → focuses lookup field (`open-reception-lookup`) |
| `Show OCR document scan` | **Open** → smart intake / OCR (`open-reception-smart-intake`) |
| `Open shift clearance` | **Open** → shift clearance panel |
| `Open the whiteboard` | **Open** → ED whiteboard |
| `What is ESI 2?` | Text assist only (no navigation) |

**Safety:** Approve/Open is required for the action. Clinical calculators (HEART, qSOFA, NIHSS) are blocked for `registration_clerk`. Implementation: `src/services/interactiveAi/promptNavigationIntent.ts` + `InteractiveAIWorkspace` execute path.

---

## 4. API contract (Nest `/api/emergency`)

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| GET | `/patients` | READ_PHI | List board patients |
| POST | `/patients` | WRITE_PHI | Create patient |
| POST | `/intake` | WRITE_PHI | Create from intake (same board) |
| GET | `/reception/snapshot` | READ_PHI | Desk metrics snapshot |
| POST | `/reception/handoff` | WRITE_PHI | Move to triage |
| POST | `/reception/escalation` | WRITE_PHI | Durable escalation + realtime |
| POST | `/intake/ocr-jobs` | WRITE_PHI | Start OCR |
| POST | `/intake/ocr-jobs/:id/fields/:field/review` | WRITE_PHI | Accept/edit/reject field |
| POST | `/intake/ocr-jobs/:id/apply` | WRITE_PHI | Apply reviewed demographics |

**Capabilities** (`src/config/backendApiCapabilities.ts`):  
`emergencyPatients`, `emergencySmartIntake`, `emergencyReceptionSnapshot`, `emergencyReceptionHandoff`, `emergencyReceptionEscalation`, `emergencyOcrIntake` → **REAL**.

### Board durability

- On Nest boot, `EmergencyPatientService` **rehydrates** patients (and open alerts) from TypeORM when rows exist.
- Empty DB → fixture seed + write-through seed for future restarts.
- **OCR jobs** are still **process-local** (lost on restart) — known limit.

---

## 5. Environment

| Variable | Purpose |
|----------|---------|
| `OCR_PROVIDER` | OCR backend (`tesseract` default / mock) |
| JWT auth | Required on emergency routes |
| DB (SQLite/Postgres) | TypeORM patients/alerts write-through + rehydrate |

---

## 6. Verification commands

```bash
# Frontend
npx tsc --noEmit -p tsconfig.json
npx vitest run src/config/receptionUserProfile.test.ts src/config/receptionSkillModel.test.ts src/services/receptionIntakeOrchestrator.test.ts src/pages/emergency/ReceptionWorkspace.test.tsx

# Backend
cd backend
npx tsc --noEmit -p tsconfig.json
npx jest src/modules/emergency-os/ocr-intake.service.spec.ts --no-coverage

# Live patient-journey performance (Nest must be on :3350)
# npm run dev:api   # or start:prod on PORT=3350
npm run test:patient-journey-perf
# Reports: qa/patient-journey-performance-report.md (+ .json)
```

---

## 7. Known limits (do not paper over)

1. OCR job store is in-memory (not multi-instance durable).  
2. Demo “volunteer greeter” archetype empties **skills**; hard RBAC split still uses registration_clerk unless org mapping adds a separate role.  
3. Multi-pod: each Nest process has its own memory until all reads are DB-authoritative.  
4. Identity session / enterprise MPI (`emergencySmartIntakeIdentitySession`) remains DISABLED.  
5. Playwright full-browser golden path may be blocked in some CI/sandbox environments.

---

## 8. Source map (for maintainers)

```
Profile (account)
  └─ ReceptionJobProfileCard ← receptionUserProfile + receptionSkillModel

Desk
  └─ useReceptionDeskUi ← profile + persona + desk UI model
       └─ ReceptionWorkspace
            ├─ ReceptionSkillStrip (NBA)
            ├─ ReceptionPatientLookup
            ├─ UnifiedIntakePanel (+ OCR capture)
            ├─ ReceptionDuplicateConfirm
            ├─ ReceptionShiftClearance
            └─ Escalation → store + postReceptionEscalation
```

---

## 9. Handoff acceptance sign-off

| Check | Owner | Pass |
|-------|-------|------|
| Clerk lands on reception | | ☐ |
| Lookup → create → route works | | ☐ |
| Language on first screen | | ☐ |
| OCR accept fills form | | ☐ |
| Duplicate modal works | | ☐ |
| Escalation toast + API | | ☐ |
| Profile shows job skills | | ☐ |
| FE+BE tsc clean | | ☐ |
| Known limits reviewed | | ☐ |

**Pilot off when all boxes checked and known limits accepted by pilot lead.**
