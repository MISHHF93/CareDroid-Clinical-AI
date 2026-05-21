#!/usr/bin/env node

/**
 * Route Health Check - CareDroid
 * Tests all routes and verifies they're configured correctly
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Read App.jsx and extract routes
const appFile = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');

// Extract routes from App.jsx
const routeMatches = [...appFile.matchAll(/\{\s*path:\s*['"`]([^'"`]+)['"`]/g)];
const routes = routeMatches.map(m => m[1]);

log('\n═══════════════════════════════════════', 'cyan');
log('  CAREDROID ROUTE HEALTH CHECK', 'cyan');
log('═══════════════════════════════════════', 'cyan');

log('\n📍 ROUTES FOUND:', 'yellow');
routes.forEach((route, index) => {
  log(`  ${index + 1}. ${route}`, 'green');
});

// Check for duplicates
const duplicates = routes.filter((item, index) => routes.indexOf(item) !== index);
if (duplicates.length > 0) {
  log('\n⚠️  DUPLICATE ROUTES FOUND:', 'red');
  duplicates.forEach(route => log(`  - ${route}`, 'red'));
} else {
  log('\n✅ No duplicate routes', 'green');
}

// Check for /chat
if (routes.includes('/chat')) {
  log('\n❌ ERROR: /chat route still exists! Should be /dashboard only.', 'red');
} else {
  log('\n✅ /chat route removed correctly', 'green');
}

// Check for /dashboard
if (routes.includes('/dashboard')) {
  log('✅ /dashboard route exists', 'green');
} else {
  log('❌ ERROR: /dashboard route missing!', 'red');
}

// Check Dashboard.jsx structure
log('\n🔍 CHECKING DASHBOARD STRUCTURE:', 'yellow');
const dashboardFile = fs.readFileSync(path.join(__dirname, 'src/pages/Dashboard.jsx'), 'utf8');

if (dashboardFile.includes('return (')) {
  log('  ✅ Dashboard has return statement', 'green');
}

if (dashboardFile.includes('<AppShell')) {
  log('  ✅ Dashboard renders AppShell', 'green');
}

if (dashboardFile.includes('Clinical Tools Sidebar')) {
  log('  ✅ Dashboard has Clinical Tools sidebar', 'green');
}

const appShellCount = (dashboardFile.match(/<AppShell/g) || []).length;
if (appShellCount === 1) {
  log(`  ✅ Dashboard has exactly 1 AppShell (correct)`, 'green');
} else {
  log(`  ⚠️  Dashboard has ${appShellCount} AppShell instances (expected 1)`, 'yellow');
}

// Check AppShellPage
log('\n🔍 CHECKING APPSHELLPAGE:', 'yellow');
if (appFile.includes('function AppShellPage')) {
  log('  ✅ AppShellPage function defined', 'green');
  
  const appShellPageMatch = appFile.match(/function AppShellPage[\s\S]*?^}/m);
  if (appShellPageMatch) {
    const appShellPageCode = appShellPageMatch[0];
    if (appShellPageCode.includes('<AppShell')) {
      log('  ✅ AppShellPage renders AppShell', 'green');
    }
    if (appShellPageCode.includes('useConversation')) {
      log('  ✅ AppShellPage uses ConversationContext', 'green');
    }
  }
}

// Summary
log('\n═══════════════════════════════════════', 'cyan');
log('  ROUTE HEALTH: ' + (duplicates.length === 0 && !routes.includes('/chat') && routes.includes('/dashboard') ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'), 
    duplicates.length === 0 && !routes.includes('/chat') && routes.includes('/dashboard') ? 'green' : 'yellow');
log('═══════════════════════════════════════\n', 'cyan');
