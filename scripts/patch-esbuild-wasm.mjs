/**
 * Patch node_modules/esbuild so ESBUILD_USE_WASM=1 forces the wasm worker
 * (node esbuild-wasm/bin/esbuild) instead of spawning blocked esbuild.exe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = path.join(root, 'node_modules/esbuild/lib/main.js');
const wasmBin = path.join(root, 'node_modules/esbuild-wasm/bin/esbuild');
const backup = `${main}.bak-native`;

if (!fs.existsSync(main)) {
  console.error('esbuild main.js not found');
  process.exit(1);
}
if (!fs.existsSync(wasmBin)) {
  console.error('esbuild-wasm not installed. Run: npm install --no-save esbuild-wasm@0.28.1');
  process.exit(1);
}

let s = fs.readFileSync(main, 'utf8');
if (s.includes('ESBUILD_USE_WASM')) {
  console.log('esbuild already patched for ESBUILD_USE_WASM');
  process.exit(0);
}

const needle = 'function generateBinPath() {';
if (!s.includes(needle)) {
  console.error('Could not find generateBinPath() in esbuild main.js');
  process.exit(1);
}

if (!fs.existsSync(backup)) {
  fs.copyFileSync(main, backup);
}

const insert = `function generateBinPath() {
  // CareDroid portable: force WASM when native esbuild.exe is blocked
  if (process.env.ESBUILD_USE_WASM === '1') {
    return { binPath: ${JSON.stringify(wasmBin)}, isWASM: true };
  }
`;

s = s.replace(needle, insert);
fs.writeFileSync(main, s, 'utf8');
console.log('Patched esbuild for ESBUILD_USE_WASM=1');
console.log('  wasm bin:', wasmBin);
console.log('  backup:  ', backup);
