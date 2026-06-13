# Repository Harmonization Review Archive

This directory is reserved for separate apps, packages, and historical product surfaces that need manual review before physical relocation.

During the Emergency OS harmonization pass, the following areas were classified for review rather than moved blindly:

- `android/`: native Android/Kotlin application and Capacitor shell. Classified as `MOBILE_FUTURE_MODULE`; not imported by the active Vite web app.
- `mcp/`: MCP stdio bridge package. Classified as `FUTURE_MODULE` / integration tooling; not part of the active web route tree.
- `backend/ml-services/nlu/`: separate Python/ML-style service area. Classified as `NEEDS_MANUAL_REVIEW` for backend modularization.
- Legacy web platform pages under `src/pages/`, `src/layout/`, and `src/components/`: classified across `FUTURE_MODULE`, `LEGACY_PLATFORM_ARTIFACT`, and `PROTOTYPE_OR_DEMO`; now unmounted from the active Emergency OS route tree unless explicitly imported by the active routes.

Do not delete these areas without a product decision. Archive moves should preserve history and update package scripts, tests, CI, and deployment configuration in the same change.
