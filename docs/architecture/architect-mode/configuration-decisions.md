# Configuration Decisions (ADRs lite) — Architect Mode

| ID | Decision | Default | Rationale |
|----|----------|---------|-----------|
| ADR-A1 | Canonical HTTP API | Nest controllers | Typed modules, guards, OpenAPI |
| ADR-A2 | Express routes-registry | Legacy adapter behind `enableMongooseEmergencyOs` until Nest parity | Preserve EMS/intake capability |
| ADR-A3 | FE operational state | `emergencyStore` + explicit sync | Dominant SoT; avoid second Zustand patient store |
| ADR-A4 | Shell | `components/AppShell` + `shell/*` re-exports only | No parallel mock shells |
| ADR-A5 | Routes | `CANONICAL_ROUTES` + router mount | Stop path drift |
| ADR-A6 | Authz server | Nest `Permission` + JWT | HIPAA least privilege |
| ADR-A7 | Authz client ED | Emergency roles as views over permission sets | Keep 12 clinical roles in UX |
| ADR-A8 | Vector DB | pgvector durable multi-tenant; in-memory unit; Pinecone optional | Tenant isolation |
| ADR-A9 | AI demo provider | Groq configurable only | Offline/hash default |
| ADR-A10 | Theme | Medical Light single `--cd-*` runtime (Stage E) | Coherent ED OS |
| ADR-A11 | Production schema | Migrations only; **no synchronize** | Data safety |
| ADR-A12 | Production data sync scripts | Prohibited in CI against live tenants | Tenant isolation |
| ADR-A13 | AI role | Accountable assistant; abstain/escalate | No oracle fabrication |
| ADR-A14 | Calculators | Deterministic non-LLM | Safety |
| ADR-A15 | OCR | Validate before authoritative write | Identity safety |
| ADR-A16 | Removal | Zero importers + replacement + evidence file | No silent deletion |
| ADR-A17 | Experimental shell engines | OFF in production unless `VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES=true`; ON in DEV by default | Session labs must not load on prod clinical path |

## Environment flags of interest

| Flag / config | Role |
|---------------|------|
| `enableMongooseEmergencyOs` | Dual Express mount |
| RAG enabled / autoBootstrapCorpus | Corpus load |
| Auth dev bypass flags | **Must not** enable in production |
| LLM provider selection | Groq demo vs offline |
