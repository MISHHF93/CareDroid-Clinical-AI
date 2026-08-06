# Security Policy

CareDroid Clinical AI is a proprietary Emergency Department operating system. It has not
undergone a commissioned third-party penetration test or received a formal clinical-safety
sign-off — see `docs/INTENDED_USE_BOUNDARY_v1.md` for the current, still-draft intended-use
boundary. Treat any deployment accordingly.

## Reporting a vulnerability

This project does not yet have a dedicated security-disclosure email — do not assume one
exists or guess at an address. Report suspected vulnerabilities through one of these
channels instead:

1. **Preferred: GitHub Security Advisories.** Open a private advisory on this repository
   (`Security` tab → `Report a vulnerability`). This reaches the repository owner directly
   and keeps the report out of the public issue tracker until a fix ships.
2. If that tab isn't available to you, contact the repository owner directly through
   GitHub rather than filing a public issue — this codebase handles patient-adjacent data,
   and a public issue is not an appropriate first disclosure channel for a suspected
   vulnerability.

Please include: the affected file/endpoint, reproduction steps, and the potential impact
(especially anything touching patient data, authentication, or authorization). We don't
currently commit to a fixed response SLA — this will be revisited once a formal security
program is in place.

## Scope

- **In scope:** the application code in this repository (`src/`, `backend/`, `lib/`, `mcp/`).
- **Out of scope:** third-party dependencies (report those upstream) and social-engineering
  or physical-access attacks against any specific deployment.

## Known, already-tracked gaps

This repository already runs `npm audit` in CI on both the frontend and backend package
trees; unresolved advisories are allowlisted only after reading the actual advisory text
to confirm scope, never blanket-suppressed. See `docs/orphan-detection-report.md` and
`docs/duplicate-system-audit.md` for other tracked, non-secret engineering gaps.
