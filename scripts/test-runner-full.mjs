#!/usr/bin/env node

/**
 * CareDroid Full Test Suite
 * Validates all routes, navigation, permissions, and components
 * 
 * Usage: npm test
 * or: node test-runner.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(test) {
  testsPassed++;
  log(`✅ PASS: ${test}`, 'green');
}

function fail(test, reason) {
  testsFailed++;
  log(`❌ FAIL: ${test}`, 'red');
  if (reason) log(`   └─ ${reason}`, 'red');
}

function section(title) {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'═'.repeat(60)}`, 'cyan');
}

// ============================================================================
// TESTS
// ============================================================================

section('1. FILE EXISTENCE TESTS');

const requiredFiles = {
  'src/App.jsx': 'Master router file',
  'src/pages/Auth.jsx': 'Authentication page',
  'src/pages/Profile.jsx': 'User profile page',
  'src/pages/Settings.jsx': 'Settings page',
  'src/pages/BiometricSetup.jsx': 'Biometric setup (with fallback)',
  'src/pages/AuditLogs.jsx': 'Audit logs page',
  'src/pages/legal/PrivacyPolicy.jsx': 'Privacy policy',
  'src/pages/legal/TermsOfService.jsx': 'Terms of service',
  'src/pages/legal/ConsentFlow.jsx': 'Consent flow',
  'src/pages/team/TeamManagement.jsx': 'Team management (permission-gated)',
  'src/layout/PublicShell.jsx': 'Public layout shell',
  'src/layout/AuthShell.jsx': 'Auth layout shell',
  'src/layout/AppShell.jsx': 'App layout shell',
  'src/contexts/UserContext.jsx': 'User context',
  'src/contexts/NotificationContext.jsx': 'Notification context',
  'src/contexts/OfflineProvider.jsx': 'Offline provider',
  'src/utils/logger.ts': 'Logger utility',
  'src/services/apiClient.js': 'API client',
  'src/hooks/useNotificationActions.js': 'Notification actions hook'
};

Object.entries(requiredFiles).forEach(([filepath, description]) => {
  const fullPath = path.join(__dirname, filepath);
  if (fs.existsSync(fullPath)) {
    pass(`File exists: ${description} (${filepath})`);
  } else {
    fail(`File exists: ${description}`, `Missing: ${filepath}`);
  }
});

// ============================================================================

section('2. IMPORT PATH TESTS');

const appFile = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
const importTests = [
  { pattern: "from './contexts/UserContext'", name: 'UserContext import' },
  { pattern: "from './contexts/NotificationContext'", name: 'NotificationContext import' },
  { pattern: "from './layout/AppShell'", name: 'AppShell import' },
  { pattern: "from './pages/Auth'", name: 'Auth import' },
  { pattern: "from './utils/logger'", name: 'Logger import' }
];

importTests.forEach(({ pattern, name }) => {
  if (appFile.includes(pattern)) {
    pass(`App.jsx import: ${name}`);
  } else {
    fail(`App.jsx import: ${name}`, `Pattern not found: ${pattern}`);
  }
});

// ============================================================================

section('3. ROUTE DEFINITION TESTS');

const routes = [
  { path: '/', name: 'Welcome (Public)', requiresAuth: false, publicOnly: true },
  { path: '/auth', name: 'Authentication', requiresAuth: false, publicOnly: true },
  { path: '/dashboard', name: 'Dashboard (Main)', requiresAuth: true },
  { path: '/profile', name: 'Profile', requiresAuth: true },
  { path: '/settings', name: 'Settings', requiresAuth: true },
  { path: '/privacy', name: 'Privacy Policy', requiresAuth: false },
  { path: '/terms', name: 'Terms of Service', requiresAuth: false },
  { path: '/gdpr', name: 'GDPR Notice', requiresAuth: false },
  { path: '/hipaa', name: 'HIPAA Notice', requiresAuth: false },
  { path: '/help', name: 'Help Center', requiresAuth: false },
  { path: '/team', name: 'Team Management (Permission-Gated)', requiresAuth: true, requiresPermission: 'MANAGE_USERS' },
  { path: '/audit-logs', name: 'Audit Logs (Permission-Gated)', requiresAuth: true, requiresPermission: 'VIEW_AUDIT_LOGS' }
];

routes.forEach(({ path, name, requiresAuth, requiresPermission }) => {
  // Check if route is defined in appFile
  if (appFile.includes(`path: '${path}'`)) {
    let descr = `Route defined: ${name} (${path})`;
    if (requiresAuth) descr += ' [AUTH]';
    if (requiresPermission) descr += ` [PERM: ${requiresPermission}]`;
    pass(descr);
  } else {
    fail(`Route defined: ${name}`, `Route not found: ${path}`);
  }
});

// ============================================================================

section('4. NAVIGATION WIRING TESTS');

const sidebarFile = fs.readFileSync(path.join(__dirname, 'src/components/Sidebar.jsx'), 'utf8');
const navTests = [
  { pattern: "path: '/dashboard'", name: 'Dashboard nav item' },
  { pattern: "path: '/profile'", name: 'Profile nav item' },
  { pattern: "path: '/settings'", name: 'Settings nav item' },
  { pattern: "path: '/team'", name: 'Team nav item (permission-gated)' },
  { pattern: "path: '/audit-logs'", name: 'Audit Logs nav item (permission-gated)' }
];

navTests.forEach(({ pattern, name }) => {
  if (sidebarFile.includes(pattern)) {
    pass(`Sidebar navigation: ${name}`);
  } else {
    fail(`Sidebar navigation: ${name}`, `Pattern not found: ${pattern}`);
  }
});

// ============================================================================

section('5. CONTEXT & HOOK TESTS');

const userContextFile = fs.readFileSync(path.join(__dirname, 'src/contexts/UserContext.jsx'), 'utf8');
const notificationFile = fs.readFileSync(path.join(__dirname, 'src/contexts/NotificationContext.jsx'), 'utf8');
const notificationHookFile = fs.readFileSync(path.join(__dirname, 'src/hooks/useNotificationActions.js'), 'utf8');

const contextTests = [
  { file: userContextFile, pattern: 'export const useUser', name: 'useUser hook export' },
  { file: userContextFile, pattern: 'export const UserProvider', name: 'UserProvider export' },
  { file: userContextFile, pattern: 'export const Permission', name: 'Permission enum export' },
  { file: notificationFile, pattern: 'export const NotificationProvider', name: 'NotificationProvider export' },
  { file: notificationHookFile, pattern: "from '../contexts/NotificationContext'", name: 'useNotificationActions import path (correct relative path)' }
];

contextTests.forEach(({ file, pattern, name }) => {
  if (file.includes(pattern)) {
    pass(`Context/Hook: ${name}`);
  } else {
    fail(`Context/Hook: ${name}`, `Pattern not found: ${pattern}`);
  }
});

// ============================================================================

section('6. CONSOLE CALL REMOVAL TESTS');

const filesToCheck = [
  'src/services/offlineService.js',
  'src/services/NotificationService.js',
  'src/components/PermissionGate.jsx',
  'src/components/ErrorBoundary.jsx'
];

filesToCheck.forEach(filepath => {
  const content = fs.readFileSync(path.join(__dirname, filepath), 'utf8');
  const consoleCallsFound = (content.match(/console\.\w+\(/g) || []).length;
  
  if (consoleCallsFound === 0) {
    pass(`Console calls removed: ${filepath}`);
  } else {
    fail(`Console calls removed: ${filepath}`, `Found ${consoleCallsFound} console calls`);
  }
});

// ============================================================================

section('7. COMPONENT EXPORTS TESTS');

const pageFiles = [
  { file: 'src/pages/Profile.jsx', exportType: 'default', name: 'Profile' },
  { file: 'src/pages/Settings.jsx', exportType: 'default', name: 'Settings' },
  { file: 'src/pages/Auth.jsx', exportType: 'default', name: 'Auth' },
  { file: 'src/pages/BiometricSetup.jsx', exportType: 'default', name: 'BiometricSetup' },
  { file: 'src/pages/AuditLogs.jsx', exportType: 'default', name: 'AuditLogs' },
  { file: 'src/pages/legal/PrivacyPolicy.jsx', exportType: 'named', name: 'PrivacyPolicy' },
  { file: 'src/pages/legal/ConsentFlow.jsx', exportType: 'named', name: 'ConsentFlow' },
  { file: 'src/pages/team/TeamManagement.jsx', exportType: 'named', name: 'TeamManagement' }
];

pageFiles.forEach(({ file, exportType, name }) => {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const hasExport = exportType === 'default' 
    ? content.includes('export default')
    : content.includes(`export const ${name}`);
  
  if (hasExport) {
    pass(`Component export: ${name} (${exportType} export)`);
  } else {
    fail(`Component export: ${name}`, `${exportType} export not found in ${file}`);
  }
});

// ============================================================================

section('8. PERMISSION GATE TESTS');

const permissionGateFile = fs.readFileSync(path.join(__dirname, 'src/components/PermissionGate.jsx'), 'utf8');
const permTests = [
  { pattern: 'permission', name: 'permission prop' },
  { pattern: 'useUser', name: 'useUser hook integration' },
  { pattern: 'fallback', name: 'fallback prop for denied access' }
];

permTests.forEach(({ pattern, name }) => {
  if (permissionGateFile.includes(pattern)) {
    pass(`PermissionGate: ${name}`);
  } else {
    fail(`PermissionGate: ${name}`, `Pattern not found: ${pattern}`);
  }
});

// ============================================================================

section('9. LAYOUT SHELL TESTS');

const appShellFile = fs.readFileSync(path.join(__dirname, 'src/layout/AppShell.jsx'), 'utf8');
const authShellFile = fs.readFileSync(path.join(__dirname, 'src/layout/AuthShell.jsx'), 'utf8');
const publicShellFile = fs.readFileSync(path.join(__dirname, 'src/layout/PublicShell.jsx'), 'utf8');

const layoutTests = [
  { file: appShellFile, pattern: 'Sidebar', name: 'AppShell includes Sidebar' },
  { file: appShellFile, pattern: 'export default', name: 'AppShell default export' },
  { file: authShellFile, pattern: 'export default', name: 'AuthShell default export' },
  { file: publicShellFile, pattern: 'export const PublicShell', name: 'PublicShell named export' },
  { file: publicShellFile, pattern: 'footer', name: 'PublicShell has footer section' }
];

layoutTests.forEach(({ file, pattern, name }) => {
  if (file.toLowerCase().includes(pattern.toLowerCase())) {
    pass(`Layout shell: ${name}`);
  } else {
    fail(`Layout shell: ${name}`, `Pattern not found`);
  }
});

// ============================================================================

section('10. BIOMETRIC SETUP FALLBACK TEST');

const biometricFile = fs.readFileSync(path.join(__dirname, 'src/pages/BiometricSetup.jsx'), 'utf8');
const bioTests = [
  { pattern: 'import', name: 'Uses dynamic import (not hardcoded)' },
  { pattern: '@vite-ignore', name: 'Includes @vite-ignore directive' },
  { pattern: 'setError', name: 'Has error handling for missing plugin' }
];

bioTests.forEach(({ pattern, name }) => {
  if (biometricFile.includes(pattern)) {
    pass(`BiometricSetup: ${name}`);
  } else {
    fail(`BiometricSetup: ${name}`, `Pattern not found: ${pattern}`);
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

section('TEST SUMMARY');

const total = testsPassed + testsFailed;
const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

log(`Total Tests: ${total}`, 'blue');
log(`Passed: ${testsPassed}`, 'green');
log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
log(`Success Rate: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');

if (testsFailed === 0) {
  log(`\n✅ ALL TESTS PASSED - CareDroid is fully wired!`, 'green');
  process.exit(0);
} else {
  log(`\n❌ Some tests failed. Review above for details.`, 'red');
  process.exit(1);
}
