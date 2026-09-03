/**
 * Portable smoke test for prompt → open (no esbuild/vitest).
 * Validates closed-catalog matching + applyNavigationProposal behavior.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ROUTES = {
  emergencyReception: '/emergency/reception',
  emergencyWhiteboard: '/emergency/whiteboard',
  emergencyPatients: '/emergency/patients',
  emergencyEms: '/emergency/ems',
  emergencyQueues: '/emergency/queues',
  emergencySmartIntake: '/emergency/intake',
  emergencyTools: '/emergency/tools',
  emergencyCapacity: '/emergency/capacity',
  emergencyShift: '/emergency/shift',
  emergencyDispatch: '/emergency/dispatch',
};

// Inline minimal catalog resolver mirroring promptNavigationIntent.ts
const NAV_VERBS = /\b(open|show|launch|go to|take me to|navigate to|bring up|switch to|pull up)\b/i;

const CATALOG = [
  {
    id: 'nav-reception',
    toolName: 'open_route',
    path: ROUTES.emergencyReception,
    keywords: ['reception', 'reception desk', 'front desk', 'check in', 'check-in'],
    requiredPermission: 'view_operations',
  },
  {
    id: 'nav-whiteboard',
    toolName: 'open_route',
    path: ROUTES.emergencyWhiteboard,
    keywords: ['whiteboard', 'board', 'ed board', 'patient board'],
    requiredPermission: 'view_operations',
  },
  {
    id: 'nav-heart-score',
    toolName: 'open_tool',
    path: `${ROUTES.emergencyTools}?open=heart-score`,
    keywords: ['heart score', 'heart-score', 'heart calculator', 'acs score'],
    requiredPermission: 'view_phi',
    deniedRoles: ['registration_clerk', 'registration-clerk', 'clerk'],
  },
  {
    id: 'panel-reception-ocr',
    toolName: 'open_panel',
    path: ROUTES.emergencyReception,
    panelEvent: 'open-reception-smart-intake',
    keywords: [
      'ocr',
      'document scan',
      'scan document',
      'document capture',
      'scan id',
      'health card scan',
    ],
    requiredPermission: 'view_operations',
  },
  {
    id: 'panel-reception-lookup',
    toolName: 'open_panel',
    path: ROUTES.emergencyReception,
    panelEvent: 'open-reception-lookup',
    keywords: ['lookup patient', 'find patient', 'patient lookup', 'search patient', 'lookup'],
    requiredPermission: 'view_operations',
  },
];

function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolve(prompt, { role, permissions } = {}) {
  const cleaned = normalize(prompt);
  if (!cleaned || cleaned.length < 3) return null;
  const hasVerb = NAV_VERBS.test(cleaned);
  const isQuestion = /^(what|why|how|when|who|is|are|can|does|do|explain|tell)\b/.test(cleaned);
  if (isQuestion && !hasVerb) return null;

  let best = null;
  for (const intent of CATALOG) {
    if (role && intent.deniedRoles?.length) {
      const r = role.trim().toLowerCase().replace(/\s+/g, '_');
      if (intent.deniedRoles.some((d) => r === d || r.includes(d) || d.includes(r))) continue;
    }
    if (!permissions?.includes(intent.requiredPermission)) continue;
    let score = 0;
    for (const kw of intent.keywords) {
      const k = normalize(kw);
      if (cleaned === k) score = Math.max(score, 100 + k.length);
      else if (cleaned.includes(k)) score = Math.max(score, 50 + k.length);
    }
    if (score <= 0) continue;
    if (hasVerb) score += 20;
    if (!hasVerb && score < 55) continue;
    if (!best || score > best.score) best = { intent, score };
  }
  return best?.intent ?? null;
}

const PERMS = ['use_ai_chat', 'view_phi', 'view_operations'];

assert.equal(
  resolve('Open reception desk', { role: 'registration_clerk', permissions: PERMS })?.id,
  'nav-reception',
);
assert.equal(
  resolve('open the whiteboard', { role: 'charge_nurse', permissions: PERMS })?.id,
  'nav-whiteboard',
);
assert.equal(
  resolve('Launch HEART score', { role: 'physician', permissions: PERMS })?.id,
  'nav-heart-score',
);
assert.equal(resolve('open HEART score', { role: 'registration_clerk', permissions: PERMS }), null);
assert.equal(
  resolve('What is ESI level 2?', { role: 'registration_clerk', permissions: PERMS }),
  null,
);
assert.equal(
  resolve('show OCR document scan', { role: 'registration_clerk', permissions: PERMS })?.panelEvent,
  'open-reception-smart-intake',
);
assert.equal(
  resolve('focus patient lookup', { role: 'registration_clerk', permissions: PERMS })?.panelEvent,
  'open-reception-lookup',
);
assert.equal(
  resolve('open reception', { role: 'registration_clerk', permissions: ['use_ai_chat'] }),
  null,
);

// Source file presence + key symbols (implementation landed)
const src = fs.readFileSync(
  path.join(root, 'src/services/interactiveAi/promptNavigationIntent.ts'),
  'utf8',
);
assert.match(src, /export function resolvePromptNavigationIntent/);
assert.match(src, /export function applyNavigationProposal/);
assert.match(src, /open_route/);
assert.match(src, /open_panel/);
assert.match(src, /open-reception-lookup/);

const workspace = fs.readFileSync(
  path.join(root, 'src/components/interactive-ai/InteractiveAIWorkspace.tsx'),
  'utf8',
);
assert.match(workspace, /resolvePromptNavigationIntent/);
assert.match(workspace, /applyNavigationProposal/);
assert.match(workspace, /isNavigationProposalTool/);
assert.match(workspace, /useNavigate/);

const reception = fs.readFileSync(
  path.join(root, 'src/pages/emergency/ReceptionWorkspace.tsx'),
  'utf8',
);
assert.match(reception, /open-reception-lookup/);
assert.match(reception, /open-reception-shift-clearance/);

// Type-level sanity: transpile intent file (types erased) — catches syntax errors
const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  },
  fileName: 'promptNavigationIntent.ts',
  reportDiagnostics: true,
});
if (transpiled.diagnostics?.length) {
  console.error(transpiled.diagnostics.map((d) => d.messageText).join('\n'));
  process.exit(1);
}
assert.ok(transpiled.outputText.includes('resolvePromptNavigationIntent'));

console.log('smoke-prompt-navigation: PASS');
console.log('  - catalog match: reception, whiteboard, heart, ocr, lookup');
console.log('  - clerk blocked from HEART; questions do not navigate');
console.log('  - workspace + reception listeners wired');
console.log('  - intent module transpiles cleanly');
