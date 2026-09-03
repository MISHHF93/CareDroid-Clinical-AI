#!/usr/bin/env node
/**
 * CareDroid architecture check — enforces structural rules the type system
 * cannot express.
 *
 * Today it enforces two:
 *
 *   1. No NEW import cycles. Cycles are not a style preference here: a module
 *      that calls into a partially-initialized module is exactly how
 *      `ReferenceError: Cannot access 'X' before initialization` reaches
 *      production. That was a real bug in this repository
 *      (unifiedWorkflowAutomationEngine, commit 71a8356f), and the module
 *      involved sits inside the largest cycle below.
 *
 *   2. No frontend -> backend source imports. src/ must never reach into
 *      backend/src/; the boundary is the HTTP API.
 *
 * Cycles are held to a BASELINE rather than zero. The existing ones are real
 * debt that needs deliberate, individually-verified refactors -- several run
 * through permission and role resolution -- and failing on them would make this
 * command permanently red and therefore ignored. New cycles fail immediately.
 *
 * Run: npm run architecture:check
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Raise this ONLY with a comment explaining why a new cycle is unavoidable.
 * Lower it whenever a cycle is genuinely broken -- that is the point.
 *
 * 9 -> 13 on 2026-09-03 without any dependency changing: IMPORT_PATTERN had
 * never seen a wrapped `import { ... } from` (see its comment), so the graph
 * was missing every multi-line import and the count was an undercount. The
 * real picture is 13 cycles / 66 modules, the largest a 35-module component
 * around src/central-node/careDroidCentralNode.ts. That is the debt to pay
 * down, and this number goes down as it is paid.
 */
const MAX_IMPORT_CYCLES = 13;

const SOURCE_ROOTS = ['src', 'backend/src'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'build', '.git']);
const EXTENSIONS = ['.ts', '.tsx'];

function collectSourceFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (!EXTENSIONS.some((ext) => entry.endsWith(ext))) continue;
    // Tests may legitimately import across boundaries to set up fixtures.
    if (/\.(test|spec)\./.test(entry)) continue;
    acc.push(relative(ROOT, full).split('\\').join('/'));
  }
  return acc;
}

const files = SOURCE_ROOTS.flatMap((root) => collectSourceFiles(join(ROOT, root)));
const fileSet = new Set(files);

// The specifier list may span lines (Prettier wraps long `import { a, b }`
// lists), so the clause between the keyword and `from` must be allowed to
// contain newlines. The single-line version of this pattern silently dropped
// every wrapped import from the graph; on 2026-09-03 a formatting-only commit
// then split one 15-module cycle into three smaller ones and "raised" the
// count from 9 to 12 without a single dependency changing. Quotes stay
// excluded so the clause can never cross a string and attach a later
// statement's specifier to an earlier keyword.
const IMPORT_PATTERN = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?[^'"]*?from\s*['"]([^'"]+)['"]/g;

function resolveImport(importer, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = relative(ROOT, resolvePath(dirname(join(ROOT, importer)), specifier))
    .split('\\')
    .join('/');
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    base,
  ]) {
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

const graph = new Map();
const crossBoundary = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    continue;
  }
  const targets = new Set();
  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1];
    if (file.startsWith('src/') && /(^|\/)backend\/src\//.test(specifier)) {
      crossBoundary.push({ file, specifier });
    }
    const target = resolveImport(file, specifier);
    if (target && target !== file) targets.add(target);
  }
  graph.set(file, targets);
}

// Tarjan's strongly-connected components, iterative to survive deep graphs.
const index = new Map();
const low = new Map();
const onStack = new Set();
const stack = [];
const cycles = [];
let counter = 0;

for (const start of files) {
  if (index.has(start)) continue;
  const work = [[start, [...(graph.get(start) || [])][Symbol.iterator]()]];
  index.set(start, counter);
  low.set(start, counter);
  counter += 1;
  stack.push(start);
  onStack.add(start);

  while (work.length) {
    const [node, iterator] = work[work.length - 1];
    let advanced = false;
    let step = iterator.next();
    while (!step.done) {
      const next = step.value;
      if (!index.has(next)) {
        index.set(next, counter);
        low.set(next, counter);
        counter += 1;
        stack.push(next);
        onStack.add(next);
        work.push([next, [...(graph.get(next) || [])][Symbol.iterator]()]);
        advanced = true;
        break;
      }
      if (onStack.has(next)) low.set(node, Math.min(low.get(node), index.get(next)));
      step = iterator.next();
    }
    if (advanced) continue;

    work.pop();
    if (work.length) {
      const parent = work[work.length - 1][0];
      low.set(parent, Math.min(low.get(parent), low.get(node)));
    }
    if (low.get(node) === index.get(node)) {
      const component = [];
      for (;;) {
        const member = stack.pop();
        onStack.delete(member);
        component.push(member);
        if (member === node) break;
      }
      if (component.length > 1) cycles.push(component.sort());
    }
  }
}

cycles.sort((a, b) => b.length - a.length);

const failures = [];
console.log('\nCareDroid architecture check\n');
console.log(`  modules analyzed: ${files.length}`);
console.log(`  import cycles:    ${cycles.length} (baseline ${MAX_IMPORT_CYCLES})`);
console.log(`  modules in cycles:${String(cycles.reduce((n, c) => n + c.length, 0)).padStart(4)}`);

if (cycles.length) {
  console.log('\n  largest cycles:');
  for (const cycle of cycles.slice(0, 3)) {
    console.log(`    - ${cycle.length} modules, e.g. ${cycle[0]}`);
  }
}

if (cycles.length > MAX_IMPORT_CYCLES) {
  failures.push(
    `import cycles rose to ${cycles.length}, above the baseline of ${MAX_IMPORT_CYCLES}. ` +
      'A new cycle was introduced. Break it, or raise MAX_IMPORT_CYCLES in ' +
      'scripts/architecture-check.mjs with a comment saying why it is unavoidable.',
  );
}

if (crossBoundary.length) {
  console.log('\n  frontend -> backend source imports:');
  for (const violation of crossBoundary.slice(0, 10)) {
    console.log(`    ${violation.file} imports ${violation.specifier}`);
  }
  failures.push(
    `${crossBoundary.length} frontend file(s) import backend source directly. ` +
      'src/ must reach the backend over the HTTP API, not by importing backend/src/.',
  );
} else {
  console.log('\n  frontend -> backend source imports: none');
}

if (failures.length) {
  console.log('');
  for (const failure of failures) console.log(`  FAIL  ${failure}`);
  console.log('');
  process.exit(1);
}

console.log('\n  OK — no new cycles, no cross-boundary imports\n');
