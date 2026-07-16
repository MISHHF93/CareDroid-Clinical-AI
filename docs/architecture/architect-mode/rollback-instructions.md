# Rollback Instructions — Architect Mode

## Principles

- Small reversible PRs  
- No force-push to `main`  
- No amend of published commits  
- Docs-only stages: delete folder or `git checkout -- docs/architecture/architect-mode`  
- Behavior stages: feature flags or dual-read for one cycle  

## Per stage

| Stage | Rollback |
|-------|----------|
| 0 Baseline | Remove `docs/architecture/architect-mode/baseline/*` if undesired |
| A Docs | Revert architect-mode markdown; keep code untouched |
| B Characterization tests | Delete new test files only |
| C Contracts | Dual envelope readers; revert mapping module |
| D RBAC | Keep old permission functions as wrappers; restore Express mounts |
| E Shell/theme | Dual CSS variables; restore Header/AppShell imports |
| F Store | Revert sync module; restore previous selectors |
| G AI | Default offline/hash provider; remove accountable required fields behind flag |
| H Migrations | `migration:revert`; never auto-run on production without approval |
| I Roles | Per-role feature flag for new workspaces |
| J Proof pack | Docs only |

## Cycles 63–68 uncommitted work

If Architect Mode must pause:

```
git stash push -u -m "cycles-63-68-and-architect"
# or commit on a feature branch when user requests
```

Do **not** discard uncommitted Cycle work without explicit user confirmation.

## Express / Nest

Keep `enableMongooseEmergencyOs` and Express mount until Nest parity proven. Rollback = re-enable flag + registry mount.
