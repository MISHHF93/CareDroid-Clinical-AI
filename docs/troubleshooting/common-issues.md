# Common Issues

## Route Exists But User Cannot Open It

Check `src/config/routes.config.ts`, `src/app/router.tsx`, and `src/config/emergencyRolePermissions.ts` together. A mounted route still needs a role permission path.

## Data Looks Stale

Check data-source banners, backend reachability, simulation mode, and local fallback state.

## Help Topic Missing

Add or update `src/config/userManual.config.ts`, then mirror durable manuals in `/docs` where needed.

## Shortcut Does Nothing

Confirm focus is not inside an input and the role can access the target route.

