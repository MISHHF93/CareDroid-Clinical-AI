# Repaired / Characterized Execution Paths

## Characterized (Stage B) — no behavior change

### Reception pipeline URL contract

| Step | Location |
|------|----------|
| Deep-link keys | `receptionIntakeBridge.RECEPTION_PIPELINE_URL_CONTRACT` |
| Session build | `buildReceptionIntakeSession` |
| Test | `src/services/receptionCharacterization.test.ts` |

### EMS convert — missing arrival (no silent success)

| Step | Behavior |
|------|----------|
| Input | Unknown `arrivalId` |
| Path | `convertEmsArrivalForReception` |
| Outcome | `{ ok: false, reason: 'not_found' }` — **not** fake success |
| Test | receptionCharacterization |

### Registration clerk permission path

| Action | FE grant | Nest map (Stage D) |
|--------|----------|---------------------|
| patient.create | yes | WRITE_PHI |
| intake.verify | yes | WRITE_PHI |
| ems.convertArrival | yes | WRITE_PHI |
| settings.manage | **no** | CONFIGURE_SYSTEM not held |
| public_display create | **no** | empty Nest set |

Tests: receptionCharacterization + emergencyNestPermissionMap.test

### RBAC gap documented

| FE emergency roles | Nest UserRole |
|--------------------|---------------|
| ≥11 in ROLE_PERMISSION_GRANTS | 4 (physician/nurse/student/admin) |
| Mapping module | `src/config/emergencyNestPermissionMap.ts` |

## Repaired this session

| Path | Fix |
|------|-----|
| JWT access tokens | `buildAccessTokenClaims` → permissions + emergencyRole in `generateTokens` |
| runtime-auth | Uses JWT permissions when present; structured 401/403 envelope |
| capacity vs capacityMetrics score | Seed + setCapacity/updateCapacity sync (Stage F) |
| EMS convert missing arrival | Canonical `Result` NOT_FOUND (no silent success) |
| OCR authoritative write | FE `ocrFieldValidation` + BE `validateForAuthoritativeWrite` |
| AI provider failure | `abstainFromAiFailure` → accountable abstain (not ok fabricate) |
| API errors | `apiFailureToResultError` → ErrorCode taxonomy |
| Exception filter | Emits ErrorCode-aligned `error.code` |
| Medical Light | `medical-light-theme.css` in design-system entry |
| capacity buildCapacitySnapshot (all local recompute sites) | `applyCapacityPatch` spread into set() |
| Copilot failure path | `abstainFromAiFailure` + AccountableRecommendationCard |
| Copilot success path | `accountableFromGatewayPayload` → card UI |
| AI gateway compose | `accountableRecommendation` on every composed response |
| Reception chrome stack | hide journey/session bars on simple-fast density |
| RAG HTTP tenant contract | `tenant-isolation.http.spec.ts` |
| Experimental engines prod OFF | `shouldStartShellEngine` + env gate |
| StateSourceNotice reconnected on Capacity route | session-engine honesty |
| Display roles (public/read-only) characterized | no clinical mutations |
| Capacity WS + refreshAllData score alignment | dual counters stay equal |
| RAG retrieval tenant defense-in-depth post-filter | drops foreign org hits if backend mis-filters |
| Governance Express error envelopes | structured ErrorCode-style JSON |
| EMS handoff e2e silent (no POST when offline) | apiClient no longer short-circuits non-GET offline |
| EMS–Copilot Playwright | **3/3 green** after offline mutation fix |

## Pending repair (not yet code-complete)

| Path | Issue | Stage |
|------|-------|-------|
| JWT emergencyRole from profile | roleProfileId honored; FE must set profile id on users | D ops |
| Express governance route-by-route audit | runtime-auth on mount; residual thin GETs | D |
| Copilot UI always renders AccountableRecommendation | DTO + FE type exist; not all surfaces wired | G |
| buildCapacitySnapshot call sites | Some patches still set capacity without metrics sync | F residual |
| HTTP multi-tenant e2e on Postgres | Unit tenant-scope + RAG adversarial; not full HTTP | H |
