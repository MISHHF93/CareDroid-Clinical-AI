# CareDroid Architecture Cleanup & Modernization Report

**Date:** 2026-07-13
**Status:** Phase 1 Complete - Baseline Established

---

## Executive Summary

This report documents the current state of the CareDroid Emergency Department Operating System and provides a roadmap for architectural modernization. The codebase is a large-scale clinical AI application with ~110,000+ lines of frontend TypeScript, ~23,000 lines of CSS, and ~770 backend source files across 66 NestJS modules.

---

## 1. Baseline Metrics

### Frontend (src/)
| Metric | Value |
|--------|-------|
| Total source files (.tsx/.ts) | 2,304 |
| Total lines of code | ~110,000+ |
| CSS files | 398 |
| CSS lines | ~23,000 |
| Components | 399 |
| Services | 377 |
| Hooks | 76 |
| Contexts | 17 |
| Zustand stores | 7 |
| Pages | ~150+ |
| Route definitions | ~200+ routes |

### Backend (backend/src/)
| Metric | Value |
|--------|-------|
| Total source files | 769 |
| NestJS modules | 66 |
| Controllers | 57 |
| Services | 140+ |
| Entities | 69 |
| DTOs | 59 |
| Guards | 4 |
| Interceptors | 4 |
| Migrations | 20 (13 TypeORM + 7 legacy MongoDB) |

### Shared Libraries (lib/, engine/, config/)
| Metric | Value |
|--------|-------|
| AI provider adapters | 6 |
| Engine modules | 5 |
| Config files | 22 |
| Native AI modules | 15+ |
| Patient orchestration modules | 12 |

---

## 2. Critical Architecture Issues

### 2.1 Monolithic State Management
- **emergencyStore.ts**: 6,341 lines - the central state hub is too large
- **router.tsx**: 970 lines - complex route tree with redirect logic
- **routes.config.ts**: 2,554 lines - oversized route configuration
- **24 state sources** (7 Zustand stores + 17 React contexts)

### 2.2 Duplicated Components
- Multiple badge variants (Badge, RoleBadge, domain-specific badges)
- Multiple card components (PatientCard, ToolCard, domain cards)
- Multiple strip components (OperationalStrip, TriageBreachStrip, etc.)
- Multiple panel components with overlapping responsibilities

### 2.3 Mixed Concerns
- Many components mix presentation, domain logic, and network calls
- Services have overlapping responsibilities (242 service files)
- Hooks have duplicate state derivation logic

### 2.4 Type Safety Issues
- Types defined in multiple locations (src/types, src/lib, backend)
- Some interfaces duplicated across frontend/backend
- Magic strings and hardcoded constants scattered throughout

### 2.5 CSS Architecture
- 398 CSS files with ~23,000 lines
- Mixed styling approaches (CSS modules, inline styles, etc.)
- Potential specificity conflicts

---

## 3. Target Architecture

### 3.1 Domain Organization
Organize the codebase into explicit domains with clear boundaries:

```
src/
├── domains/
│   ├── reception/          # Patient registration, intake
│   ├── triage/             # Triage assessment, acuity
│   ├── nursing/            # Nursing workflow, care plans
│   ├── physicians/         # Physician tools, orders
│   ├── ems/                # EMS integration, pre-arrival
│   ├── patient-flow/       # Flow management, boarding
│   ├── alerts/             # Alert lifecycle, escalation
│   ├── identity/           # Auth, roles, permissions
│   ├── documents/          # Clinical documentation
│   ├── communications/     # Chat, collaboration
│   ├── clinical-tools/     # Calculators, decision support
│   ├── ai-orchestration/   # AI services, copilot
│   ├── administration/     # System admin, config
│   ├── analytics/          # Dashboards, reporting
│   └── shared/             # Shared utilities, types
├── shell/                  # App shell, headers, navigation
├── infrastructure/         # API clients, storage, realtime
└── contracts/              # Shared types, schemas
```

### 3.2 Layered Architecture
Each domain follows:

```
domain/
├── presentation/           # React components, pages
├── application/            # Workflow orchestration, use cases
├── domain/                 # Business rules, state machines
├── infrastructure/         # API adapters, storage
└── contracts/              # Types, interfaces, schemas
```

### 3.3 Unified Shell Architecture
```
shell/
├── ApplicationHeader/      # Universal: identity, facility, global search
├── WorkspaceHeader/        # Role-specific: navigation, status
├── PageCommandBar/         # Contextual: title, breadcrumbs, actions
├── Sidebar/                # Navigation shell
└── Layout/                 # Responsive layout system
```

### 3.4 Design Token System
```typescript
// tokens/
├── colors.ts               # Semantic color system
├── typography.ts           # Font scale, line heights
├── spacing.ts              # Spacing scale
├── radii.ts                # Border radius scale
├── elevation.ts            # Shadow system
├── breakpoints.ts          # Responsive breakpoints
└── roles.ts                # Role accent colors
```

---

## 4. Migration Plan

### Phase 1: Foundation (Current)
- [x] Complete codebase inventory
- [x] Establish baseline metrics
- [x] Fix TypeScript errors
- [x] Document architecture issues
- [x] Define target architecture

### Phase 2: Domain Boundaries
- [ ] Define canonical domain types
- [ ] Create domain ownership map
- [ ] Establish dependency rules
- [ ] Create shared contracts

### Phase 3: Shell Unification
- [ ] Audit all header implementations
- [ ] Create ApplicationHeader component
- [ ] Create WorkspaceHeader component
- [ ] Create PageCommandBar component
- [ ] Unify sidebar navigation

### Phase 4: State Consolidation
- [ ] Audit all state sources
- [ ] Identify competing state
- [ ] Create canonical selectors
- [ ] Migrate to normalized state

### Phase 5: Component Consolidation
- [ ] Audit all component variants
- [ ] Identify canonical components
- [ ] Create migration path
- [ ] Remove duplicates

### Phase 6: Type Unification
- [ ] Create shared type contracts
- [ ] Eliminate duplicate types
- [ ] Add runtime validation
- [ ] Replace magic strings

### Phase 7: CSS Modernization
- [ ] Audit CSS architecture
- [ ] Create design token system
- [ ] Migrate to CSS modules
- [ ] Remove duplicate styles

### Phase 8: Testing & Validation
- [ ] Add characterization tests
- [ ] Create integration tests
- [ ] Run accessibility audits
- [ ] Performance testing

---

## 5. Immediate Actions

### 5.1 TypeScript Fixes (Completed)
- Fixed missing `provenance` property in CommandDashboard.tsx
- Fixed type mismatch in AiEvaluationDashboard.tsx

### 5.2 Next Steps
1. Create domain type definitions in `src/contracts/`
2. Create design token system in `src/tokens/`
3. Audit header implementations for consolidation
4. Identify competing state sources

---

## 6. Success Criteria

### Quantitative
- TypeScript errors: 0 (currently 0)
- ESLint warnings: Reduce by 50%
- Test coverage: Increase to 80%
- Bundle size: Reduce by 20%
- Duplicate code: Reduce by 40%

### Qualitative
- Clear domain boundaries
- Single source of truth for state
- Consistent design system
- Accessible UI (WCAG 2.2 AA)
- Maintainable codebase

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Feature flags, gradual migration |
| Performance regression | Medium | Bundle monitoring, performance tests |
| Test failures | Medium | Characterization tests first |
| Team adoption | Low | Documentation, training |

---

## 8. Conclusion

The CareDroid codebase is a large, feature-rich clinical AI application with significant architectural debt. The modernization plan provides a systematic approach to improving maintainability, type safety, and user experience while preserving the existing functionality.

**Phase 1 is complete.** The foundation has been established for incremental, evidence-based modernization.

---

*Report generated by architecture cleanup agent*
*Next update: Phase 2 completion*
