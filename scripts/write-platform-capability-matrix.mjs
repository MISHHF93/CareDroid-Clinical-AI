import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatPlatformCapabilityMatrixDocument } from '../src/data/platformCapabilityMatrix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const outputPath = join(repoRoot, 'docs', 'platform-capability-matrix.md');

writeFileSync(outputPath, formatPlatformCapabilityMatrixDocument());
console.log(`Wrote ${outputPath}`);
