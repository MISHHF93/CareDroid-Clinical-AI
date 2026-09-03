#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const target = join(ROOT, 'src/layout/AppShell.css');

let body = execSync('git show HEAD:src/layout/AppShell.css', {
  cwd: ROOT,
  encoding: 'utf8',
});

if (!body.includes('app-shell.css')) {
  body = `/* Legacy ED shell styles for layout/AppShell.jsx — canonical shell lives in components/app-shell.css */
@import '../components/app-shell.css';

${body}`;
}

writeFileSync(target, body, 'utf8');
console.log(`Restored ${target} (${body.split('\n').length} lines)`);
