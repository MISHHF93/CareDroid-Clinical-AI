import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, 'data', 'artifacts');
const ML_DIR = path.join(ROOT, 'data', 'ml');
const DOCS_DIR = path.join(ROOT, 'docs');
const BACKEND_DIR = path.join(ROOT, 'backend', 'src');

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function slug(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

async function walkFiles(root, predicate) {
  const results = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry.name)) {
          await walk(absolute);
        }
      } else if (!predicate || predicate(absolute)) {
        results.push(absolute);
      }
    }
  }
  await walk(root);
  return results;
}

function firstMeaningfulLine(markdown) {
  const line =
    markdown
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item && !item.startsWith('<!--')) || '';
  return line.replace(/^#+\s*/, '').slice(0, 240);
}

async function scanMarkdownArtifacts() {
  const files = await walkFiles(DOCS_DIR, (file) => file.endsWith('.md'));
  return Promise.all(
    files.map(async (file) => {
      const relative = toPosix(path.relative(ROOT, file));
      const body = await readFile(file, 'utf8');
      const title = firstMeaningfulLine(body) || path.basename(file, '.md');
      return {
        artifactId: `doc-${slug(relative)}`,
        name: title,
        type: 'document',
        category: 'markdown-doc',
        route: 'unknown',
        sourceFile: relative,
        frontendStatus: 'documentation',
        backendStatus: 'not-applicable',
        demoStatus: 'not-applicable',
        assetPack: 'unknown',
        product: 'unknown',
        workspace: 'documentation',
        roles: 'admin|developer',
        organizationTypes: 'unknown',
        riskLevel: /security|audit|governance|clinical|risk/i.test(body) ? 'medium' : 'low',
        description: firstMeaningfulLine(body),
        dependencies: 'unknown',
        tags: ['document', 'markdown', ...relative.split('/').map(slug)],
        embeddingText: `${title} ${relative} ${body.slice(0, 1200)}`,
        status: 'active',
      };
    })
  );
}

async function scanExecutorArtifacts() {
  const files = await walkFiles(BACKEND_DIR, (file) => /executor|orchestrator|handler/i.test(file) && /\.(ts|js)$/.test(file));
  return files.map((file) => {
    const relative = toPosix(path.relative(ROOT, file));
    const name = path.basename(file, path.extname(file));
    return {
      artifactId: `executor-${slug(relative)}`,
      name,
      type: 'executor',
      category: 'backend-executor',
      route: 'unknown',
      sourceFile: relative,
      frontendStatus: 'internal',
      backendStatus: 'backend-source',
      demoStatus: 'explicit-source-scan',
      assetPack: 'unknown',
      product: 'unknown',
      workspace: 'backend',
      roles: 'developer|platform-admin',
      organizationTypes: 'unknown',
      riskLevel: 'high',
      description: `Backend execution/orchestration source file detected at ${relative}.`,
      dependencies: relative,
      tags: ['backend', 'executor', 'orchestrator'],
      embeddingText: `${name} ${relative} backend executor orchestrator handler`,
      status: 'active',
    };
  });
}

function buildReport({ artifacts, features, trainingRows, validation, resonance }) {
  const typeCounts = artifacts.reduce((acc, artifact) => {
    acc[artifact.type] = (acc[artifact.type] || 0) + 1;
    return acc;
  }, {});
  const lines = [
    '# Artifact Intelligence Pipeline Report',
    '',
    '## Summary',
    '',
    `- Artifacts exported: ${artifacts.length}`,
    `- Feature rows exported: ${features.length}`,
    `- Training label rows exported: ${trainingRows.length}`,
    `- Duplicate artifact IDs: ${validation.duplicateIds.length}`,
    `- Orphan findings: ${resonance.orphans.length}`,
    `- Duplicate-name groups: ${resonance.duplicates.length}`,
    `- Missing metadata findings: ${resonance.missingMetadata.length}`,
    '',
    'The pipeline prepares local, model-ready data only. It does not claim that a machine-learning model has been trained.',
    '',
    '## Artifact Types',
    '',
    ...Object.entries(typeCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, count]) => `- ${type}: ${count}`),
    '',
    '## Outputs',
    '',
    '- `data/artifacts/caredroid_artifacts.csv`',
    '- `data/artifacts/caredroid_artifacts.json`',
    '- `data/artifacts/caredroid_artifact_features.csv`',
    '- `data/ml/artifact_training_dataset.csv`',
    '',
    '## Resonance Checks',
    '',
    `- Local similarity engine: enabled`,
    `- Orphan detection: ${resonance.orphans.length} findings`,
    `- Duplicate detection: ${resonance.duplicates.length} groups`,
    `- Missing metadata detection: ${resonance.missingMetadata.length} findings`,
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await mkdir(ML_DIR, { recursive: true });

  let vite;
  try {
    vite = await createServer({
      root: ROOT,
      configFile: false,
      logLevel: 'silent',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false },
    });

    const {
      ARTIFACT_FEATURE_FIELDS,
      ARTIFACT_SCHEMA_FIELDS,
      ARTIFACT_TRAINING_FIELDS,
      ArtifactResonanceService,
      artifactFeaturesToCsv,
      artifactTrainingDatasetToCsv,
      artifactsToCsv,
      buildArtifactCatalog,
      buildArtifactTrainingDataset,
      encodeArtifactFeatures,
      validateArtifactCatalog,
    } = await vite.ssrLoadModule('/src/data/artifactIntelligence.js');

    const [documentArtifacts, executorArtifacts] = await Promise.all([
      scanMarkdownArtifacts(),
      scanExecutorArtifacts(),
    ]);
    const artifacts = buildArtifactCatalog({ extraArtifacts: [...documentArtifacts, ...executorArtifacts] });
    const features = encodeArtifactFeatures(artifacts);
    const trainingRows = buildArtifactTrainingDataset(artifacts);
    const validation = validateArtifactCatalog(artifacts);
    const resonanceService = new ArtifactResonanceService(artifacts);
    const resonance = {
      orphans: resonanceService.detectOrphanArtifacts(),
      duplicates: resonanceService.detectDuplicateArtifacts(),
      missingMetadata: resonanceService.detectMissingMetadata(),
    };

    await Promise.all([
      writeFile(path.join(ARTIFACT_DIR, 'caredroid_artifacts.csv'), artifactsToCsv(artifacts), 'utf8'),
      writeFile(
        path.join(ARTIFACT_DIR, 'caredroid_artifacts.json'),
        `${JSON.stringify(artifacts, null, 2)}\n`,
        'utf8'
      ),
      writeFile(path.join(ARTIFACT_DIR, 'caredroid_artifact_features.csv'), artifactFeaturesToCsv(features), 'utf8'),
      writeFile(path.join(ML_DIR, 'artifact_training_dataset.csv'), artifactTrainingDatasetToCsv(trainingRows), 'utf8'),
      writeFile(
        path.join(ROOT, 'docs', 'artifact-intelligence-pipeline-report.md'),
        buildReport({ artifacts, features, trainingRows, validation, resonance }),
        'utf8'
      ),
    ]);

    if (!validation.ok) {
      throw new Error(
        `Artifact catalog validation failed: duplicateIds=${
          validation.duplicateIds.join(', ') || 'none'
        } missingRequired=${validation.missingRequired.length}`
      );
    }

    // Print a machine-readable summary for CI or local verification.
    console.log(
      JSON.stringify(
        {
          artifacts: artifacts.length,
          features: features.length,
          trainingRows: trainingRows.length,
          fields: {
            artifacts: ARTIFACT_SCHEMA_FIELDS.length,
            features: ARTIFACT_FEATURE_FIELDS.length,
            training: ARTIFACT_TRAINING_FIELDS.length,
          },
          orphans: resonance.orphans.length,
          duplicateGroups: resonance.duplicates.length,
          missingMetadata: resonance.missingMetadata.length,
        },
        null,
        2
      )
    );
  } finally {
    if (vite) await vite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
