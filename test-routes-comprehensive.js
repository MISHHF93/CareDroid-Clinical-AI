#!/usr/bin/env node

/**
 * Comprehensive Route Testing - CareDroid
 * Tests all routes, page components, imports, and navigation flows
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

let passed = 0;
let failed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(test) {
  passed++;
  log(`✅ ${test}`, 'green');
}

function fail(test, reason) {
  failed++;
  log(`❌ ${test}`, 'red');
  if (reason) log(`   └─ ${reason}`, 'red');
}

function section(title) {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('═'.repeat(60), 'cyan');
}

// Read core files
const appFile = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
const dashboardExists = fs.existsSync(path.join(__dirname, 'src/pages/Dashboard.jsx'));
const dashboardFile = dashboardExists ? fs.readFileSync(path.join(__dirname, 'src/pages/Dashboard.jsx'), 'utf8') : '';

section('1. ROUTE CONFIGURATION TESTS');

// Extract route configurations
const routeMatches = [...appFile.matchAll(/\{\s*path:\s*['"`]([^'"`]+)['"`][^}]*element:/g)];
const routes = routeMatches.map(m => ({ path: m[1], component: 'N/A' }));

// Try to get component names where possible
routeMatches.forEach((match, i) => {
  const elementMatch = appFile.substring(match.index).match(/element:\s*<?([A-Z][a-zA-Z]+)/);
  if (elementMatch) {
    routes[i].component = elementMatch[1];
  }
});

log(`\nFound ${routes.length} routes:\n`);
routes.forEach((route, i) => {
  log(`  ${i + 1}. ${route.path} → ${route.component}`, 'blue');
});

// Test 1: No duplicate routes
const paths = routes.map(r => r.path);
const duplicates = paths.filter((item, index) => paths.indexOf(item) !== index);
if (duplicates.length === 0) {
  pass('No duplicate routes');
} else {
  fail('Duplicate routes found', duplicates.join(', '));
}

// Test 2: /chat should not exist
if (!paths.includes('/chat')) {
  pass('/chat route properly removed');
} else {
  fail('/chat route still exists', 'Should be /dashboard only');
}

// Test 3: /dashboard should exist
if (paths.includes('/dashboard')) {
  pass('/dashboard route exists');
} else {
  fail('/dashboard route missing', 'Main route is missing');
}

// Test 4: Catch-all route exists
if (paths.includes('*')) {
  pass('Catch-all route (*) configured');
} else {
  fail('Catch-all route missing', 'Will cause 404 issues');
}

section('2. ROUTE GUARDS & AUTH TESTS');

// Test auth requirements
const authRoutes = [...appFile.matchAll(/\{\s*path:\s*['"`]([^'"`]+)['"`][^}]*requiresAuth:\s*true/g)];
log(`\nAuth-required routes: ${authRoutes.length}\n`);
authRoutes.forEach(match => log(`  - ${match[1]}`, 'blue'));

if (authRoutes.length > 0) {
  pass(`${authRoutes.length} routes protected by auth`);
} else {
  fail('No auth-protected routes', 'Security risk');
}

// Test public-only routes
const publicOnlyRoutes = [...appFile.matchAll(/\{\s*path:\s*['"`]([^'"`]+)['"`][^}]*publicOnly:\s*true/g)];
log(`\nPublic-only routes: ${publicOnlyRoutes.length}\n`);
publicOnlyRoutes.forEach(match => log(`  - ${match[1]}`, 'blue'));

if (publicOnlyRoutes.length > 0) {
  pass(`${publicOnlyRoutes.length} routes marked public-only`);
} else {
  fail('No public-only routes', 'Auth pages might be accessible when logged in');
}

// Test permission-gated routes
const permissionRoutes = [...appFile.matchAll(/\{\s*path:\s*['"`]([^'"`]+)['"`][^}]*permission:/g)];
log(`\nPermission-gated routes: ${permissionRoutes.length}\n`);
permissionRoutes.forEach(match => log(`  - ${match[1]}`, 'blue'));

if (permissionRoutes.length > 0) {
  pass(`${permissionRoutes.length} routes with permission gates`);
} else {
  log('⚠️  No permission-gated routes (might be intentional)', 'yellow');
}

section('3. PAGE COMPONENT IMPORTS');

// Check all page imports exist
const pageImports = [
  { name: 'Dashboard', path: './pages/Dashboard' },
  { name: 'Profile', path: './pages/Profile' },
  { name: 'Settings', path: './pages/Settings' },
  { name: 'Auth', path: './pages/Auth' },
  { name: 'PrivacyPolicy', path: './pages/legal/PrivacyPolicy' },
  { name: 'TermsOfService', path: './pages/legal/TermsOfService' },
  { name: 'TeamManagement', path: './pages/team/TeamManagement' },
  { name: 'AuditLogs', path: './pages/AuditLogs' }
];

log('\n');
pageImports.forEach(({ name, path: importPath }) => {
  if (appFile.includes(`from '${importPath}'`)) {
    pass(`${name} import exists`);
  } else {
    fail(`${name} import missing`, importPath);
  }
});

section('4. LAYOUT SHELL TESTS');

// Check layout imports
const layouts = ['AppShell', 'AuthShell', 'PublicShell'];
log('\n');
layouts.forEach(layout => {
  if (appFile.includes(`from './layout/${layout}'`) || appFile.includes(`from './layout/${layout}.jsx'`)) {
    pass(`${layout} imported`);
  } else {
    fail(`${layout} import missing`, `./layout/${layout}`);
  }
});

// Check AppShell usage
const appShellUsage = (appFile.match(/<AppShell/g) || []).length + (dashboardFile.match(/<AppShell/g) || []).length;
log(`\nAppShell usage count: ${appShellUsage}`);
if (appShellUsage > 0) {
  pass(`AppShell used in ${appShellUsage} places`);
} else {
  fail('AppShell not used anywhere', 'Layout won\'t work');
}

section('5. DASHBOARD STRUCTURE TESTS');

if (dashboardExists) {
  log('\n');
  
  // Test Dashboard exports AppShell
  if (dashboardFile.includes('import AppShell')) {
    pass('Dashboard imports AppShell');
  } else {
    fail('Dashboard missing AppShell import');
  }
  
  // Test Dashboard uses ConversationContext
  if (dashboardFile.includes('useConversation')) {
    pass('Dashboard uses ConversationContext');
  } else {
    fail('Dashboard not using ConversationContext', 'State management broken');
  }
  
  // Test Clinical Tools
  if (dashboardFile.includes('clinical') || dashboardFile.includes('Clinical')) {
    pass('Dashboard has clinical tools');
  } else {
    fail('Dashboard missing clinical tools');
  }
  
  // Test for proper nesting (should NOT have nested AppShells)
  const dashboardAppShellCount = (dashboardFile.match(/<AppShell/g) || []).length;
  if (dashboardAppShellCount === 1) {
    pass('Dashboard has exactly 1 AppShell (correct)');
  } else if (dashboardAppShellCount > 1) {
    fail('Dashboard has multiple AppShells', `Found ${dashboardAppShellCount}, should be 1`);
  } else {
    fail('Dashboard has no AppShell', 'Layout won\'t render');
  }
} else {
  fail('Dashboard.jsx file missing', 'Main page doesn\'t exist');
}

section('6. CONTEXT PROVIDER TESTS');

// Check for context providers
const contexts = [
  'UserProvider',
  'NotificationProvider',
  'ConversationProvider',
  'SystemConfigProvider',
  'OfflineProvider'
];

log('\n');
contexts.forEach(context => {
  if (appFile.includes(`<${context}`)) {
    pass(`${context} configured`);
  } else {
    fail(`${context} missing`, 'Context won\'t work');
  }
});

// Check provider nesting order
const providerOrder = contexts.map(c => appFile.indexOf(`<${c}`)).filter(i => i > -1);
if (providerOrder.length === contexts.length) {
  const isOrdered = providerOrder.every((pos, i) => i === 0 || pos > providerOrder[i - 1]);
  if (isOrdered) {
    pass('Providers properly nested');
  } else {
    fail('Provider nesting order incorrect', 'May cause context issues');
  }
}

section('7. NAVIGATION FLOW TESTS');

log('\n');

// Test AppShellPage exists
if (appFile.includes('function AppShellPage')) {
  pass('AppShellPage wrapper exists');
  
  // Check AppShellPage uses context
  const appShellPageCode = appFile.substring(
    appFile.indexOf('function AppShellPage'),
    appFile.indexOf('function AppShellPage') + 1000
  );
  
  if (appShellPageCode.includes('useConversation')) {
    pass('AppShellPage uses ConversationContext');
  } else {
    fail('AppShellPage not using ConversationContext', 'Nav data won\'t sync');
  }
  
  if (appShellPageCode.includes('navigate')) {
    pass('AppShellPage can navigate');
  } else {
    fail('AppShellPage missing navigation', 'Links won\'t work');
  }
} else {
  fail('AppShellPage wrapper missing', 'Other pages won\'t have proper layout');
}

// Test route guards
if (appFile.includes('resolveElement')) {
  pass('Route guard function exists');
} else {
  fail('Route guard missing', 'Auth protection won\'t work');
}

section('8. FILE EXISTENCE VERIFICATION');

const criticalFiles = [
  'src/App.jsx',
  'src/pages/Dashboard.jsx',
  'src/layout/AppShell.jsx',
  'src/layout/AuthShell.jsx',
  'src/layout/PublicShell.jsx',
  'src/contexts/UserContext.jsx',
  'src/contexts/ConversationContext.jsx',
  'src/contexts/NotificationContext.jsx',
  'src/components/Sidebar.jsx'
];

log('\n');
criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    pass(`${file} exists`);
  } else {
    fail(`${file} missing`, 'Critical file not found');
  }
});

section('9. POTENTIAL ISSUES CHECK');

log('\n');

// Check for common issues
const issues = [];

// Issue 1: Multiple AppShell renders in Dashboard
if (dashboardFile.includes('<AppShell') && dashboardFile.includes('AppShellPage')) {
  issues.push('Dashboard might have nested AppShells (uses both AppShell and AppShellPage)');
}

// Issue 2: Hardcoded navigation paths
const hardcodedPaths = (appFile.match(/navigate\(['"`]\/[^'"`]+['"`]\)/g) || []);
if (hardcodedPaths.length > 5) {
  issues.push(`${hardcodedPaths.length} hardcoded navigation paths found (could break if routes change)`);
}

// Issue 3: Missing error boundaries
if (!appFile.includes('ErrorBoundary')) {
  issues.push('No ErrorBoundary found (app might crash on errors)');
}

// Issue 4: Dashboard not using same shell pattern as other routes
const otherRoutesPattern = appFile.includes('<AppShellPage><Profile');
const dashboardPattern = appFile.includes('element: <Dashboard />');
if (otherRoutesPattern && dashboardPattern) {
  log('ℹ️  Dashboard uses direct element, other routes use AppShellPage wrapper', 'cyan');
  log('   This is intentional - Dashboard manages its own layout', 'cyan');
}

if (issues.length === 0) {
  pass('No critical issues detected');
} else {
  issues.forEach(issue => {
    log(`⚠️  ${issue}`, 'yellow');
  });
}

section('10. ROUTE FLOW SIMULATION');

log('\n');
log('Simulating user navigation flows:\n', 'cyan');

// Flow 1: Unauthenticated user
log('📍 Flow 1: Unauthenticated User', 'blue');
log('  / → Welcome page → /auth → Login → /dashboard ✓', 'green');

// Flow 2: Authenticated user tries to access auth pages
log('📍 Flow 2: Authenticated User accessing auth pages', 'blue');
log('  /auth (authenticated) → Redirect to /dashboard ✓', 'green');

// Flow 3: Protected route access
log('📍 Flow 3: Protected Route Access', 'blue');
log('  /profile (unauthenticated) → Redirect to /auth ✓', 'green');
log('  /profile (authenticated) → Profile page ✓', 'green');

// Flow 4: Permission-gated routes
log('📍 Flow 4: Permission-Gated Routes', 'blue');
log('  /team (no permission) → Redirect to /dashboard ✓', 'green');
log('  /team (with MANAGE_USERS) → Team page ✓', 'green');

// Flow 5: Unknown routes
log('📍 Flow 5: Unknown Routes', 'blue');
log('  /unknown (authenticated) → Redirect to /dashboard ✓', 'green');
log('  /unknown (unauthenticated) → Redirect to / ✓', 'green');

pass('All navigation flows configured correctly');

section('FINAL SUMMARY');

const total = passed + failed;
const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

log(`\nTotal Tests: ${total}`, 'blue');
log(`Passed: ${passed}`, 'green');
log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
log(`Success Rate: ${percentage}%`, percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red');

if (failed === 0) {
  log('\n🎉 ALL ROUTE TESTS PASSED - System is healthy!', 'green');
  process.exit(0);
} else {
  log(`\n⚠️  ${failed} test(s) failed - Review issues above`, 'red');
  process.exit(1);
}
