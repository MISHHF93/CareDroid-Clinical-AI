import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'backend/src', 'lib', 'public', 'types', 'store', 'data'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.webmanifest', '.css', '.md']);

const REPLACEMENTS = [
  [/CareDroid Clinical AI/g, 'CareDroid'],
  [/CareDroid-Clinical-AI/g, 'CareDroid'],
  [/CareDroid Clinical Companion/g, 'CareDroid'],
  [/CareDroid Clinical Router/g, 'CareDroid'],
  [/Emergency OS/g, 'CareDroid'],
  [/AIIOS ED Copilot/g, 'CareDroid Copilot'],
  [/\bAIIOS\b/g, 'CareDroid'],
  [/Clinical OS/g, 'CareDroid'],
  [/\| Clinical AI/g, ''],
  [/owner: 'Clinical AI'/g, "owner: 'CareDroid'"],
  [/displayName: 'Clinical AI'/g, "displayName: 'CareDroid'"],
  [/'Clinical AI'/g, "'CareDroid'"],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'archive') continue;
      walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const original = fs.readFileSync(file, 'utf8');
    let next = original;
    for (const [pattern, replacement] of REPLACEMENTS) {
      next = next.replace(pattern, replacement);
    }
    if (next !== original && !original.includes('LEGACY_PRODUCT_NAMES') && !original.includes('FORBIDDEN_PRODUCT_NAMES')) {
      fs.writeFileSync(file, next, 'utf8');
      changed += 1;
    }
  }
}

for (const file of ['package.json', 'backend/package.json', 'index.html', 'README.md']) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const original = fs.readFileSync(full, 'utf8');
  let next = original;
  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  if (next !== original) {
    fs.writeFileSync(full, next, 'utf8');
    changed += 1;
  }
}

console.log(`Normalized CareDroid naming in ${changed} files.`);
