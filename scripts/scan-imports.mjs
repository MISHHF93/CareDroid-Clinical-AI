#!/usr/bin/env node
/**
 * Import health scan for CareDroid frontend src/.
 * Reports deep relatives, .js/.jsx imports, require(), missing @ alias candidates,
 * and side-effect / type-only patterns.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'src';

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const files = walk(root);
const importRe = /import\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

let deepRel = 0;
let jsExt = 0;
let requireCount = 0;
let typeImports = 0;
let sideEffect = 0;
const deepSamples = [];
const jsSamples = [];
const requireSamples = [];
const aliasCandidates = []; // long relatives that could be @/

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  const relFromSrc = path.relative(process.cwd(), f).replace(/\\/g, '/');

  // type imports
  const typeM = t.match(/import\s+type\s+/g);
  if (typeM) typeImports += typeM.length;

  // side-effect only
  const se = t.match(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm);
  if (se) sideEffect += se.length;

  const re1 = new RegExp(importRe.source, 'g');
  while ((m = re1.exec(t))) {
    const s = m[1];
    if (s.startsWith('.')) {
      const ups = (s.match(/\.\.\//g) || []).length;
      if (ups >= 4) {
        deepRel += 1;
        if (deepSamples.length < 20) deepSamples.push(`${relFromSrc} -> ${s}`);
      }
      // candidate for @/ if under src and goes up to src root-ish
      if (ups >= 2 && relFromSrc.startsWith('src/')) {
        const dir = path.posix.dirname(relFromSrc);
        // resolve roughly
        let base = dir.split('/');
        for (let i = 0; i < ups; i++) base.pop();
        const rest = s.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
        const target = [...base, ...rest.split('/')].join('/');
        if (target.startsWith('src/') && aliasCandidates.length < 30) {
          aliasCandidates.push({
            file: relFromSrc,
            from: s,
            suggest: '@/' + target.slice(4).replace(/\.(ts|tsx|js|jsx)$/, ''),
          });
        }
      }
    }
    if (/\.(js|jsx)(['"]|$)/.test(s) || /\.(js|jsx)$/.test(s)) {
      if (!s.includes('node_modules')) {
        jsExt += 1;
        if (jsSamples.length < 15) jsSamples.push(`${relFromSrc} -> ${s}`);
      }
    }
  }

  const re2 = new RegExp(requireRe.source, 'g');
  while ((m = re2.exec(t))) {
    requireCount += 1;
    if (requireSamples.length < 10) requireSamples.push(`${relFromSrc} -> ${m[1]}`);
  }
}

// Files that import React default when only used as types / unused
let defaultReactImports = 0;
const reactDefaultSamples = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (/import\s+React\s*,/.test(t) || /import\s+React\s+from\s+['"]react['"]/.test(t)) {
    // With react-jsx runtime, default React import often unnecessary
    if (!/\bReact\./.test(t) && !/\bReact,/.test(t.replace(/import\s+React\s*,/, ''))) {
      // still may use React.FC etc
    }
    if (/\bReact\.(FC|ReactNode|Component|memo|use|createElement|Fragment|CSSProperties)/.test(t)) {
      // needed or type-only
    } else if (
      /import\s+React\s+from\s+['"]react['"]/.test(t) &&
      !/\bReact\b/.test(t.replace(/import\s+React\s+from\s+['"]react['"]\s*;?/, ''))
    ) {
      defaultReactImports += 1;
      if (reactDefaultSamples.length < 15) {
        reactDefaultSamples.push(path.relative(process.cwd(), f).replace(/\\/g, '/'));
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      filesScanned: files.length,
      deepRelativeImports: deepRel,
      jsExtensionImports: jsExt,
      requireCalls: requireCount,
      typeImportKeywords: typeImports,
      sideEffectImports: sideEffect,
      unusedStyleDefaultReact: defaultReactImports,
      samples: {
        deepRelative: deepSamples,
        jsExtension: jsSamples,
        require: requireSamples,
        defaultReact: reactDefaultSamples,
        aliasCandidates: aliasCandidates.slice(0, 15),
      },
    },
    null,
    2,
  ),
);
