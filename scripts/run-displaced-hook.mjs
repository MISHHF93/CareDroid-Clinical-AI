#!/usr/bin/env node
/**
 * Runs a git hook that lefthook displaced when it took over the hook slot.
 *
 * `lefthook install` renames a pre-existing `.git/hooks/<hook>` to
 * `<hook>.old` and does not call it again. On a machine where another tool
 * (Bob Shell on the maintainer's machine, for instance) had installed its own
 * pre-commit hook, that tool would silently stop running. lefthook.yml wires
 * this script in so the displaced hook still runs, with its exit status
 * honoured. Machines without a displaced hook do nothing here.
 *
 * Usage (from lefthook.yml): node scripts/run-displaced-hook.mjs pre-commit
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = process.argv[2];
if (!hook || !/^[a-z-]+$/.test(hook)) {
  console.error('usage: node scripts/run-displaced-hook.mjs <hook-name>');
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const displaced = path.join(root, '.git', 'hooks', `${hook}.old`);
if (!existsSync(displaced)) process.exit(0);

// Displaced hooks are shell scripts; git itself runs hooks through sh, so
// prefer bash/sh on PATH (Git for Windows ships both) rather than executing
// the file directly, which Windows cannot do for a shebang script.
const shell = ['bash', 'sh'].find((candidate) => spawnSync(candidate, ['-c', 'true']).status === 0);
if (!shell) {
  console.warn(`[hooks] ${hook}.old exists but no bash/sh is available to run it; skipping`);
  process.exit(0);
}

const result = spawnSync(shell, [displaced, ...process.argv.slice(3)], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
