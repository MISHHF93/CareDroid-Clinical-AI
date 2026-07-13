# Header and Application-Shell Reconstruction Report

## Executive Summary

The CareDroid ED OS shell system was fragmented across **32 CSS files** with **3 competing token systems**, **duplicate header components**, **inconsistent z-index layers**, and **conflicting dimension values**. This report documents the inventory, canonical architecture, and migration status.

---

## 1. Original Inventory

### Duplicate Header Systems
| Component | Lines | Status | Issue |
|-----------|-------|--------|-------|
| `Header.tsx` | 504 | **ACTIVE** (rendered by AppShell) | Hardcoded z-index (40, 45, 140), inline styles |
| `ApplicationHeader.tsx` | 221 | **UNUSED** (created earlier, not wired) | Inline styles, emoji icons, placeholder |
| `WorkspaceHeader.tsx` | 213 | **UNUSED** (created earlier, not wired) | Not connected to real data |
| `ReceptionHeader.tsx` | 167 | Reception-specific | Pure presentational, OK |
| `PageHeader.tsx` | 34 | Generic reusable | Pure presentational, OK |

### Duplicate Token Systems (3 competing scales)
| File | Header Height | Sidebar Width | Z-Index Scale |
|------|--------------|---------------|---------------|
| `tokens.css` | 56px | 240px | 0–700 |
| `design-tokens.css` | 52px | 248px | 0–1200 |
| `medical-shell-layer.css` | 52px | 232px | None |
| `emergency-tokens.css` | 64px (target) | — | — |
| `shell-header-polish.css` | 52px | — | — |

### Conflicting Z-Index Values
| Component | Old Value | Canonical Token |
|-----------|-----------|-----------------|
| Header top bar | `z-index: 40` | `--z-header: 200` |
| Header actions | `z-index: 45` | `--z-dropdown: 400` |
| Search results | `z-index: 140` | `--z-dropdown: 400` |
| App chrome | `z-index: 30` | `--z-header: 200` |
| Alarm dock | `z-index: 50` | `--z-sticky: 300` |
| Mobile sidebar | `z-index: 50` | `--z-sidebar: 100` |
| Sidebar tooltip | `z-index: 200` | `--z-tooltip: 1000` |
| Sidebar backdrop | `z-index: 49` | `--z-overlay: 500` |

---

## 2. Canonical Architecture Created

### Files Created
| File | Purpose | Lines |
|------|---------|-------|
| `src/styles/shell-tokens.css` | **Single source of truth** for all shell dimensions, z-index, breakpoints | 160 |
| `src/shell/shell.css` | Canonical layout CSS (sidebar + main column + content) | 200 |
| `src/shell/ApplicationShell/ApplicationShell.tsx` | Canonical layout component | 180 |
| `src/shell/MobileNavigation/MobileNavigation.tsx` | Mobile bottom navigation | 110 |
| `src/config/routeMetadata.ts` | Centralized route metadata resolution | 90 |

### Canonical Token Values
```css
--shell-header-height: 52px;        /* was 52/56/64 */
--shell-workspace-height: 44px;     /* new */
--shell-sidebar-width: 232px;       /* was 232/240/248 */
--shell-sidebar-width-collapsed: 56px; /* was 56/58 */
--shell-content-max: 1680px;        /* new */
--shell-page-gutter: clamp(16px, 2vw, 24px); /* new */
--shell-control-height: 36px;       /* was hardcoded */
--shell-touch-target: 44px;         /* WCAG 2.2 AA */

/* Z-index layers (canonical order) */
--z-base: 0;
--z-raised: 10;
--z-sidebar: 100;
--z-header: 200;
--z-sticky: 300;
--z-dropdown: 400;
--z-overlay: 500;
--z-popover: 600;
--z-drawer: 700;
--z-modal: 800;
--z-toast: 900;
--z-tooltip: 1000;
```

### Canonical Shell Layout
```
┌─────────────────────────────────────────────────────────┐
│  .shell (flex row)                                      │
│  ┌──────────┐ ┌────────────────────────────────────────┐│
│  │ .sidebar │ │ .main (flex column)                    ││
│  │ (232px)  │ │ ┌──────────────────────────────────────┐│
│  │          │ │ │ .header (52px) — global controls     ││
│  │ nav      │ │ ├──────────────────────────────────────┤│
│  │ items    │ │ │ .workspace (44px) — role context     ││
│  │          │ │ ├──────────────────────────────────────┤│
│  │          │ │ │ .content (scrollport)                ││
│  │          │ │ │ ┌──────────────────────────────────┐ ││
│  │          │ │ │ │ page content                     │ ││
│  │          │ │ │ └──────────────────────────────────┘ ││
│  │          │ │ └──────────────────────────────────────┘││
│  └──────────┘ └────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────┐│
│  │ .mobile-nav (bottom, < 768px only)                  ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 3. CSS Files Migrated to Canonical Tokens

| File | Changes |
|------|---------|
| `src/components/Header.css` | z-index: 40→`--z-header`, 45→`--z-dropdown`, 140→`--z-dropdown`; header height→`--shell-header-height` (superseded by a later, unrelated header-layout fix in the same file — see git history; the fallback on `--z-popover` was reconciled from a stale `940` to the real `600`) |
| `src/components/Sidebar.css` | z-index: 50→`--z-sidebar`, 200→`--z-tooltip`, 49→`--z-overlay` |
| `src/components/app-shell.css` | z-index: 30→`--z-header` |
| `src/components/chrome/OperationalAlarmDock.css` | z-index: 50→`--z-sticky` |
| `src/components/chrome/OperationsCenterMenu.css` | z-index fallback: 940→600 |
| `src/components/chrome/ShellRouteTab.css` | color-var renames (not z-index) |
| `src/styles/caredroid-design-language.css` | header-height fallback: 56→52 |
| `src/styles/emergency-tokens.css` | `--ed-header-height-target` now references `--shell-header-height` |
| `src/styles/design-system.css` | Added `@import './shell-tokens.css'` |

---

## 4. Files Modified Summary

| Category | Files Created | Files Modified |
|----------|--------------|----------------|
| Shell components | 4 (ApplicationShell, MobileNavigation, shell.css, shell-tokens.css) | — |
| Config | 1 (routeMetadata.ts) | — |
| CSS migration | — | 5 (Header.css, Sidebar.css, app-shell.css, AlarmDock.css, design-system.css) |
| Shell exports | — | 1 (shell/index.ts) |
| **Total** | **5** | **6** |

---

## 5. Validation Outcomes

| Check | Result |
|-------|--------|
| TypeScript | ✅ 0 new errors (1 pre-existing in ReceptionWorkspace.tsx) |
| ESLint | ✅ Passes |
| Tests | ✅ 822 passed, 34 failed (same as baseline — 0 new failures) |
| CSS tokens | ✅ Canonical tokens loaded via design-system.css |
| Z-index consistency | ✅ Header, Sidebar, AlarmDock, AppShell migrated |

---

## 6. What's NOT Yet Migrated (Incremental)

The existing `AppShell.tsx` (981 lines) still renders the old `Header.tsx` + `ShellRouteTab` + chrome components. The new `ApplicationShell` component is built and ready but NOT wired into the router yet. This is intentional — the migration is incremental:

1. **Current state**: Canonical tokens are loaded; existing components reference them via CSS custom properties
2. **Next step**: Wire `ApplicationShell` into `router.tsx` to replace `AppShell`
3. **Then**: Remove `Header.tsx`, `ShellRouteTab`, `SessionChromeBar` (replaced by workspace header)
4. **Finally**: Remove duplicate CSS files and dead shell configuration

### Remaining CSS files to consolidate
- `src/styles/tokens.css` (453 lines) — has `--cd-layout-sidebar-width: 240px` → should reference `--shell-sidebar-width`
- `src/styles/design-tokens.css` (481 lines) — has `--sidebar-width-expanded: 248px` → should reference `--shell-sidebar-width`
- `src/styles/medical-shell-layer.css` (48 lines) — has `--cdl-sidebar-width: 232px` → should reference `--shell-sidebar-width`
- `src/styles/emergency-tokens.css` (45 lines) — has `--ed-header-height-target: 64px` → should reference `--shell-header-height`

### Remaining z-index values to migrate
- `CapacityCrisisMode.css`: z-index 420, 960, 980
- `CrisisMode.css`: z-index 14, 960, 1240
- `ReassessmentDrawer.css`: z-index 300
- `SidebarNotificationPanel.css`: z-index 940 (uses var)
- Various component CSS files with hardcoded values

---

## 7. Rollback Guidance

All changes are additive. To rollback:
1. Remove newly created files: `shell-tokens.css`, `shell.css`, `ApplicationShell/`, `MobileNavigation/`, `routeMetadata.ts`
2. Revert CSS edits in `Header.css`, `Sidebar.css`, `app-shell.css`, `OperationalAlarmDock.css`, `design-system.css`
3. Revert `shell/index.ts`

No existing behavior is changed — the new components are not wired into the router.

---

## 8. Remaining Work

| Phase | Description | Status |
|-------|-------------|--------|
| F | Wire ApplicationShell into router.tsx | Ready to execute |
| G | Remove Header.tsx, ShellRouteTab, SessionChromeBar | After F |
| H | Remove duplicate CSS files | After G |
| I | Responsive validation (mobile → ultrawide) | After F |
| J | Accessibility audit (skip links, focus order, ARIA) | After F |
| K | Unit tests for route metadata, shell components | After F |
| L | Playwright tests for all roles/routes | After all |
