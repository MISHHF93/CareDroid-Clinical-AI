# Stabilize Codebase

Read the existing CareDroid source before editing. Identify the real frontend, backend, routes, shared services, AI files, stores, components, and tests.

Fix root causes without rewrites. Preserve working functionality, routes, props, and design patterns. Avoid duplicate AI logic, scattered provider calls, unsafe null access, unhandled promise failures, hydration issues, and missing loading/error/empty states.

Run the narrowest relevant checks first, then frontend typecheck, lint, tests, and build when scope permits.
