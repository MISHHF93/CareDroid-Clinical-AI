#!/usr/bin/env node
/**
 * Authoritative bug inventory for CareDroid frontend.
 * Class A = compile/lint (must be 0)
 * Class B = ARIA static-expression rules (Edge Tools false-positive generators)
 * Class C = hygiene (BOM, empty, broken CSS, stale main.jsx)
 * Class D = style noise (inline style={{ }} counts — not failures)
 *
 * Exit 1 if Class A or B > 0.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}` };
};

const tsc = run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.frontend.json']);
const lint = run('npx', ['eslint', 'src']);

const aria = JSON.parse(
  run('node', ['scripts/count-aria-expr-issues.mjs', 'src']).out || '{"badExpressions":-1}',
);
run('node', ['scripts/scan-source-dirt.mjs', 'src']);
const dirtPath = path.join(root, 'source-dirt-report.json');
const dirt = fs.existsSync(dirtPath)
  ? JSON.parse(fs.readFileSync(dirtPath, 'utf8'))
  : { counts: {} };

const inventory = {
  generatedAt: new Date().toISOString(),
  classA: {
    typescriptErrors: tsc.code === 0 ? 0 : 1,
    eslintErrors: lint.code === 0 ? 0 : 1,
    tscExit: tsc.code,
    eslintExit: lint.code,
  },
  classB: {
    ariaBoolExpressions: aria.badExpressions ?? dirt.counts?.ariaBoolExpr ?? 0,
    ariaRoleExpressions: dirt.counts?.ariaRoleExpr ?? 0,
    ariaInComments: dirt.counts?.ariaInComments ?? 0,
  },
  classC: {
    bomFiles: dirt.counts?.bomFiles ?? 0,
    emptyFiles: dirt.counts?.emptyFiles ?? 0,
    brokenCssUrls: dirt.counts?.brokenCssUrls ?? 0,
    mainJsxEntry: dirt.counts?.mainJsxEntry ?? 0,
  },
  classD: {
    inlineStyleOccurrences: dirt.counts?.inlineStyleOccurrences ?? 0,
    note: 'Inline styles are hygiene/style debt, not correctness bugs.',
  },
  classE_ideNoise: {
    note:
      'VS Code/Cursor Problems ~400 items are typically Edge Tools/webhint/CSS validators ' +
      'scanning dist/, dual checkouts, or generated HTML. Disabled via .vscode/settings.json + .hintrc. ' +
      'They are not TypeScript/ESLint failures.',
  },
};

const classATotal = inventory.classA.typescriptErrors + inventory.classA.eslintErrors;
const classBTotal =
  inventory.classB.ariaBoolExpressions +
  inventory.classB.ariaRoleExpressions +
  inventory.classB.ariaInComments;
const classCTotal =
  inventory.classC.bomFiles +
  inventory.classC.emptyFiles +
  inventory.classC.brokenCssUrls +
  inventory.classC.mainJsxEntry;

inventory.totals = {
  realBugsClassA_B_C: classATotal + classBTotal + classCTotal,
  classA: classATotal,
  classB: classBTotal,
  classC: classCTotal,
  classD_inlineStyles: inventory.classD.inlineStyleOccurrences,
};

const outPath = path.join(root, 'bug-inventory-report.json');
fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2));
console.log(JSON.stringify(inventory, null, 2));
console.log(`\nWrote ${path.relative(root, outPath)}`);
console.log(
  inventory.totals.realBugsClassA_B_C === 0
    ? 'OK: real bug classes A/B/C are 0.'
    : `FAIL: ${inventory.totals.realBugsClassA_B_C} real bug(s) remain in classes A/B/C.`,
);

process.exit(inventory.totals.realBugsClassA_B_C === 0 ? 0 : 1);
