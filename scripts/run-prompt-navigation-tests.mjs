/**
 * Portable runner for promptNavigationIntent tests (no esbuild/vitest).
 * Loads the real TS modules via typescript.transpileModule + a tiny ESM loader.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.tmp-prompt-nav-tests');
const reportPath = path.join(root, 'qa', 'prompt-navigation-test-report.json');
const reportMd = path.join(root, 'qa', 'prompt-navigation-test-report.md');

const require = createRequire(import.meta.url);

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function transpileFile(relPath) {
  const abs = path.join(root, relPath);
  const source = fs.readFileSync(abs, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      verbatimModuleSyntax: false,
    },
    fileName: abs,
    reportDiagnostics: true,
  });
  if (result.diagnostics?.length) {
    const msgs = result.diagnostics.map((d) =>
      typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText,
    );
    throw new Error(`Transpile failed for ${relPath}:\n${msgs.join('\n')}`);
  }
  // Rewrite relative imports to .js under outDir
  let code = result.outputText;
  code = code.replace(/from\s+['"](\.\.?\/[^'"]+)['"]/g, (full, spec) => {
    // Type-only imports already stripped; rewrite path to .js
    let next = spec;
    if (!next.endsWith('.js') && !next.endsWith('.json')) {
      // drop .ts if present
      next = next.replace(/\.tsx?$/, '');
      next = `${next}.js`;
    }
    return `from '${next}'`;
  });
  const outRel = relPath.replace(/\.tsx?$/, '.js');
  const outAbs = path.join(outDir, outRel);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, code, 'utf8');
  return outAbs;
}

// Minimal stubs for type-only modules that may remain as value imports after transpile
function writeStub(relPath, body) {
  const outAbs = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, body, 'utf8');
}

cleanDir(outDir);

// Real modules needed by promptNavigationIntent
transpileFile('src/config/routes.config.ts');
// Type-only deps — stub empty so any residual import is harmless
writeStub(
  'src/contracts/interactiveAi.js',
  'export const AI_ACTION_PROPOSAL_STATES = []; export default {};\n',
);
writeStub('src/services/interactiveAi/actionProposalService.js', 'export default {};\n');
const intentOut = transpileFile('src/services/interactiveAi/promptNavigationIntent.ts');

// Also transpile aiCommandRegistry (self-contained enough with a risk-level type stub)
const registryOut = transpileFile('src/services/interactiveAi/aiCommandRegistry.ts');

const mod = await import(pathToFileURL(intentOut).href);
const registry = await import(pathToFileURL(registryOut).href);
const routesMod = await import(
  pathToFileURL(path.join(outDir, 'src/config/routes.config.js')).href
);

const {
  applyNavigationProposal,
  isNavigationProposalTool,
  looksLikeNavigationPrompt,
  resolvePromptNavigationIntent,
  listPromptNavigationCatalog,
  navigationIntentToProposalInput,
} = mod;
const { CANONICAL_ROUTES } = routesMod;
const { AI_PALETTE_COMMANDS, getAiPaletteCommand, isAiPaletteCommandId, listAiPaletteCommands } =
  registry;

const PERMS = ['use_ai_chat', 'view_phi', 'view_operations'];
const results = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, status: 'FAIL', message });
    console.log(`  ✗ ${name}`);
    console.log(`    ${message}`);
  }
}

console.log('\n=== promptNavigationIntent (real module) ===\n');

test('exposes a non-empty closed catalog with unique ids', () => {
  const catalog = listPromptNavigationCatalog();
  assert.ok(catalog.length > 8);
  const ids = catalog.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of catalog) {
    assert.ok(entry.keywords.length > 0);
    if (entry.toolName === 'open_panel') assert.ok(entry.panelEvent);
    else assert.ok(entry.path);
  }
});

test('resolves open reception desk prompts', () => {
  const intent = resolvePromptNavigationIntent('Open reception desk', {
    role: 'registration_clerk',
    permissions: PERMS,
  });
  assert.equal(intent?.id, 'nav-reception');
  assert.equal(intent?.path, CANONICAL_ROUTES.emergencyReception);
  assert.equal(intent?.toolName, 'open_route');
});

test('resolves whiteboard and HEART score', () => {
  assert.equal(
    resolvePromptNavigationIntent('open the whiteboard', {
      role: 'charge_nurse',
      permissions: PERMS,
    })?.id,
    'nav-whiteboard',
  );
  const heart = resolvePromptNavigationIntent('Launch HEART score for this patient', {
    role: 'physician',
    permissions: PERMS,
  });
  assert.equal(heart?.id, 'nav-heart-score');
  assert.equal(heart?.toolName, 'open_tool');
  assert.ok(heart?.path.includes('heart-score'));
});

test('resolves reception panel intents (OCR, lookup, shift clearance)', () => {
  assert.equal(
    resolvePromptNavigationIntent('show OCR document scan', {
      role: 'registration_clerk',
      permissions: PERMS,
    })?.panelEvent,
    'open-reception-smart-intake',
  );
  assert.equal(
    resolvePromptNavigationIntent('focus patient lookup', {
      role: 'registration_clerk',
      permissions: PERMS,
    })?.panelEvent,
    'open-reception-lookup',
  );
  assert.equal(
    resolvePromptNavigationIntent('open shift clearance', {
      role: 'registration_clerk',
      permissions: PERMS,
    })?.panelEvent,
    'open-reception-shift-clearance',
  );
});

test('returns null for unknown / question prompts (chat path)', () => {
  assert.equal(
    resolvePromptNavigationIntent('What is ESI level 2?', {
      role: 'registration_clerk',
      permissions: PERMS,
    }),
    null,
  );
  assert.equal(
    resolvePromptNavigationIntent('explain missing insurance fields', {
      role: 'registration_clerk',
      permissions: PERMS,
    }),
    null,
  );
  assert.equal(
    resolvePromptNavigationIntent('open the secret admin shell /evil', {
      role: 'admin',
      permissions: PERMS,
    }),
    null,
  );
});

test('denies clinical calculators for registration clerk', () => {
  assert.equal(
    resolvePromptNavigationIntent('open HEART score', {
      role: 'registration_clerk',
      permissions: PERMS,
    }),
    null,
  );
  assert.equal(
    resolvePromptNavigationIntent('open HEART score', {
      role: 'physician',
      permissions: PERMS,
    })?.id,
    'nav-heart-score',
  );
});

test('requires permission held by the user', () => {
  assert.equal(
    resolvePromptNavigationIntent('open reception', {
      role: 'registration_clerk',
      permissions: ['use_ai_chat'],
    }),
    null,
  );
  assert.equal(
    resolvePromptNavigationIntent('open reception', {
      role: 'registration_clerk',
      permissions: ['view_operations'],
    })?.id,
    'nav-reception',
  );
});

test('builds proposal input from intent without inventing paths', () => {
  const intent = resolvePromptNavigationIntent('open reception', {
    role: 'registration_clerk',
    permissions: PERMS,
  });
  const input = navigationIntentToProposalInput(intent, {
    originatingRequestId: 'req-1',
    correlationId: 'corr-1',
    role: 'registration_clerk',
  });
  assert.equal(input.toolName, 'open_route');
  assert.equal(input.validatedArguments.path, CANONICAL_ROUTES.emergencyReception);
  assert.equal(input.model, 'prompt-navigation-catalog');
});

test('navigates for open_route', () => {
  const calls = [];
  const result = applyNavigationProposal(
    {
      toolName: 'open_route',
      validatedArguments: {
        path: CANONICAL_ROUTES.emergencyReception,
        label: 'Open Reception desk',
      },
    },
    { navigate: (p) => calls.push(p) },
  );
  assert.deepEqual(calls, [CANONICAL_ROUTES.emergencyReception]);
  assert.equal(result.ok, true);
});

test('dispatches panel events when already on reception', () => {
  const nav = [];
  const events = [];
  applyNavigationProposal(
    {
      toolName: 'open_panel',
      validatedArguments: {
        path: CANONICAL_ROUTES.emergencyReception,
        panelEvent: 'open-reception-lookup',
        label: 'Focus patient lookup',
      },
    },
    {
      navigate: (p) => nav.push(p),
      currentPath: CANONICAL_ROUTES.emergencyReception,
      dispatchDocumentEvent: (name) => events.push(name),
    },
  );
  assert.equal(nav.length, 0);
  assert.deepEqual(events, ['open-reception-lookup']);
});

test('navigates then dispatches when not on reception', async () => {
  const nav = [];
  const events = [];
  applyNavigationProposal(
    {
      toolName: 'open_panel',
      validatedArguments: {
        path: CANONICAL_ROUTES.emergencyReception,
        panelEvent: 'open-reception-smart-intake',
        label: 'OCR',
      },
    },
    {
      navigate: (p) => nav.push(p),
      currentPath: '/emergency/whiteboard',
      dispatchDocumentEvent: (name) => events.push(name),
    },
  );
  assert.deepEqual(nav, [CANONICAL_ROUTES.emergencyReception]);
  assert.equal(events.length, 0);
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(events, ['open-reception-smart-intake']);
});

test('identifies navigation tool names', () => {
  assert.equal(isNavigationProposalTool('open_route'), true);
  assert.equal(isNavigationProposalTool('open_tool'), true);
  assert.equal(isNavigationProposalTool('open_panel'), true);
  assert.equal(isNavigationProposalTool('draft_note'), false);
});

test('looksLikeNavigationPrompt gates questions vs open phrases', () => {
  assert.equal(looksLikeNavigationPrompt('open reception'), true);
  assert.equal(looksLikeNavigationPrompt('What is ESI 2?'), false);
});

console.log('\n=== aiCommandRegistry (open palette entries) ===\n');

test('registry is frozen with unique ids and non-empty queries', () => {
  assert.equal(Object.isFrozen(AI_PALETTE_COMMANDS), true);
  const ids = AI_PALETTE_COMMANDS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const command of AI_PALETTE_COMMANDS) {
    assert.ok(command.query.trim().length > 10);
    assert.ok(['use_ai_chat', 'view_operations'].includes(command.requiredPermission));
  }
});

test('includes AI open-route palette commands', () => {
  assert.ok(isAiPaletteCommandId('ai-open-reception'));
  assert.ok(isAiPaletteCommandId('ai-open-patient-lookup'));
  assert.ok(isAiPaletteCommandId('ai-open-ocr-scan'));
  assert.ok(isAiPaletteCommandId('ai-open-whiteboard'));
  assert.equal(getAiPaletteCommand('ai-open-reception')?.query, 'Open reception desk');
  assert.equal(getAiPaletteCommand('ai-open-whiteboard')?.query, 'Open the whiteboard');
});

test('open palette commands require view_operations and are listable', () => {
  const listed = listAiPaletteCommands({
    permissions: ['view_operations'],
    channel: 'reception',
  });
  const ids = listed.map((c) => c.id);
  assert.ok(ids.includes('ai-open-reception'));
  assert.ok(ids.includes('ai-open-patient-lookup'));
  const denied = listAiPaletteCommands({
    permissions: ['use_ai_chat'],
    channel: 'reception',
  }).map((c) => c.id);
  assert.ok(!denied.includes('ai-open-reception'));
});

test('unknown palette ids are refused', () => {
  assert.equal(getAiPaletteCommand('not-a-command'), undefined);
  assert.equal(isAiPaletteCommandId('rm -rf /'), false);
});

// Wire-check: workspace + reception listeners (source inspection)
console.log('\n=== wiring checks (source) ===\n');

test('InteractiveAIWorkspace imports and uses navigation execute path', () => {
  const src = fs.readFileSync(
    path.join(root, 'src/components/interactive-ai/InteractiveAIWorkspace.tsx'),
    'utf8',
  );
  assert.match(src, /resolvePromptNavigationIntent/);
  assert.match(src, /applyNavigationProposal/);
  assert.match(src, /isNavigationProposalTool/);
  assert.match(src, /useNavigate/);
  assert.match(src, /action-proposal-approve/);
});

test('ReceptionWorkspace listens for lookup and shift-clearance events', () => {
  const src = fs.readFileSync(
    path.join(root, 'src/pages/emergency/ReceptionWorkspace.tsx'),
    'utf8',
  );
  assert.match(src, /open-reception-lookup/);
  assert.match(src, /open-reception-shift-clearance/);
  assert.match(src, /open-reception-smart-intake/);
});

const summary = {
  generatedAt: new Date().toISOString(),
  runner: 'scripts/run-prompt-navigation-tests.mjs',
  note: 'Vitest blocked in this environment (esbuild.exe Application Control). This runner executes the real transpiled modules.',
  totals: { passed, failed, total: passed + failed },
  grade: failed === 0 ? 'PASS' : 'FAIL',
  results,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');

const md = [
  '# Prompt navigation test report',
  '',
  `**Generated:** ${summary.generatedAt}`,
  `**Result:** **${summary.grade}** (${passed} passed, ${failed} failed, ${passed + failed} total)`,
  '',
  summary.note,
  '',
  '| Status | Test |',
  '|--------|------|',
  ...results.map(
    (r) => `| ${r.status} | ${r.name}${r.message ? ` — ${r.message.replace(/\|/g, '/')}` : ''} |`,
  ),
  '',
].join('\n');
fs.writeFileSync(reportMd, md, 'utf8');

console.log('\n=== SUMMARY ===');
console.log(`  ${summary.grade}: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`  Report: qa/prompt-navigation-test-report.md`);
console.log(`  JSON:   qa/prompt-navigation-test-report.json\n`);

process.exit(failed > 0 ? 1 : 0);
