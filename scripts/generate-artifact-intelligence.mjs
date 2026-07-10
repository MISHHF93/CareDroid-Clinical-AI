import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, 'data', 'artifacts');
const ML_DIR = path.join(ROOT, 'data', 'ml');
const DOCS_DIR = path.join(ROOT, 'docs');
const BACKEND_DIR = path.join(ROOT, 'backend', 'src');
const ENGINE_DIRS = [path.join(ROOT, 'engine'), path.join(ROOT, 'src', 'engine')];
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const ML_SERVICES_DIR = path.join(ROOT, 'backend', 'ml-services');

const LIB_DIRS = [
  path.join(ROOT, 'lib', 'ai'),
  path.join(ROOT, 'lib', 'native-ai'),
  path.join(ROOT, 'lib', 'features'),
  path.join(ROOT, 'lib', 'operational-intelligence'),
];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', 'test-results']);

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
        if (!SKIP_DIRS.has(entry.name)) {
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

function extractTsExportName(content, fileName) {
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  if (classMatch) return classMatch[1];
  const constMatch = content.match(/export\s+(?:const|function)\s+(\w+)/);
  if (constMatch) return constMatch[1];
  return path.basename(fileName, path.extname(fileName));
}

function baseArtifactFields(relative, overrides = {}) {
  return {
    route: 'unknown',
    frontendStatus: 'internal',
    backendStatus: 'not-applicable',
    demoStatus: 'not-applicable',
    assetPack: 'unknown',
    product: 'unknown',
    workspace: 'unknown',
    roles: 'developer|platform-admin',
    organizationTypes: 'unknown',
    riskLevel: 'medium',
    dependencies: relative,
    status: 'active',
    ...overrides,
  };
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
        sourceFile: relative,
        description: firstMeaningfulLine(body),
        tags: ['document', 'markdown', ...relative.split('/').map(slug)],
        embeddingText: `${title} ${relative} ${body.slice(0, 1200)}`,
        ...baseArtifactFields(relative, {
          frontendStatus: 'documentation',
          backendStatus: 'not-applicable',
          demoStatus: 'not-applicable',
          workspace: 'documentation',
          roles: 'admin|developer',
          riskLevel: /security|audit|governance|clinical|risk/i.test(body) ? 'medium' : 'low',
        }),
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
      sourceFile: relative,
      description: `Backend execution/orchestration source file detected at ${relative}.`,
      tags: ['backend', 'executor', 'orchestrator'],
      embeddingText: `${name} ${relative} backend executor orchestrator handler`,
      ...baseArtifactFields(relative, {
        frontendStatus: 'internal',
        backendStatus: 'backend-source',
        demoStatus: 'explicit-source-scan',
        workspace: 'backend',
        riskLevel: 'high',
      }),
    };
  });
}

async function scanBackendServiceArtifacts() {
  const files = await walkFiles(BACKEND_DIR, (file) => /\.service\.ts$/.test(file));
  return Promise.all(
    files.map(async (file) => {
      const relative = toPosix(path.relative(ROOT, file));
      const content = await readFile(file, 'utf8');
      const name = extractTsExportName(content, file);
      const moduleName = relative.split('/modules/')[1]?.split('/')[0] || 'backend';
      return {
        artifactId: `service-${slug(relative)}`,
        name,
        type: 'backend-service',
        category: moduleName,
        sourceFile: relative,
        description: `NestJS service module for ${moduleName}: ${name}.`,
        tags: ['backend', 'service', moduleName, name],
        embeddingText: `${name} ${relative} backend service ${moduleName}`,
        ...baseArtifactFields(relative, {
          frontendStatus: 'internal',
          backendStatus: 'backend-service',
          demoStatus: 'live-or-local',
          workspace: 'backend',
          riskLevel: /ai|clinical|auth|governance|patient/i.test(relative) ? 'high' : 'medium',
        }),
      };
    })
  );
}

async function scanEngineArtifacts() {
  const files = (
    await Promise.all(
      ENGINE_DIRS.map((dir) =>
        walkFiles(dir, (file) => /\.ts$/.test(file) && !/\.test\.ts$/.test(file) && !/\.spec\.ts$/.test(file))
      )
    )
  ).flat();

  const unique = [...new Set(files)];
  return Promise.all(
    unique.map(async (file) => {
      const relative = toPosix(path.relative(ROOT, file));
      const content = await readFile(file, 'utf8');
      const name = extractTsExportName(content, file);
      return {
        artifactId: `engine-${slug(relative)}`,
        name,
        type: 'engine',
        category: 'clinical-engine',
        sourceFile: relative,
        description: `Operational/clinical engine at ${relative}.`,
        tags: ['engine', 'clinical', name, slug(path.basename(file, '.ts'))],
        embeddingText: `${name} ${relative} engine clinical operational`,
        ...baseArtifactFields(relative, {
          frontendStatus: 'engine-module',
          backendStatus: 'deterministic-engine',
          demoStatus: 'live-or-local',
          workspace: 'operations|clinical',
          roles: 'charge-nurse|triage-nurse|emergency-physician|platform-admin',
          organizationTypes: 'hospital',
          riskLevel: /alert|triage|capacity|deterioration/i.test(relative) ? 'high' : 'medium',
        }),
      };
    })
  );
}

async function scanPageArtifacts() {
  const files = await walkFiles(PAGES_DIR, (file) => /\.tsx$/.test(file) && !/\.test\.tsx$/.test(file));
  return files.map((file) => {
    const relative = toPosix(path.relative(ROOT, file));
    const name = path.basename(file, '.tsx');
    const routeGuess = relative.includes('emergency/')
      ? `/emergency/${slug(relative.split('emergency/')[1]?.replace(/\.tsx$/, '').replace(/\/index$/, ''))}`
      : `/${slug(relative.replace(/^src\/pages\//, '').replace(/\.tsx$/, ''))}`;
    return {
      artifactId: `page-${slug(relative)}`,
      name: `${name} page`,
      type: 'page',
      category: relative.split('/')[2] || 'page',
      route: routeGuess,
      sourceFile: relative,
      description: `React page component at ${relative}.`,
      tags: ['page', 'react', name, ...(relative.split('/').map(slug))],
      embeddingText: `${name} page ${relative} ${routeGuess}`,
      ...baseArtifactFields(relative, {
        frontendStatus: 'frontend-routed',
        backendStatus: 'frontend-page',
        demoStatus: 'live-or-local',
        workspace: relative.includes('emergency') ? 'emergency' : 'platform',
        roles: 'authenticated-user',
        organizationTypes: 'hospital',
        riskLevel: /clinical|triage|copilot|patient/i.test(relative) ? 'high' : 'medium',
      }),
    };
  });
}

async function scanLibRegistryArtifacts() {
  const files = (
    await Promise.all(
      LIB_DIRS.map((dir) => walkFiles(dir, (file) => /\.ts$/.test(file) && !/\.test\.ts$/.test(file)))
    )
  ).flat();

  const unique = [...new Set(files)];
  return Promise.all(
    unique.map(async (file) => {
      const relative = toPosix(path.relative(ROOT, file));
      const content = await readFile(file, 'utf8');
      const name = extractTsExportName(content, file);
      return {
        artifactId: `registry-${slug(relative)}`,
        name,
        type: 'registry',
        category: 'platform-registry',
        sourceFile: relative,
        description: `Shared platform registry/config at ${relative}.`,
        tags: ['registry', 'lib', name, slug(path.dirname(relative))],
        embeddingText: `${name} ${relative} registry config platform`,
        ...baseArtifactFields(relative, {
          frontendStatus: 'shared-library',
          backendStatus: 'shared-config',
          demoStatus: 'live-or-local',
          workspace: 'platform',
          roles: 'developer|platform-admin',
          organizationTypes: 'hospital',
          riskLevel: /ai|governance|safety/i.test(relative) ? 'high' : 'medium',
        }),
      };
    })
  );
}

async function scanMlServiceArtifacts() {
  const artifacts = [];
  const manifestPath = path.join(ML_SERVICES_DIR, 'models', 'manifest.json');
  if (await readFile(manifestPath, 'utf8').then(() => true).catch(() => false)) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    for (const [head, meta] of Object.entries(manifest.heads || {})) {
      artifacts.push({
        artifactId: `ml-head-${head}`,
        name: `${head} classifier head`,
        type: 'ai-model',
        category: 'local-ml-head',
        route: head === 'nlu' ? '/api/nlu/predict' : '/api/ai/node/models/route',
        sourceFile: toPosix(path.join('backend', 'ml-services', 'models', head, 'classifier.json')),
        description: `Unified CareDroid AI node ${head} classifier${meta.accuracy ? ` (${(meta.accuracy * 100).toFixed(1)}% accuracy)` : ''}.`,
        tags: ['ml-head', head, meta.architecture || 'classifier', 'unified-ai-node'],
        embeddingText: `${head} classifier unified ai node ${meta.architecture || ''} ${meta.targetMode || ''}`,
        ...baseArtifactFields(`backend/ml-services/models/${head}`, {
          frontendStatus: 'unified-ai-node',
          backendStatus: meta.architecture ? 'trained' : 'pending',
          demoStatus: 'live-or-local',
          assetPack: 'ai-workflow-pack',
          product: 'product-core-platform',
          workspace: 'ai-workflow|clinical',
          roles: 'clinician|platform-admin',
          organizationTypes: 'hospital',
          riskLevel: 'high',
        }),
      });
    }
  }

  const unifiedNodeFiles = await walkFiles(path.join(ML_SERVICES_DIR, 'unified-ai-node'), (file) =>
    /\.ts$/.test(file),
  );
  for (const file of unifiedNodeFiles) {
    const relative = toPosix(path.relative(ROOT, file));
    const name = path.basename(file, '.ts');
    artifacts.push({
      artifactId: `unified-node-${slug(relative)}`,
      name: `${name} (unified AI node)`,
      type: 'registry',
      category: 'unified-ai-node',
      route: '/api/ai/node/models',
      sourceFile: relative,
      description: `Unified AI node runtime module at ${relative}.`,
      tags: ['unified-ai-node', name, 'ml-runtime'],
      embeddingText: `${name} unified ai node orchestration ${relative}`,
      ...baseArtifactFields(relative, {
        frontendStatus: 'api-backed',
        backendStatus: 'nestjs-module',
        demoStatus: 'live-or-local',
        workspace: 'ai-workflow',
        roles: 'clinician|platform-admin',
        organizationTypes: 'hospital',
        riskLevel: 'high',
      }),
    });
  }

  return artifacts;
}

function buildReport({ artifacts, features, trainingRows, validation, resonance, captureStats }) {
  const typeCounts = artifacts.reduce((acc, artifact) => {
    acc[artifact.type] = (acc[artifact.type] || 0) + 1;
    return acc;
  }, {});
  const intentLabels = trainingRows.filter((row) => row.labelType === 'intent').length;
  const lines = [
    '# Artifact Intelligence Pipeline Report',
    '',
    '## Summary',
    '',
    `- Artifacts exported: ${artifacts.length}`,
    `- Feature rows exported: ${features.length}`,
    `- Training label rows exported: ${trainingRows.length}`,
    `- Intent routing labels: ${intentLabels}`,
    `- Duplicate artifact IDs: ${validation.duplicateIds.length}`,
    `- Orphan findings: ${resonance.orphans.length}`,
    `- Duplicate-name groups: ${resonance.duplicates.length}`,
    `- Missing metadata findings: ${resonance.missingMetadata.length}`,
    '',
    'The pipeline prepares local, model-ready data only. It does not claim that a machine-learning model has been trained.',
    '',
    '## Capture Sources',
    '',
    ...Object.entries(captureStats)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([source, count]) => `- ${source}: ${count}`),
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
    } = await vite.ssrLoadModule('/src/data/artifactIntelligence.node.ts');

    const [
      documentArtifacts,
      executorArtifacts,
      backendServiceArtifacts,
      engineArtifacts,
      pageArtifacts,
      libRegistryArtifacts,
      mlServiceArtifacts,
    ] = await Promise.all([
      scanMarkdownArtifacts(),
      scanExecutorArtifacts(),
      scanBackendServiceArtifacts(),
      scanEngineArtifacts(),
      scanPageArtifacts(),
      scanLibRegistryArtifacts(),
      scanMlServiceArtifacts(),
    ]);

    const captureStats = {
      'core-catalog': 'routes|tools|api|prompts|packs|products|ai-models|nlu|medical-knowledge',
      'docs-markdown': documentArtifacts.length,
      'backend-executors': executorArtifacts.length,
      'backend-services': backendServiceArtifacts.length,
      engines: engineArtifacts.length,
      pages: pageArtifacts.length,
      'lib-registries': libRegistryArtifacts.length,
      'ml-services': mlServiceArtifacts.length,
    };

    const artifacts = buildArtifactCatalog({
      extraArtifacts: [
        ...documentArtifacts,
        ...executorArtifacts,
        ...backendServiceArtifacts,
        ...engineArtifacts,
        ...pageArtifacts,
        ...libRegistryArtifacts,
        ...mlServiceArtifacts,
      ],
    });
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
        buildReport({ artifacts, features, trainingRows, validation, resonance, captureStats }),
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

    const intentLabels = trainingRows.filter((row) => row.labelType === 'intent').length;
    console.log(
      JSON.stringify(
        {
          artifacts: artifacts.length,
          features: features.length,
          trainingRows: trainingRows.length,
          intentLabels,
          captureStats,
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