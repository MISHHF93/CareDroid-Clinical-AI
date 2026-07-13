# CareDroid Header and Application-Shell Reconstruction Inventory

**Generated:** 2025-01-12  
**Scope:** Complete inventory of all header, navigation, sidebar, page-command, and shell implementations

---

## Executive Summary

The CareDroid application currently has **fragmented and duplicated** header/navigation/shell implementations across multiple components. There are **7 different header implementations**, **2 sidebar implementations**, **4 shell implementations**, and **no centralized route metadata system**. This creates inconsistent spacing, alignment, responsive behavior, and visual hierarchy across the application.

### Critical Issues Identified

- **7 header implementations** with different heights, styles, and control patterns
- **No breadcrumbs implementation** found (0 files)
- **Duplicate search fields** in Header.tsx and ApplicationHeader
- **Inconsistent facility/tenant selectors** across components
- **No centralized route metadata** for titles, actions, permissions
- **Multiple z-index layers** defined in different CSS files
- **Page-specific CSS overrides** for layout compensation
- **No canonical mobile navigation** component
- **Mixed design token systems** (tokens/index.ts vs CSS custom properties)

---

## Header Implementations

### 1. Legacy Header (`src/components/Header.tsx`)
- **Lines:** 505
- **Purpose:** Main operational header for emergency department
- **Controls:**
  - Clock display
  - Patient lookup search with dropdown results
  - Create patient button
  - Central control status badge
  - Operational alert rail
  - Operations center menu
  - Profile role switcher
  - User account menu
- **Height:** 52px (from CSS)
- **CSS:** `src/components/Header.css` (408 lines)
- **Used by:** AppShell.tsx
- **Issues:** Monolithic, mixes global and page-specific controls, hard to maintain

### 2. ApplicationHeader (`src/shell/ApplicationHeader/ApplicationHeader.tsx`)
- **Lines:** 222
- **Purpose:** Canonical global platform header
- **Controls:**
  - CareDroid brand/logo
  - Facility/tenant selector
  - Global search (placeholder)
  - System health indicator
  - Notifications bell with unread count
  - Help button
  - User menu with avatar
- **Height:** Uses `layout.header.height` from tokens
- **Status:** Partially implemented, not integrated
- **Issues:** Uses placeholder contexts that may not exist, not connected to real services

### 3. WorkspaceHeader (`src/shell/WorkspaceHeader/WorkspaceHeader.tsx`)
- **Lines:** 214
- **Purpose:** Role-specific workspace header
- **Controls:**
  - Role icon with accent color
  - Role name
  - Workspace navigation buttons
  - Operational status chips (placeholder)
  - Role-specific quick actions
- **Height:** Uses `layout.header.workspaceHeight` from tokens
- **Status:** Partially implemented, not integrated
- **Issues:** Helper functions are placeholders, not connected to real navigation

### 4. PageHeader (`src/components/ui/PageHeader.tsx`)
- **Lines:** 35
- **Purpose:** Generic page header component
- **Controls:** Eyebrow, title, description, actions, leading icon
- **CSS:** `src/components/ui/PageHeader.css`
- **Used by:** Various pages
- **Issues:** Generic, not typed for specific use cases

### 5. ReceptionHeader (`src/components/reception/ReceptionHeader.tsx`)
- **Lines:** 168
- **Purpose:** Reception desk specific header
- **Controls:**
  - Branding and user info
  - Metrics bar (patients waiting, in triage, etc.)
  - Situation brief (happening now, needs attention, owner, next action)
  - Primary actions
  - Queue tabs
- **CSS:** `src/pages/emergency/ReceptionWorkspace.new-header.css`
- **Used by:** ReceptionWorkspace.tsx
- **Issues:** Page-specific, duplicates header functionality

### 6. PatientHeader (`src/domain/patient/PatientHeader.tsx`)
- **Lines:** 39
- **Purpose:** Patient-specific header
- **Controls:** Acuity badge, name, demographics, disposition, wait timer, flags, journey tracker
- **CSS:** Embedded in patient.css
- **Used by:** Patient detail views
- **Issues:** Domain-specific, not a shell component

### 7. QueueHeader (`src/domain/queue/QueueHeader.tsx`)
- **Lines:** 23
- **Purpose:** Queue-specific header
- **Controls:** Queue name, count, critical count badge, actions
- **CSS:** Embedded in queue.css
- **Used by:** Queue views
- **Issues:** Domain-specific, not a shell component

---

## Sidebar Implementations

### 1. Legacy Sidebar (`src/components/Sidebar.tsx`)
- **Lines:** 597
- **Purpose:** Main navigation sidebar
- **Controls:**
  - Brand mark and copy
  - Desktop navigation with grouped items
  - Utility navigation (tools, platform, pulse, shift)
  - Mobile navigation with primary items
  - More sheet for additional items
  - Copilot button
  - Alerts button with notification panel
  - Sidebar chrome controls (guide, retry connection)
  - Demo user switcher
- **Width:** 232px (desktop), 56px (tablet), 0px (mobile)
- **CSS:** `src/components/Sidebar.css` (654 lines)
- **Used by:** AppShell.tsx
- **Issues:** Complex logic for mobile/desktop, mixes navigation and session controls

### 2. Canonical Sidebar (`src/shell/Sidebar/`)
- **Status:** Empty directory
- **Purpose:** Intended for new canonical sidebar
- **Issues:** Not implemented

---

## Mobile Navigation Implementations

### 1. Built-in Mobile Navigation (Sidebar.tsx)
- **Location:** Lines 498-537 in Sidebar.tsx
- **Implementation:** Part of Sidebar component, not separate
- **Controls:**
  - Mobile primary nav (3-4 items based on role)
  - Copilot button (if not in nav list)
  - More button for additional items
  - More sheet with all remaining items
- **Height:** 72px + safe-area-inset-bottom
- **Position:** Fixed bottom tab bar
- **CSS:** Lines 399-653 in Sidebar.css
- **Responsive:** Shows at max-width: 768px
- **Issues:** No dedicated mobile navigation component, mixed with sidebar logic

### 2. No Dedicated Mobile Navigation Component Found
- **Issues:** Mobile navigation is embedded in Sidebar, making it hard to reuse

---

## Overlay/Drawer/Modal Implementations

### 1. Generic Drawer (`src/components/surfaces/Drawer.tsx`)
- **Lines:** 61
- **Features:**
  - Portal to document.body
  - Side: left/right
  - Size: sm/md/lg/full
  - Escape key handling
  - Focus management
  - Body scroll lock
  - Backdrop click to close
- **CSS:** `src/components/surfaces/Drawer.css`
- **Used by:** General drawer needs
- **Issues:** Basic implementation, limited features

### 2. UI Drawer (`src/components/ui/Drawer.tsx`)
- **Lines:** 170
- **Features:**
  - Portal to document.body
  - Side: left/right/top/bottom
  - Size: sm/md/lg/full
  - Escape key handling
  - Focus management
  - Body scroll lock
  - Backdrop click to close
  - DrawerMenuPanel variant
  - FilterDrawer variant
- **CSS:** `src/components/ui/Drawer.css`
- **Used by:** UI components
- **Issues:** Duplicate of surfaces/Drawer.tsx

### 3. Generic Modal (`src/components/surfaces/Modal.tsx`)
- **Lines:** 83
- **Features:**
  - Portal to document.body
  - Size: sm/md/lg/xl/full
  - Escape key handling
  - Focus management
  - Body scroll lock
  - Backdrop click to close
  - ARIA support
- **CSS:** `src/components/surfaces/Modal.css`
- **Used by:** General modal needs
- **Issues:** Basic implementation

### 4. Reassessment Drawer (`src/components/ReassessmentDrawer.tsx`)
- **Lines:** 478
- **Purpose:** Domain-specific drawer for patient reassessment
- **Features:**
  - Patient list with flags
  - Sort by severity/wait time
  - Assess Now action
  - Operational history panel
  - Custom styling
- **CSS:** `src/components/ReassessmentDrawer.css`
- **Used by:** AppShell.tsx
- **Issues:** Domain-specific, not reusable

### 5. Reception Smart Intake Overlay (`src/components/reception/ReceptionSmartIntakeOverlay.tsx`)
- **Lines:** 21
- **Purpose:** Page-specific overlay for smart intake
- **Features:**
  - Dialog role
  - ARIA modal
  - Embedded SmartIntake component
- **CSS:** `src/components/reception/ReceptionSmartIntakeOverlay.css`
- **Used by:** ReceptionWorkspace.tsx
- **Issues:** Page-specific, not reusable

### 6. Sidebar Notification Panel (`src/components/SidebarNotificationPanel.tsx`)
- **Lines:** 5,905
- **Purpose:** Notification panel in sidebar
- **Features:**
  - Complex notification management
  - Alert filtering
  - Notification actions
- **CSS:** `src/components/SidebarNotificationPanel.css` (5,455 lines)
- **Used by:** Sidebar.tsx
- **Issues:** Very large component, complex logic

### 7. Other Panel Components (50+ found)
- CopilotPanel, PatientDetailPanel, QueueIntelligencePanel, ReferralPanel, WhoNextPanel, WorkloadBalancePanel, AIInsightPanel, OperationalHistoryPanel, etc.
- **Issues:** Many domain-specific panels with inconsistent patterns

---

## Shell/Layout Implementations

### 1. AppShell (`src/components/AppShell.tsx`)
- **Lines:** 982
- **Purpose:** Main application shell
- **Responsibilities:**
  - Engine initialization (reassessment, capacity, patient flow, etc.)
  - WebSocket and polling setup
  - Route chrome management
  - Keyboard shortcuts
  - Command palette
  - Copilot panel
  - Patient detail panel
  - Reassessment drawer
  - Help hub
  - Toast host
  - Page title management
- **CSS:** `src/components/app-shell.css` (239 lines)
- **Used by:** Main application entry
- **Issues:** Monolithic, too many responsibilities, mixes shell and business logic

### 2. DisplayShell (`src/layouts/DisplayShell.tsx`)
- **Lines:** 1,810
- **Purpose:** Display-specific shell (wall kiosks, public displays)
- **CSS:** `src/layouts/DisplayShell.css`
- **Used by:** Display routes
- **Issues:** Separate code path for displays

### 3. EntryShell (`src/layouts/EntryShell.tsx`)
- **Lines:** 1,482
- **Purpose:** Entry-specific shell
- **CSS:** `src/layouts/EntryShell.css`
- **Used by:** Entry routes
- **Issues:** Separate code path for entry points

### 4. Layouts AppShell (`src/layouts/AppShell.tsx`)
- **Lines:** 222
- **Purpose:** Alternative layout shell
- **Used by:** Unknown
- **Issues:** Duplicate implementation

---

## Search Field Implementations

### 1. Header Patient Lookup (`src/components/Header.tsx`)
- **Type:** Patient/operational search
- **Features:**
  - Real-time patient search from store
  - Backend verification
  - Operational entity search (encounters, referrals, EMS, queues)
  - Keyboard navigation (Enter to select, Escape to close)
  - Dropdown results with actions
- **Used by:** All emergency routes
- **Issues:** Tied to emergency-specific logic

### 2. ApplicationHeader Global Search (`src/shell/ApplicationHeader/ApplicationHeader.tsx`)
- **Type:** Placeholder global search
- **Features:** Search button with keyboard shortcut (⌘K)
- **Status:** Not implemented
- **Issues:** Placeholder only

### 3. PageCommandBar Local Search (`src/shell/PageCommandBar/PageCommandBar.tsx`)
- **Type:** Page-specific search
- **Features:** Search input with onSearch callback
- **Status:** Not implemented
- **Issues:** Placeholder only

---

## Notification Control Implementations

### 1. SidebarNotificationPanel (`src/components/SidebarNotificationPanel.tsx`)
- **Lines:** 5,905
- **Purpose:** Notification panel in sidebar
- **CSS:** `src/components/SidebarNotificationPanel.css`
- **Used by:** Sidebar.tsx
- **Issues:** Complex notification management logic

### 2. ApplicationHeader Notifications (`src/shell/ApplicationHeader/ApplicationHeader.tsx`)
- **Type:** Notification bell with unread count
- **Features:** Badge count, bell icon
- **Status:** Uses NotificationContext (may not exist)
- **Issues:** Not connected to real notification system

### 3. NotificationContext (`src/contexts/NotificationContext.tsx`)
- **Purpose:** Notification state management
- **Status:** Exists but may not be used consistently

### 4. NotificationShellContext (`src/contexts/NotificationShellContext.tsx`)
- **Purpose:** Shell-level notification state
- **Status:** Used by Sidebar for notification panel

---

## Role Indicator Implementations

### 1. ProfileRoleSwitcher (`src/components/account/ProfileRoleSwitcher.tsx`)
- **Lines:** 131
- **Variants:** compact, chips, menu
- **Purpose:** Switch between demo roles
- **Used by:** Header.tsx, UserAccountMenu
- **Issues:** Demo-specific, not for production roles

### 2. UserAccountMenu (`src/components/account/UserAccountMenu.tsx`)
- **Lines:** 280
- **Features:** Avatar, name, role label, account menu dropdown
- **Used by:** Header.tsx
- **Issues:** Complex positioning logic, portaled panel

### 3. WorkspaceHeader Role Display (`src/shell/WorkspaceHeader/WorkspaceHeader.tsx`)
- **Features:** Role icon, role name with accent color
- **Status:** Not integrated
- **Issues:** Placeholder implementation

---

## Facility/Tenant Selector Implementations

### 1. ApplicationHeader Facility Selector (`src/shell/ApplicationHeader/ApplicationHeader.tsx`)
- **Type:** Facility dropdown button
- **Context:** Uses TenantContext
- **Status:** Not connected to real tenant system
- **Issues:** Placeholder implementation

### 2. No other facility selectors found
- **Issues:** Facility selection not consistently implemented

---

## Shift/Session Status Implementations

### 1. No dedicated shift selector found
- **Issues:** Shift status not displayed in header

### 2. Session controls in SidebarChromeControls (`src/components/sidebar/SidebarChromeControls.tsx`)
- **Features:** Guide button, retry connection button
- **Purpose:** Session utilities
- **Used by:** Sidebar footer
- **Issues:** Limited session controls

---

## System Health/Connectivity Indicators

### 1. ApplicationHeader System Health (`src/shell/ApplicationHeader/ApplicationHeader.tsx`)
- **Type:** Status dot (●)
- **Status:** Static green indicator
- **Issues:** Not connected to real health monitoring

### 2. Header Sync Status (`src/components/Header.tsx`)
- **Features:** WebSocket status, sync mode, sync age, sync label
- **Context:** Operational intelligence snapshot
- **Used by:** All emergency routes
- **Issues:** Complex sync logic mixed with header

### 3. OperationalAlertRail (`src/components/emergency/OperationalAlertRail.tsx`)
- **Lines:** 96
- **Features:** Operational metrics strip (sync status, patient counts, etc.)
- **Variants:** header, default
- **Used by:** Header.tsx
- **Issues:** Operational metrics mixed with header

---

## CSS and Design Token Inventory

### Design Token Systems

#### 1. TypeScript Tokens (`src/tokens/index.ts`)
- **Lines:** 291
- **Exports:**
  - `colors` - Semantic color system
  - `roleAccents` - Role-specific accent colors
  - `typography` - Font families, sizes, weights, line heights
  - `spacing` - Spacing scale
  - `radii` - Border radius scale
  - `elevation` - Shadow/elevation system
  - `breakpoints` - Responsive breakpoints
  - `zIndex` - Z-index layers
  - `animation` - Duration and easing
  - `layout` - Layout constants (sidebar width, header heights, content max-width)
- **Status:** Comprehensive but not consistently used
- **Issues:** Many components use hardcoded values instead

#### 2. CSS Design Tokens (`src/styles/design-tokens.css`)
- **Lines:** 482
- **Defines:**
  - Breakpoint tiers
  - Spacing scales
  - Typography scales
  - Touch targets
  - Radius scale
  - Layout constants
  - Z-index layers
  - Focus/elevation
- **Status:** Comprehensive CSS custom properties
- **Issues:** Duplicate definitions with TypeScript tokens

#### 3. Emergency Tokens (`src/styles/emergency-tokens.css`)
- **Lines:** 1,703
- **Purpose:** Emergency-specific tokens
- **Status:** Used by app-shell.css

### CSS Files Inventory

#### Header CSS
- `src/components/Header.css` (408 lines) - Legacy header styles
  - Header height: 52px (--app-chrome-bar-h)
  - Control height: 36px (--app-chrome-control-h)
  - Control radius: 9px (--app-chrome-control-radius)
  - Padding: var(--cdl-header-padding-inline, 16px)
  - Z-index: 40
- `src/components/app-shell.css` (239 lines) - Shell styles with header integration
  - Sidebar offset: 232px (desktop), 56px (tablet), 0px (mobile)
  - Chrome z-index: 30
- `src/styles/shell-header-polish.css` (2,086 lines) - Header polish styles
  - Header height: 52px (--cdl-header-height)
  - Route tab height: 48px (--cdl-route-tab-height)
  - Chrome stack height: calc(header + route-tab + alarm-dock)
- `src/pages/emergency/ReceptionWorkspace.new-header.css` (6,259 lines) - Reception header styles

#### Sidebar CSS
- `src/components/Sidebar.css` (654 lines) - Main sidebar styles
  - Sidebar width: 232px (desktop), 56px (tablet), 0px (mobile)
  - Brand height: 44px (--cdl-sidebar-brand-height)
  - Item radius: 6px (--cdl-sidebar-item-radius)
  - Mobile nav height: 72px + safe-area-inset-bottom
  - Mobile z-index: 50
  - Tablet breakpoint: max-width: 1024px
  - Mobile breakpoint: max-width: 768px
- `src/components/SidebarNotificationPanel.css` (5,455 lines) - Notification panel styles

#### Layout CSS
- `src/styles/layout-engine.css` (8,046 lines) - Layout engine
- `src/styles/layout-breakpoints.css` (740 lines) - Breakpoint definitions
- `src/styles/layout-visibility.css` (6,144 lines) - Visibility utilities
- `src/styles/mobile-first-layout.css` (1,651 lines) - Mobile layout
- `src/styles/responsive-ux.css` (10,072 lines) - Responsive utilities

#### Z-Index Definitions

**CSS Z-Index Layers (`src/styles/design-tokens.css`)**
- `--z-base: 0`
- `--z-dropdown: 700`
- `--z-sticky: 800`
- `--z-overlay: 900`
- `--z-header: 920`
- `--z-popover: 940`
- `--z-drawer: 1000`
- `--z-modal: 1100`
- `--z-toast: 1200`

**TypeScript Z-Index Layers (`src/tokens/index.ts`)**
- `hide: -1`
- `base: 0`
- `docked: 10`
- `dropdown: 1000`
- `sticky: 1100`
- `banner: 1200`
- `overlay: 1300`
- `modal: 1400`
- `popover: 1500`
- `toast: 1700`
- `tooltip: 1800`
- `commandPalette: 1900`

**Component-Specific Z-Index Values**
- Header: z-index: 40 (Header.css)
- Sidebar: z-index: 50 (Sidebar.css mobile)
- Sidebar tooltip: z-index: 200 (Sidebar.css)
- Search results: z-index: 140 (Header.css)
- Skip link: z-index: 1200 (app-shell.css)
- App chrome: z-index: 30 (app-shell.css)

**Issues:**
- Inconsistent z-index scales between CSS and TypeScript (CSS uses 700-1200, TS uses 1000-1900)
- Component-specific z-index values not using token system
- No documented z-index layering strategy

---

## Route Metadata and Navigation

### Route Configuration
- `src/config/routes.config.ts` (2,555 lines) - Canonical route definitions
- `src/config/unified-navigation.config.ts` (375 lines) - Navigation item definitions
- `src/config/navigation.config.ts` (23,781 lines) - Navigation configuration
- `src/config/sidebarNavigationGroups.ts` (2,715 lines) - Sidebar navigation groups

### Navigation Implementations
- `src/components/Sidebar.tsx` - Main navigation rendering
- `src/config/emergencyRoleNavigationModel.ts` - Role-specific navigation
- `src/config/roleClusterNav.config.ts` - Role cluster navigation
- `src/config/trackMindRoleNavigationModel.ts` - TrackMind navigation

### Issues
- **No centralized route metadata** for titles, breadcrumbs, actions
- **No breadcrumb component** found
- **Navigation logic scattered** across multiple config files
- **No permission-aware navigation metadata** in one place

---

## Page-Specific Layout Compensations

### Identified Pages with Manual Offsets

#### Reception Workspace (`src/pages/emergency/ReceptionWorkspace.tsx`)
- **Lines:** 911
- **CSS:** `ReceptionWorkspace.css` (26,063 lines), `emergency-route.css` (16,364 lines)
- **Issues:** Extensive page-specific CSS for layout compensation

#### Emergency Pages
- `src/pages/emergency/emergency-route.css` (16,364 lines) - Shared emergency route styles
- `src/pages/emergency/emergency-whiteboard-cleanup.css` (22,786 lines) - Whiteboard cleanup styles
- **src/pages/emergency/EmergencyAnalytics.css` (9,833 lines) - Analytics specific styles
- `src/pages/emergency/EmergencySettings.css` (14,463 lines) - Settings specific styles

### Issues
- **Manual padding/margins** to compensate for inconsistent shell
- **Fixed positioning** for overlays
- **Route-specific CSS** for layout adjustments
- **No shared layout system** for page content

---

## TypeScript Interfaces and Prop Contracts

### Canonical Shell Component Props

**ApplicationHeaderProps (`src/shell/ApplicationHeader/ApplicationHeader.tsx`)**
```typescript
export interface ApplicationHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  showHelp?: boolean;
  className?: string;
}
```

**WorkspaceHeaderProps (`src/shell/WorkspaceHeader/WorkspaceHeader.tsx`)**
```typescript
export interface WorkspaceHeaderProps {
  className?: string;
}
```

**PageCommandBarProps (`src/shell/PageCommandBar/PageCommandBar.tsx`)**
```typescript
export interface PageCommandBarProps {
  title: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: Array<{
    id: string;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    icon?: string;
  }>;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}
```

### Legacy Header Props Interfaces

**ReceptionHeaderProps** - Reception header props
**PatientHeaderProps** - Patient header props
**QueueHeaderProps** - Queue header props

### Sidebar Props Interfaces

**SidebarProps (`src/components/Sidebar.tsx`)**
```typescript
type SidebarProps = {
  navigationItems?: readonly NavigationItem[];
};
```

**SidebarNavItem (`src/components/Sidebar.tsx`)**
```typescript
type SidebarNavItem = {
  id: string;
  label: string;
  icon: string;
  route?: string;
  path: string;
  featureGate?: string | null;
  activePaths?: readonly string[];
  mobileLabel?: string;
  isEmergencyCore?: boolean;
};
```

### Domain Types (`src/contracts/domains.ts`)

**Patient Domain**
- `PatientId` - Branded string type
- `PatientStatus` - Enum (WAITING, IN_TRIAGE, IN_TREATMENT, etc.)
- `TriageAcuity` - Enum (IMMEDIATE, EMERGENT, URGENT, etc.)
- `Patient` - Full patient interface
- `WorkflowStage` - Enum (ARRIVAL, TRIAGE, ASSESSMENT, etc.)

**Staff Domain**
- `StaffId` - Branded string type
- `StaffRole` - Enum (RECEPTIONIST, TRIAGE_NURSE, PHYSICIAN, etc.)
- `Staff` - Full staff interface

**Alert Domain**
- `AlertId` - Branded string type
- `AlertSeverity` - Enum (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- `AlertStatus` - Enum (ACTIVE, ACKNOWLEDGED, ESCALATED, RESOLVED, DISMISSED)
- `AlertCategory` - Enum (CLINICAL, OPERATIONAL, SAFETY, COMPLIANCE, SYSTEM)
- `Alert` - Full alert interface

**Navigation Domain**
- `NavigationId` - Branded string type
- `NavigationGroup` - Enum (COMMAND, EMERGENCY, PATIENTS, OPERATIONS, etc.)
- `NavigationItem` - Navigation item interface with permissions

**Screen Mode Domain**
- `ScreenMode` - Enum (TRIAGE, CHARGE_NURSE, PHYSICIAN, EMS, etc.)
- `ScreenModeConfig` - Screen mode configuration

### Emergency Types (`src/types/emergency.ts`)

**Patient State**
- `PatientState` - Enum (Arrival, Registration, Triage, Waiting, etc.)
- `Priority` - Enum (P1, P2, P3, P4, P5)
- `PatientFlag` - Enum (ReassessmentDue, DeteriorationRisk, SepsisAlert, etc.)
- `PatientFlagRecord` - Flag record interface

**Patient Data**
- `Vitals` - Vitals interface
- `JourneyEvent` - Journey event interface
- `Encounter` - Encounter interface
- `Note` - Note interface

### Route Configuration (`src/config/routes.config.ts`)

**CANONICAL_ROUTES** - Frozen object with 100+ route paths
- Auth routes (auth, authCallback, authForgotPassword, etc.)
- Admin routes (adminOperations, adminEdStaff)
- Emergency routes (emergencyWorkspace, emergencyReception, emergencyPatients, etc.)
- Tool routes (calculators, toolsCardiology, etc.)
- Integration routes (integrationHub, etc.)

### Issues
- **No unified header prop contract** across all header implementations
- **No route metadata interface** for titles, breadcrumbs, actions, permissions
- **No permission-aware action interface** standardized across components
- **No breadcrumb interface** in canonical types (no breadcrumbs found in implementation)
- **Duplicate type definitions** between contracts/domains.ts and types/emergency.ts
- **No centralized shell prop contracts** for ApplicationShell

---

## Responsive Behavior Inventory

### Breakpoint Systems

**CSS Breakpoint Tiers (`src/styles/design-tokens.css`)**
- Mobile: 0–767px (--bp-tier-mobile-max: 767px)
- Tablet: 768–1279px (--bp-tier-tablet: 768px, --bp-tier-desktop: 1280px)
- Desktop: 1280–1919px (--bp-tier-desktop: 1280px, --bp-tier-wide: 1920px)
- Wide: 1920px+ (--bp-tier-wide: 1920px)
- Split form: 1024px (--bp-tier-split-form: 1024px)
- Compact shell: 900px (--bp-tier-compact-shell: 900px)
- Narrow: 600px (--bp-tier-narrow: 600px)
- Touch enforce: 640px (--bp-tier-touch-enforce: 640px)

**Device Widths (QA/Documentation)**
- Phone XS: 320px, SM: 360px, MD: 375px, LG: 390px, XL: 412px, 2XL: 430px
- Tablet: 768px, LG: 1024px
- Desktop: 1280px, LG: 1440px, XL: 1920px

**TypeScript Breakpoints (`src/tokens/index.ts`)**
- sm: 640px (Mobile landscape)
- md: 768px (Tablet portrait)
- lg: 1024px (Tablet landscape / small laptop)
- xl: 1280px (Desktop)
- 2xl: 1536px (Large desktop)
- 3xl: 1920px (Full HD)
- ultrawide: 2560px (Ultrawide)

**Layout Breakpoints (`src/layout/designTokens.ts`)**
- mobile: 0-767px
- tablet: 768-1279px
- desktop: 1280-1919px
- wide: 1920px+

### Responsive Implementations

**Header Responsive (`src/components/Header.css`)**
- Compact shell: max-width: 900px
- Narrow: max-width: 720px

**Sidebar Responsive (`src/components/Sidebar.css`)**
- Tablet (icon-only): max-width: 1024px and min-width: 769px
  - Width: 56px
  - Brand copy hidden
  - Group labels hidden
  - Tooltips shown on hover
  - Chrome controls hidden
- Mobile (bottom tab bar): max-width: 768px
  - Width: 100%
  - Height: 72px + safe-area-inset-bottom
  - Fixed bottom position
  - Z-index: 50
  - Brand and footer hidden
  - Desktop nav hidden
  - Mobile nav shown

**Shell Responsive (`src/components/app-shell.css`)**
- Tablet sidebar offset: max-width: 1024px and min-width: 769px (56px)
- Mobile sidebar offset: max-width: 768px (0px)

**Header Polish Responsive (`src/styles/shell-header-polish.css`)**
- Mobile: max-width: 768px
  - Header padding: 14px
  - Chrome stack height: calc(52px + 56px)

### Issues
- **Inconsistent breakpoint scales** across files (CSS uses 768/1280, TS uses 640/768/1024/1280)
- **No ultrawide support** for 2560×1080, 3440×1440, 3840×1600
- **No container queries** for adaptive layouts
- **Mixed responsive strategies** (CSS media queries vs JavaScript)
- **Breakpoint naming inconsistency** (sm/md/lg vs mobile/tablet/desktop)

---

## Accessibility Status

### Positive Findings
- ARIA labels present in most components
- Keyboard navigation in Header.tsx
- Skip link in app-shell.css
- Focus management in UserAccountMenu

### Issues
- **No breadcrumb navigation** (critical for accessibility)
- **Inconsistent focus management** across components
- **No documented focus order** for shell
- **No high-contrast mode testing**
- **No reduced motion support** in all animations

---

## Duplicated and Obsolete Implementations

### Duplicated Controls
1. **Search fields** - Header.tsx and ApplicationHeader
2. **User menus** - UserAccountMenu and ApplicationHeader user menu
3. **Notification controls** - SidebarNotificationPanel and ApplicationHeader notifications
4. **Role indicators** - ProfileRoleSwitcher and WorkspaceHeader role display
5. **App shells** - components/AppShell.tsx and layouts/AppShell.tsx

### Potentially Obsolete
1. `src/layouts/AppShell.tsx` - Duplicate of components/AppShell.tsx
2. `src/layouts/DisplayShell.tsx` - May be replaced by shell variants
3. `src/layouts/EntryShell.tsx` - May be replaced by shell variants
4. `src/components/ui/PageHeader.tsx` - May be replaced by PageCommandBar
5. `src/components/reception/ReceptionHeader.tsx` - May be replaced by canonical headers

### Unused Shell Directory
- `src/shell/Sidebar/` - Empty, intended for canonical sidebar

---

## Service and Context Dependencies

### Contexts Used by Headers
- `UserContext` - User identity
- `TenantContext` - Tenant/facility context
- `NotificationContext` - Notifications
- `ThemeContext` - Theme
- `UserIdentityContext` - User identity (alternative)
- `SimulationModeContext` - Simulation mode
- `PractitionerSurfaceVisibility` - Surface visibility
- `RouteChromeContext` - Route chrome
- `NotificationShellContext` - Shell notifications
- `HelpHubContext` - Help hub
- `SystemConfigContext` - System configuration

### Hooks Used by Headers
- `useEmergencyRolePermissions` - Role permissions
- `useEffectiveUserProfile` - User profile
- `useRouteScreenMode` - Screen mode
- `useScreenModeCapabilities` - Screen capabilities
- `useOperationalIntelligence` - Operational data
- `useProfileSwitcherVisibility` - Profile switcher
- `useCopilotChromeAccess` - Copilot access

### Issues
- **Multiple user identity contexts** (UserContext, UserIdentityContext)
- **Inconsistent context usage** across components
- **No canonical service layer** for header data

---

## Next Steps for Reconstruction

### Phase 1: Design Canonical Architecture
1. Define unified design token system
2. Create route metadata schema
3. Design component architecture
4. Define permission-aware action contracts

### Phase 2: Implement Canonical Components
1. Build ApplicationHeader with real service integration
2. Build WorkspaceHeader with role-aware navigation
3. Build PageCommandBar with breadcrumb support
4. Build ApplicationSidebar with mobile navigation
5. Build MobileNavigation component

### Phase 3: Centralize Route Metadata
1. Create route metadata registry
2. Migrate route titles and descriptions
3. Add breadcrumb definitions
4. Add action definitions
5. Add permission rules

### Phase 4: Incremental Migration
1. Migrate /emergency/reception first
2. Migrate remaining emergency routes
3. Migrate other workspaces
4. Remove obsolete implementations

### Phase 5: Testing and Validation
1. Unit tests for all components
2. Integration tests for shell
3. Playwright tests for all roles
4. Accessibility audits
5. Responsive testing

---

## Summary Statistics

- **Total header implementations:** 7
- **Total sidebar implementations:** 2 (1 empty)
- **Total shell implementations:** 4
- **Total CSS files analyzed:** 60+
- **Total TypeScript interfaces:** 20+
- **Route configurations:** 5
- **Design token systems:** 3
- **Breadcrumb implementations:** 0
- **Duplicated controls:** 5+
- **Pages with manual layout compensation:** 10+

---

**End of Inventory**
