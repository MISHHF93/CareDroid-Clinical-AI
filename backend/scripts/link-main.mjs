import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shimPath = resolve(backendDir, 'dist', 'main.js');

await mkdir(dirname(shimPath), { recursive: true });
await writeFile(
  shimPath,
  "require('./backend/src/main.js');\n",
  'utf8',
);