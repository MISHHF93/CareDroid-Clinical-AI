# Complete Implementation Deferred Items

## Deferred Because They Conflict With Active Spine

New `/frontend/src` architecture:

- Deferred because the active Vite SPA is `src/`.
- Do not add a duplicate `AppShell`, router, layout, or store.
- Any future replacement requires architecture owner approval and a migration plan.

New `/api/v1` Emergency OS surface:

- Deferred because the active frontend/backend contract is `/api/emergency/*`.
- Future API versioning should be planned as an adapter or staged migration, not an implicit replacement.

## Deferred Pending Manual Approval

Database migrations:

- No migration was run.
- Future work needs a named target database, dry-run output, rollback plan, and owner approval.

Dependency installs:

- No `npm install` or package-manager mutation was run.
- Future dependency additions need explicit package rationale and approval.

Long-running dev servers:

- No dev server was started.
- Future server startup should state the exact command, port expectations, and stop condition.

Destructive cleanup:

- No cleanup script was created or run.
- No broad legacy module deletion was performed.
- Safe future cleanup should begin as inventory or dry-run output. Moving files to `_review` still needs explicit file-owner approval when ownership is unclear.

## Deferred As Demo/Facade Only

Federated learning:

- Current behavior is a deterministic backend fixture/facade.
- Production promotion requires privacy review, secure aggregation design, model registry, hospital authentication, audit logging, and validation data.

Hybrid digital twin and real-time simulation:

- Current behavior is deterministic fixture logic.
- Production promotion requires calibration against real ED timestamps, operating model review, monitoring, and clinical operations approval.

Deterioration ML and AI governance claims:

- No clinical validation, AUROC, recall, or model-readiness claims should be made from current demo code.
- Production promotion requires data provenance, evaluation protocol, model governance, human-review policy, and safety signoff.

MQTT, wearable RPM, MoH/FHIR, EMS, and other external integrations:

- Current health/config surfaces can report configured/not-configured status, but live connector readiness is not implied.
- Production promotion requires credentials, vendor/environment confirmation, security review, contract tests, and operational runbooks.

## Future Promotion Checklist

Before any deferred item becomes active implementation:

- Confirm it supports the active Emergency OS product scope.
- Keep active frontend work in `src/` unless an architecture migration is approved.
- Keep active backend work under `/api/emergency/*` unless API versioning is approved.
- Add focused tests before broad validation.
- Label demo/facade behavior until real integrations and validation are complete.
- Avoid destructive cleanup in a dirty tree or while concurrent workers are touching related files.
