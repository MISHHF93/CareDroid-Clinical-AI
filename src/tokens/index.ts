/**
 * CareDroid Design Token System
 *
 * Centralized semantic tokens for the entire application.
 * All components should use these tokens instead of hardcoded values.
 */

// ============================================================================
// Color System
// ============================================================================

export const colors = {
  // Base colors
  white: '#ffffff',
  black: '#000000',

  // Semantic colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    light: '#dcfce7',
    DEFAULT: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
  },
  error: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#2563eb',
  },
} as const;

// ============================================================================
// Role Accent Colors
// ============================================================================

export const roleAccents = {
  receptionist: { primary: '#8b5cf6', light: '#ede9fe', dark: '#6d28d9' },
  triage_nurse: { primary: '#f59e0b', light: '#fef3c7', dark: '#d97706' },
  charge_nurse: { primary: '#10b981', light: '#d1fae5', dark: '#059669' },
  bedside_nurse: { primary: '#06b6d4', light: '#cffafe', dark: '#0891b2' },
  physician: { primary: '#3b82f6', light: '#dbeafe', dark: '#2563eb' },
  resident: { primary: '#6366f1', light: '#e0e7ff', dark: '#4f46e5' },
  ems_provider: { primary: '#ef4444', light: '#fee2e2', dark: '#dc2626' },
  technician: { primary: '#84cc16', light: '#ecfccb', dark: '#65a30d' },
} as const;

// ============================================================================
// Typography System
// ============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

// ============================================================================
// Spacing System
// ============================================================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

// ============================================================================
// Border Radius System
// ============================================================================

export const radii = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// Shadow/Elevation System
// ============================================================================

export const elevation = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// ============================================================================
// Breakpoint System
// ============================================================================

export const breakpoints = {
  sm: '640px',      // Mobile landscape
  md: '768px',      // Tablet portrait
  lg: '1024px',     // Tablet landscape / small laptop
  xl: '1280px',     // Desktop
  '2xl': '1536px',  // Large desktop
  '3xl': '1920px',  // Full HD
  ultrawide: '2560px', // Ultrawide
} as const;

// ============================================================================
// Z-Index System
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1700,
  tooltip: 1800,
  commandPalette: 1900,
} as const;

// ============================================================================
// Animation System
// ============================================================================

export const animation = {
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// Layout Constants
// ============================================================================

export const layout = {
  sidebar: {
    width: '232px',
    collapsedWidth: '56px',
  },
  header: {
    height: '52px',
    workspaceHeight: '44px',
    commandBarHeight: '40px',
  },
  content: {
    maxWidth: '1400px',
    gutter: '24px',
  },
  touchTarget: {
    min: '44px',
  },
} as const;

// ============================================================================
// CSS Custom Properties Generator
// ============================================================================

export function generateCSSCustomProperties() {
  return {
    // Colors
    '--color-primary': colors.primary[500],
    '--color-primary-light': colors.primary[100],
    '--color-primary-dark': colors.primary[700],
    '--color-success': colors.success.DEFAULT,
    '--color-warning': colors.warning.DEFAULT,
    '--color-error': colors.error.DEFAULT,
    '--color-info': colors.info.DEFAULT,

    // Typography
    '--font-family-sans': typography.fontFamily.sans,
    '--font-family-mono': typography.fontFamily.mono,
    '--font-size-base': typography.fontSize.base,

    // Spacing
    '--spacing-1': spacing[1],
    '--spacing-2': spacing[2],
    '--spacing-3': spacing[3],
    '--spacing-4': spacing[4],
    '--spacing-6': spacing[6],
    '--spacing-8': spacing[8],

    // Layout
    '--sidebar-width': layout.sidebar.width,
    '--sidebar-collapsed-width': layout.sidebar.collapsedWidth,
    '--header-height': layout.header.height,
    '--workspace-header-height': layout.header.workspaceHeight,
    '--command-bar-height': layout.header.commandBarHeight,
    '--content-max-width': layout.content.maxWidth,
    '--content-gutter': layout.content.gutter,

    // Z-Index
    '--z-sidebar': zIndex.docked,
    '--z-header': zIndex.sticky,
    '--z-modal': zIndex.modal,
    '--z-toast': zIndex.toast,
    '--z-command-palette': zIndex.commandPalette,
  };
}
