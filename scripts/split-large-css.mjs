#!/usr/bin/env node
/**
 * Split oversized CSS files into <=400-line chunks with @import chain.
 * Splits only on top-level rule boundaries (brace depth 0) to avoid broken blocks.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const MAX_LINES = 400;

const DEFAULT_TARGETS = [
  'src/layout/AppShell.css',
  'src/components/EmergencyWhiteboard.css',
  'src/components/CopilotPanel.css',
];

function braceDelta(line) {
  let delta = 0;
  let inString = false;
  let stringChar = '';

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const prev = line[index - 1];

    if (inString) {
      if (char === stringChar && prev !== '\\') inString = false;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') delta += 1;
    if (char === '}') delta -= 1;
  }

  return delta;
}

function balanceScore(text) {
  let depth = 0;
  for (const line of text.split('\n')) {
    depth += braceDelta(line);
  }
  return depth;
}

function splitOnRuleBoundaries(lines, maxLines) {
  const chunks = [];
  let current = [];
  let depth = 0;

  for (const line of lines) {
    current.push(line);
    depth += braceDelta(line);

    if (depth === 0 && current.length >= Math.min(maxLines, 80)) {
      chunks.push(current);
      current = [];
    }
  }

  if (current.length) {
    if (chunks.length && current.length < 40) {
      chunks[chunks.length - 1].push(...current);
    } else {
      chunks.push(current);
    }
  }

  const merged = [];
  for (const chunk of chunks) {
    const last = merged[merged.length - 1];
    if (last && last.length + chunk.length <= maxLines) {
      last.push(...chunk);
    } else {
      merged.push(chunk);
    }
  }

  return merged;
}

function splitCssFile(relPath) {
  const sourcePath = join(ROOT, relPath);
  if (!existsSync(sourcePath)) {
    console.warn(`skip missing ${relPath}`);
    return;
  }

  const text = readFileSync(sourcePath, 'utf8');
  const lines = text.split('\n');

  if (lines.length <= MAX_LINES) {
    console.log(`${relPath}: ${lines.length} lines — no split needed`);
    return;
  }

  const dir = dirname(sourcePath);
  const baseName = basename(relPath, '.css');
  const partsDir = join(dir, 'styles');

  const headerLines = [];
  const bodyLines = [];
  let inHeader = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (inHeader && (line.startsWith('@import') || trimmed === '' || trimmed.startsWith('/*'))) {
      headerLines.push(line);
      continue;
    }
    inHeader = false;
    bodyLines.push(line);
  }

  const parts = splitOnRuleBoundaries(bodyLines, MAX_LINES);
  mkdirSync(partsDir, { recursive: true });

  const partImports = [];
  parts.forEach((chunk, index) => {
    const partName = `${baseName}-part-${String(index + 1).padStart(2, '0')}.css`;
    const partPath = join(partsDir, partName);
    const partText = `/* ${relative(ROOT, sourcePath)} — part ${index + 1}/${parts.length} */\n${chunk.join('\n')}\n`;
    const balance = balanceScore(partText);
    if (balance !== 0) {
      throw new Error(`${partName} has unbalanced braces (${balance})`);
    }
    writeFileSync(partPath, partText, 'utf8');
    partImports.push(`@import './styles/${partName}';`);
    console.log(`  wrote ${relative(ROOT, partPath)} (${chunk.length} lines)`);
  });

  const nextSource = [...headerLines.filter((line) => line.trim() !== ''), ...partImports, ''].join('\n');
  writeFileSync(sourcePath, nextSource, 'utf8');
  console.log(`${relPath}: split ${lines.length} lines into ${parts.length} parts`);
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TARGETS;
for (const target of targets) {
  splitCssFile(target.replace(/\\/g, '/'));
}