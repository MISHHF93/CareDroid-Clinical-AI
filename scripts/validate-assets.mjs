import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');

const scanRoots = [
  'index.html',
  'src',
  'public',
].map((entry) => path.join(rootDir, entry));

const scanExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.ts',
  '.tsx',
  '.webmanifest',
]);

const assetExtensions = [
  'avif',
  'bmp',
  'css',
  'gif',
  'ico',
  'icns',
  'jpeg',
  'jpg',
  'js',
  'json',
  'mp3',
  'mp4',
  'otf',
  'png',
  'svg',
  'ttf',
  'webmanifest',
  'webp',
  'woff',
  'woff2',
];

const assetExtensionPattern = assetExtensions
  .map((ext) => ext.replace('.', '\\.'))
  .join('|');

const failures = [];
const warnings = [];

const toRelative = (filePath) => path.relative(rootDir, filePath).replaceAll(path.sep, '/');

const isIgnoredDirectory = (name) => [
  '.git',
  '.vercel',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
].includes(name);

const walk = (entry) => {
  if (!fs.existsSync(entry)) {
    return [];
  }

  const stat = fs.statSync(entry);
  if (stat.isFile()) {
    return scanExtensions.has(path.extname(entry)) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry) ? [entry] : [];
  }

  const files = [];
  for (const dirent of fs.readdirSync(entry, { withFileTypes: true })) {
    if (dirent.isDirectory() && isIgnoredDirectory(dirent.name)) {
      continue;
    }

    const child = path.join(entry, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...walk(child));
    } else if (scanExtensions.has(path.extname(child)) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(child)) {
      files.push(child);
    }
  }

  return files;
};

const existsWithExactCase = (targetPath) => {
  const absolutePath = path.resolve(targetPath);
  if (!fs.existsSync(absolutePath)) {
    return { exists: false, exact: false };
  }

  const parsed = path.parse(absolutePath);
  const relativeParts = path.relative(parsed.root, absolutePath).split(path.sep).filter(Boolean);
  let current = parsed.root;

  for (const part of relativeParts) {
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return { exists: true, exact: false };
    }

    if (!entries.includes(part)) {
      return { exists: true, exact: false };
    }

    current = path.join(current, part);
  }

  return { exists: true, exact: true };
};

const isExternalReference = (value) => (
  /^(?:https?:|data:|blob:|mailto:|tel:|#|javascript:|chrome-extension:)/i.test(value) ||
  value.startsWith('var(')
);

const recordMissing = ({ sourceFile, reference, resolvedPath, reason }) => {
  const caseCheck = existsWithExactCase(resolvedPath);
  const source = toRelative(sourceFile);
  const resolved = toRelative(resolvedPath);

  if (!caseCheck.exists) {
    failures.push(`${source}: missing ${reason} "${reference}" -> ${resolved}`);
  } else if (!caseCheck.exact) {
    failures.push(`${source}: case mismatch for ${reason} "${reference}" -> ${resolved}`);
  }
};

const resolveReference = (sourceFile, reference) => {
  const cleanReference = reference.split(/[?#]/)[0];
  if (!cleanReference || isExternalReference(cleanReference)) {
    return null;
  }

  if (/^[A-Z]:[\\/]/.test(cleanReference) || cleanReference.startsWith('file://')) {
    failures.push(`${toRelative(sourceFile)}: local absolute asset path "${reference}"`);
    return null;
  }

  if (cleanReference.startsWith('/')) {
    if (cleanReference === '/') {
      return null;
    }
    return path.join(publicDir, cleanReference.slice(1));
  }

  if (cleanReference.startsWith('./') || cleanReference.startsWith('../')) {
    const resolvedPath = path.resolve(path.dirname(sourceFile), cleanReference);
    if (!resolvedPath.startsWith(rootDir)) {
      failures.push(`${toRelative(sourceFile)}: asset reference escapes repo "${reference}"`);
      return null;
    }
    return resolvedPath;
  }

  return null;
};

const validateReference = (sourceFile, reference, reason) => {
  const resolvedPath = resolveReference(sourceFile, reference);
  if (!resolvedPath) {
    return;
  }

  recordMissing({ sourceFile, reference, resolvedPath, reason });
};

const checkFile = (sourceFile) => {
  const content = fs.readFileSync(sourceFile, 'utf8');
  const uncommentedContent = content.replace(/^\s*\/\/.*$/gm, '');

  const localPathMatch = uncommentedContent.match(/[A-Z]:[\\/][A-Za-z0-9_. -]+[\\/][^'"`\s)]*|file:\/\/[^'"`\s)]+/g);
  if (localPathMatch) {
    for (const reference of localPathMatch) {
      failures.push(`${toRelative(sourceFile)}: local-only path "${reference}"`);
    }
  }

  const cssUrlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  for (const match of uncommentedContent.matchAll(cssUrlPattern)) {
    validateReference(sourceFile, match[2], 'CSS url');
  }

  const importLinePattern = new RegExp(
    `^\\s*(?:import(?:\\s+[^'"\\n]+?\\s+from\\s*)?|export\\s+[^'"\\n]+?\\s+from\\s*)['"]([^'"]+\\.(${assetExtensionPattern}))['"]`,
    'i'
  );
  for (const line of uncommentedContent.split(/\r?\n/)) {
    const match = line.match(importLinePattern);
    if (match) {
      validateReference(sourceFile, match[1], 'asset import');
    }
  }

  const publicPathPattern = new RegExp(
    `['"](/[^'"\\s)]+\\.(${assetExtensionPattern})(?:[?#][^'"\\s)]*)?)['"]`,
    'gi'
  );
  for (const match of uncommentedContent.matchAll(publicPathPattern)) {
    validateReference(sourceFile, match[1], 'public asset reference');
  }
};

// Vite treats a `.env`-declared `NODE_ENV=development` as an explicit
// request to build in development mode -- even for `vite build` -- unless
// NODE_ENV is already set in the shell before Vite starts (Vite's own
// `isNodeEnvSet` check; see node_modules/vite/dist/node/chunks/config.js).
// That mode silently ships React's dev runtime: bigger chunks, slower
// renders, source file paths baked into every bundle. There's no build
// warning for it -- `vite build` "succeeds" and the mistake only shows up
// as an unexplained performance/size regression. Found the hard way
// (Cycle 109): this repo's own `.env.example` shipped exactly this line,
// so any checkout that copied it to `.env` per the setup instructions was
// producing a comparable regression from that point on.
const checkProductionNodeEnv = () => {
  if (process.env.NODE_ENV) {
    // Already explicitly set for this invocation (CI, or an explicit
    // `NODE_ENV=production npm run build`) -- Vite always honors an
    // already-set NODE_ENV over any .env file, so nothing can go wrong.
    return;
  }
  for (const name of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    const filePath = path.join(rootDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^NODE_ENV\s*=\s*(.*)$/);
      const value = match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
      if (value === 'development') {
        failures.push(
          `${name}: NODE_ENV=development with no NODE_ENV set in the shell environment. ` +
            `Vite will build in development mode even for 'vite build' (see https://vite.dev/guide/env-and-mode) -- ` +
            `remove the NODE_ENV line from ${name}, or export NODE_ENV=production before building if you specifically need this forced.`,
        );
      }
    }
  }
};

const checkLargeAssets = () => {
  const assetFilePattern = new RegExp(`\\.(${assetExtensionPattern})$`, 'i');
  for (const entry of ['public', 'src/assets', 'src/images']) {
    const entryPath = path.join(rootDir, entry);
    for (const filePath of walk(entryPath)) {
      if (!assetFilePattern.test(filePath)) {
        continue;
      }

      const sizeInBytes = fs.statSync(filePath).size;
      if (sizeInBytes > 1024 * 1024) {
        warnings.push(`${toRelative(filePath)}: large asset ${Math.round(sizeInBytes / 1024)} KiB`);
      }
    }
  }
};

for (const file of scanRoots.flatMap(walk)) {
  checkFile(file);
}

checkLargeAssets();
checkProductionNodeEnv();

if (warnings.length) {
  console.warn('Asset validation warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length) {
  console.error('Asset validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Asset validation passed.');
