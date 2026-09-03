import { ROUTE_RECORDS } from '../config/routes.config';
import {
  ASSET_PACKS,
  SAAS_PRODUCTS,
  buildAssetInventoryProjection,
  buildRouteOwnershipProjection,
} from './assetInventory';
import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { getAiModelRegistry } from './aiModelRegistry';

// artifactIntelligence.node.ts reads NLU training data, medical knowledge docs, and
// locally trained ML model manifests from disk (node:fs) — none of that exists for a
// browser to read, and a static `import` of it here would break the Vite client build
// the same way importing node:fs directly once did (this file is reachable from a real
// routed page, pages/governance/Artifacts.tsx). The dynamic import below only ever runs
// in Node (tests, scripts) per the typeof window guard. Rollup can only statically
// resolve/bundle a dynamic import() whose argument is a literal string — /* @vite-ignore */
// alone doesn't stop that for a production build, only Vite's dev-mode transform. Building
// the specifier from a runtime-computed variable makes it un-traceable, so Rollup leaves
// this call alone entirely instead of trying to bundle the Node-only chunk for the browser.
type NodeArtifactEnrichments = {
  localTrainedMlModels: () => any[];
  nluTrainingExamples: () => any[];
  medicalKnowledgeDocuments: () => any[];
};

let nodeEnrichments: NodeArtifactEnrichments = {
  localTrainedMlModels: () => [],
  nluTrainingExamples: () => [],
  medicalKnowledgeDocuments: () => [],
};

// `typeof window === 'undefined'` is NOT a reliable Node-vs-browser check here: Vitest's
// jsdom test environment defines `window` too, even though tests run on real Node — that
// check would silently make artifactIntelligence.test.ts lose the fs-backed NLU/medical
// knowledge fixtures it asserts on. `process.versions.node` is only ever populated inside
// an actual Node.js process (plain scripts and Vitest-under-jsdom both qualify; a real
// browser has no `process` global at all here since nothing polyfills one).
const isNodeRuntime = typeof process !== 'undefined' && Boolean(process.versions?.node);

if (isNodeRuntime) {
  try {
    const nodeCompanionSpecifier = ['.', 'artifactIntelligence.node'].join('/');
    const mod = await import(/* @vite-ignore */ nodeCompanionSpecifier);
    nodeEnrichments = mod.nodeArtifactEnrichments;
  } catch {
    // Node-only data unavailable (e.g. running outside the repo checkout) — the
    // browser-safe empty fallbacks above are used instead.
  }
}

export const ARTIFACT_SCHEMA_FIELDS = Object.freeze([
  'artifactId',
  'name',
  'type',
  'category',
  'route',
  'sourceFile',
  'frontendStatus',
  'backendStatus',
  'demoStatus',
  'assetPack',
  'product',
  'workspace',
  'roles',
  'organizationTypes',
  'riskLevel',
  'description',
  'dependencies',
  'tags',
  'embeddingText',
  'status',
]);

export const ARTIFACT_FEATURE_FIELDS = Object.freeze([
  'artifactId',
  'normalizedText',
  'tags',
  'typeEncoding',
  'roleEncoding',
  'workspaceEncoding',
  'packEncoding',
  'dependencyCount',
  'riskScore',
  'readinessScore',
]);

export const ARTIFACT_TRAINING_FIELDS = Object.freeze([
  'inputText',
  'targetArtifactId',
  'targetCategory',
  'targetWorkspace',
  'targetPack',
  'targetProduct',
  'labelType',
  'confidence',
]);

const UNKNOWN = 'unknown';
const TYPE_SCORE = Object.freeze({
  tool: 0.82,
  calculator: 0.86,
  dashboard: 0.8,
  route: 0.72,
  workflow: 0.74,
  simulation: 0.76,
  laboratory: 0.76,
  '3d-viewer': 0.7,
  iot: 0.76,
  fleet: 0.76,
  'ai-agent': 0.78,
  'ai-model': 0.78,
  prompt: 0.7,
  automation: 0.7,
  executor: 0.82,
  'api-endpoint': 0.68,
  document: 0.58,
  'asset-pack': 0.84,
  product: 0.84,
  'nlu-example': 0.94,
  'medical-knowledge': 0.88,
  'backend-service': 0.8,
  engine: 0.84,
  page: 0.74,
  registry: 0.76,
});

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function uniq(values) {
  const source = Array.isArray(values) ? values : [values];
  return [
    ...new Set(
      source
        .flatMap(asArray)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function firstKnown(...values: unknown[]): string {
  const found = values.find((value) => value !== undefined && value !== null && value !== '');
  return (found as string | undefined) ?? UNKNOWN;
}

function slug(value) {
  return (
    String(value || UNKNOWN)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || UNKNOWN
  );
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function listValue(values) {
  const list = uniq(values);
  return list.length ? list.join('|') : UNKNOWN;
}

function riskScore(riskLevel) {
  const normalized = slug(riskLevel);
  if (normalized === 'critical') return 1;
  if (normalized === 'high') return 0.8;
  if (normalized === 'medium') return 0.5;
  if (normalized === 'low') return 0.2;
  return 0.4;
}

function readinessScore(artifact) {
  let score = TYPE_SCORE[artifact.type] ?? 0.6;
  if (/backend|api|registered|live|active/.test(`${artifact.backendStatus} ${artifact.status}`))
    score += 0.12;
  if (/demo|mock/.test(artifact.demoStatus)) score -= 0.12;
  if (
    /unsupported|planned/.test(
      `${artifact.backendStatus} ${artifact.frontendStatus} ${artifact.status}`,
    )
  ) {
    score -= 0.24;
  }
  if (artifact.assetPack === UNKNOWN) score -= 0.05;
  if (artifact.product === UNKNOWN) score -= 0.05;
  return Math.max(0.05, Math.min(1, Number(score.toFixed(2))));
}

function artifactText(row) {
  return [
    row.artifactId,
    row.name,
    row.type,
    row.category,
    row.route,
    row.assetPack,
    row.product,
    row.workspace,
    row.roles,
    row.organizationTypes,
    row.riskLevel,
    row.description,
    row.dependencies,
    row.tags,
  ].join(' ');
}

function makeArtifact(row) {
  const artifact = {
    artifactId: firstKnown(row.artifactId),
    name: firstKnown(row.name, row.artifactId),
    type: firstKnown(row.type),
    category: firstKnown(row.category),
    route: firstKnown(row.route),
    sourceFile: firstKnown(row.sourceFile),
    frontendStatus: firstKnown(row.frontendStatus),
    backendStatus: firstKnown(row.backendStatus),
    demoStatus: firstKnown(row.demoStatus),
    assetPack: listValue(row.assetPack),
    product: listValue(row.product),
    workspace: listValue(row.workspace),
    roles: listValue(row.roles),
    organizationTypes: listValue(row.organizationTypes),
    riskLevel: firstKnown(row.riskLevel),
    description: firstKnown(row.description),
    dependencies: listValue(row.dependencies),
    tags: listValue(row.tags),
    embeddingText: '',
    status: firstKnown(row.status, 'active'),
  };
  artifact.embeddingText = normalizeText(row.embeddingText || artifactText(artifact));
  return artifact;
}

function typeForAsset(asset) {
  if (asset.assetType === 'calculator') return 'calculator';
  if (asset.assetType === 'iot-module') return 'iot';
  if (asset.assetType === 'fleet-module') return 'fleet';
  if (asset.assetType === 'ai-assisted-tool') return 'tool';
  if (asset.assetType === 'map') return 'dashboard';
  return asset.assetType || 'tool';
}

function artifactFromAsset(asset) {
  return makeArtifact({
    artifactId: asset.id,
    name: asset.title,
    type: typeForAsset(asset),
    category: asset.category,
    route: asset.route,
    sourceFile: asset.evidence?.sourceFiles?.[0],
    frontendStatus: asset.route ? 'frontend-routed' : 'frontend-catalog',
    backendStatus: asset.evidence?.backendStatus || asset.execution?.supportStatus,
    demoStatus: asset.demoStatus,
    assetPack: asset.packIds,
    product: asset.productIds,
    workspace: asset.workspaceIds,
    roles: asset.roleIds,
    organizationTypes: asset.access?.organizationTypes,
    riskLevel: asset.governance?.riskLevel,
    description: asset.description,
    dependencies: [
      asset.execution?.endpoint,
      ...(asset.evidence?.sourceFiles || []),
      ...(asset.evidence?.tests || []),
    ],
    tags: [
      asset.assetType,
      asset.category,
      ...(asset.workspaceIds || []),
      ...(asset.packIds || []),
    ],
    status: asset.lifecycle,
  });
}

function artifactFromRoute(route, ownership) {
  return makeArtifact({
    artifactId: `route-${route.id}`,
    name: `${route.id} route`,
    type: 'route',
    category: route.navGroup,
    route: route.path,
    sourceFile: route.componentKey ? `src/App.jsx#${route.componentKey}` : 'src/app/router.tsx',
    frontendStatus: 'frontend-routed',
    backendStatus: ownership?.ownerType === 'asset' ? 'asset-backed' : 'system-route',
    demoStatus: route.status === 'active' ? 'live-or-local' : 'unknown',
    assetPack: UNKNOWN,
    product: UNKNOWN,
    workspace: route.navGroup,
    roles: route.auth === 'required' ? ['authenticated-user'] : ['public'],
    organizationTypes: UNKNOWN,
    riskLevel: route.auth === 'required' ? 'medium' : 'low',
    description: route.notes || ownership?.systemPurpose || `CareDroid route ${route.path}`,
    dependencies: ownership?.assetIds || route.aliases || [],
    tags: ['route', route.navGroup, route.status, ...(route.aliases || [])],
    status: route.status,
  });
}

function artifactFromApi(route) {
  return makeArtifact({
    artifactId: `api-${slug(route.method)}-${slug(route.path)}`,
    name: `${route.method} ${route.path}`,
    type: 'api-endpoint',
    category: route.controller,
    route: route.path,
    sourceFile: `backend/${route.controller}`,
    frontendStatus: 'api-inventory',
    backendStatus: 'backend-controller',
    demoStatus: /demo/i.test(route.notes || '') ? 'demo' : 'live-or-local',
    assetPack: UNKNOWN,
    product: UNKNOWN,
    workspace: 'backend',
    roles: UNKNOWN,
    organizationTypes: UNKNOWN,
    riskLevel: route.method === 'GET' ? 'medium' : 'high',
    description: route.notes || `${route.controller} exposes ${route.method} ${route.path}.`,
    dependencies: [route.controller],
    tags: ['api', route.method, route.controller],
    status: 'active',
  });
}

function artifactFromFrontendCall(call) {
  return makeArtifact({
    artifactId: `frontend-api-${call.id}`,
    name: call.id,
    type: 'api-endpoint',
    category: call.capability || UNKNOWN,
    route: call.path,
    sourceFile: call.client,
    frontendStatus: 'frontend-api-call',
    backendStatus: call.capability ? 'capability-gated' : 'unknown',
    demoStatus: UNKNOWN,
    assetPack: UNKNOWN,
    product: UNKNOWN,
    workspace: 'frontend',
    roles: UNKNOWN,
    organizationTypes: UNKNOWN,
    riskLevel: call.method === 'GET' ? 'medium' : 'high',
    description: `${call.client} calls ${call.method} ${call.path}.`,
    dependencies: [call.capability, call.client],
    tags: ['frontend-api', call.method, call.capability],
    status: 'active',
  });
}

function artifactFromPrompt(tool) {
  return makeArtifact({
    artifactId: `prompt-${tool.toolId}`,
    name: `${tool.toolName || tool.toolId} prompt`,
    type: 'prompt',
    category: tool.category,
    route: tool.path,
    sourceFile: 'src/data/clinicalIntentToolCatalog.ts',
    frontendStatus: 'assistant-seed',
    backendStatus: tool.postExecutable
      ? 'executor-backed'
      : tool.backendRouted
        ? 'chat-routed'
        : 'chat-assisted',
    demoStatus: tool.backendExecutable ? 'live-or-local' : 'demo-or-guided',
    assetPack: UNKNOWN,
    product: UNKNOWN,
    workspace: tool.category,
    roles: UNKNOWN,
    organizationTypes: UNKNOWN,
    riskLevel: 'high',
    description: tool.chatSeed || tool.description || 'Clinical assistant prompt artifact.',
    dependencies: [tool.sidebarToolId, tool.toolId, tool.path],
    tags: ['prompt', tool.category, tool.sidebarToolId],
    status: 'active',
  });
}

function artifactFromPack(pack) {
  return makeArtifact({
    artifactId: `pack-${pack.id}`,
    name: pack.name,
    type: 'asset-pack',
    category: 'asset-pack',
    route: '/asset-packs',
    sourceFile: 'src/data/assetInventory.ts',
    frontendStatus: 'frontend-routed',
    backendStatus: 'platform-catalog',
    demoStatus: 'live-or-local',
    assetPack: pack.id,
    product: SAAS_PRODUCTS.filter((product) => product.packIds.includes(pack.id)).map(
      (product) => product.id,
    ),
    workspace: pack.workspaceIds,
    roles: UNKNOWN,
    organizationTypes: 'hospital',
    riskLevel: 'medium',
    description: `${pack.name} groups CareDroid artifacts for entitlement, navigation, and product packaging.`,
    dependencies: pack.workspaceIds,
    tags: ['asset-pack', pack.id, ...(pack.workspaceIds || [])],
    status: 'active',
  });
}

function artifactFromProduct(product) {
  return makeArtifact({
    artifactId: `product-${product.id}`,
    name: product.name,
    type: 'product',
    category: 'product',
    route: '/products',
    sourceFile: 'src/data/assetInventory.ts',
    frontendStatus: 'frontend-routed',
    backendStatus: 'product-catalog',
    demoStatus: 'live-or-local',
    assetPack: product.packIds,
    product: product.id,
    workspace: product.packIds.flatMap(
      (packId) => ASSET_PACKS.find((pack) => pack.id === packId)?.workspaceIds || [],
    ),
    roles: UNKNOWN,
    organizationTypes: 'hospital',
    riskLevel: 'medium',
    description: `${product.name} is a sellable CareDroid SaaS product mapped to asset packs.`,
    dependencies: product.packIds,
    tags: ['product', product.layer, ...product.packIds],
    status: 'active',
  });
}

function artifactFromLocalMlModel(model) {
  return makeArtifact({
    artifactId: `model-${model.modelId}`,
    name: model.name,
    type: 'ai-model',
    category: 'local-ml-head',
    route: model.route,
    sourceFile: model.classifierPath,
    frontendStatus: 'unified-ai-node',
    backendStatus: model.status,
    demoStatus: model.status === 'active' ? 'live-or-local' : 'training-required',
    assetPack: 'ai-workflow-pack',
    product: 'product-core-platform',
    workspace: 'ai-workflow|clinical',
    roles: 'clinician|platform-admin',
    organizationTypes: 'hospital',
    riskLevel: 'high',
    description: `${model.purpose}${model.accuracy ? ` (${(model.accuracy * 100).toFixed(1)}% accuracy)` : ''}`,
    dependencies: [
      model.classifierPath,
      model.metricsPath,
      model.manifestPath || 'backend/ml-services/models/manifest.json',
    ],
    tags: ['ai-model', 'local-ml', model.head, model.modelId, model.architecture || 'untrained'],
    embeddingText: `${model.name} ${model.purpose} ${model.head} ${model.route} local trained classifier`,
    status: model.status,
  });
}

function artifactFromAiModel(model) {
  return makeArtifact({
    artifactId: `model-${model.modelId}`,
    name: model.name,
    type: 'ai-model',
    category: 'ai-system',
    route: model.route || '/ai-models',
    sourceFile: 'src/data/aiModelRegistry.ts',
    frontendStatus: 'frontend-routed',
    backendStatus: model.status,
    demoStatus: model.status === 'demo-ready' ? 'demo-explicit' : 'live-or-local',
    assetPack: UNKNOWN,
    product: 'product-core-platform',
    workspace: 'ai-workflow',
    roles: ['admin', 'clinician', 'operator'],
    organizationTypes: 'hospital',
    riskLevel: model.riskLevel,
    description: model.purpose,
    dependencies: model.artifactDependencies,
    tags: ['ai-model', model.modelId, model.owner, model.costProfile],
    status: model.status,
  });
}

function artifactFromNluExample(example) {
  return makeArtifact({
    artifactId: `nlu-${example.split}-${example.index}`,
    name: `${example.intent} query`,
    type: 'nlu-example',
    category: example.intent,
    route: '/api/nlu/predict',
    sourceFile: example.sourceFile,
    frontendStatus: 'nlu-training-corpus',
    backendStatus: 'ml-services-nlu',
    demoStatus: 'training-split',
    assetPack: 'ai-workflow-pack',
    product: 'product-core-platform',
    workspace: 'ai-workflow|clinical',
    roles: 'clinician|nurse|emergency-physician|platform-admin',
    organizationTypes: 'hospital',
    riskLevel: example.intent === 'emergency_alert' ? 'critical' : 'medium',
    description: example.text,
    dependencies: [
      example.sourceFile,
      'backend/ml-services/models/nlu/classifier.json',
      'backend/ml-services/models/manifest.json',
    ],
    tags: [
      'nlu',
      example.intent,
      example.split,
      ...(example.subcategory ? [example.subcategory] : []),
    ],
    embeddingText: `${example.text} ${example.intent} ${example.subcategory || ''} nlu intent routing`,
    status: 'active',
  });
}

function artifactFromMedicalKnowledge(doc) {
  return makeArtifact({
    artifactId: `medical-knowledge-${slug(doc.fileName)}`,
    name: doc.title,
    type: 'medical-knowledge',
    category: 'clinical-reference',
    route: '/emergency/tools',
    sourceFile: doc.relative,
    frontendStatus: 'rag-corpus',
    backendStatus: 'rag-ingest-candidate',
    demoStatus: 'reference',
    assetPack: 'core-platform',
    product: 'product-core-platform',
    workspace: 'clinical|education',
    roles: 'clinician|nurse|emergency-physician|resident|pharmacist',
    organizationTypes: 'hospital',
    riskLevel: /interaction|sepsis|arrest|critical/i.test(doc.body) ? 'high' : 'medium',
    description:
      doc.body
        .split(/\r?\n/)
        .find((line) => line.trim() && !line.startsWith('#'))
        ?.trim() || doc.title,
    dependencies: doc.relative,
    tags: ['medical-knowledge', 'rag', 'clinical-reference', slug(doc.fileName)],
    embeddingText: `${doc.title} ${doc.relative} ${doc.body.slice(0, 1600)}`,
    status: 'active',
  });
}

function dedupeArtifacts(artifacts) {
  const seen = new Set();
  return artifacts.filter((artifact) => {
    if (seen.has(artifact.artifactId)) return false;
    seen.add(artifact.artifactId);
    return true;
  });
}

export function buildArtifactCatalog({ extraArtifacts = [] as any[] }: any = {}) {
  const assets = buildAssetInventoryProjection();
  const ownership = new Map(
    buildRouteOwnershipProjection({ assets }).map((route) => [route.path, route]),
  );
  const artifacts = [
    ...assets.map(artifactFromAsset),
    ...ROUTE_RECORDS.map((route) => artifactFromRoute(route, ownership.get(route.path))),
    ...BACKEND_HTTP_ROUTES.map(artifactFromApi),
    ...FRONTEND_API_CALLS.map(artifactFromFrontendCall),
    ...clinicalIntentTools.filter((tool) => tool.chatSeed).map(artifactFromPrompt),
    ...ASSET_PACKS.map(artifactFromPack),
    ...SAAS_PRODUCTS.map(artifactFromProduct),
    ...getAiModelRegistry().map(artifactFromAiModel),
    ...nodeEnrichments.localTrainedMlModels().map(artifactFromLocalMlModel),
    ...nodeEnrichments.nluTrainingExamples().map(artifactFromNluExample),
    ...nodeEnrichments.medicalKnowledgeDocuments().map(artifactFromMedicalKnowledge),
    ...extraArtifacts.map(makeArtifact),
  ];
  return dedupeArtifacts(artifacts).sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}

export function validateArtifactCatalog(artifacts = buildArtifactCatalog()) {
  const ids = artifacts.map((artifact) => artifact.artifactId);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const missingRequired = artifacts.filter((artifact) =>
    ARTIFACT_SCHEMA_FIELDS.some((field) => artifact[field] === undefined || artifact[field] === ''),
  );
  return {
    ok: duplicateIds.length === 0 && missingRequired.length === 0,
    duplicateIds: uniq(duplicateIds),
    missingRequired,
  };
}

export function encodeArtifactFeatures(artifacts = buildArtifactCatalog()) {
  return artifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    normalizedText: normalizeText(artifact.embeddingText),
    tags: artifact.tags,
    typeEncoding: `type:${artifact.type}`,
    roleEncoding: listValue(artifact.roles.split('|').map((role) => `role:${slug(role)}`)),
    workspaceEncoding: listValue(
      artifact.workspace.split('|').map((workspace) => `workspace:${slug(workspace)}`),
    ),
    packEncoding: listValue(artifact.assetPack.split('|').map((pack) => `pack:${slug(pack)}`)),
    dependencyCount:
      artifact.dependencies === UNKNOWN ? 0 : artifact.dependencies.split('|').length,
    riskScore: riskScore(artifact.riskLevel),
    readinessScore: readinessScore(artifact),
  }));
}

export function buildArtifactTrainingDataset(artifacts = buildArtifactCatalog()) {
  return artifacts.flatMap((artifact) => {
    const labels = [
      {
        inputText: artifact.name,
        labelType: 'name',
        confidence: 0.92,
      },
      {
        inputText: artifact.route !== UNKNOWN ? artifact.route : artifact.description,
        labelType: artifact.route !== UNKNOWN ? 'route' : 'description',
        confidence: artifact.route !== UNKNOWN ? 0.9 : 0.72,
      },
      {
        inputText: artifact.tags,
        labelType: 'tags',
        confidence: 0.78,
      },
    ];

    if (
      artifact.type === 'nlu-example' &&
      artifact.description &&
      artifact.description !== UNKNOWN
    ) {
      labels.push({
        inputText: artifact.description,
        labelType: 'intent',
        confidence: 0.95,
      });
    }

    if (
      ['calculator', 'tool', 'executor', 'route', 'page'].includes(artifact.type) &&
      artifact.description &&
      artifact.description !== UNKNOWN &&
      artifact.description.length >= 20
    ) {
      labels.push({
        inputText: artifact.description,
        labelType: 'intent',
        confidence: 0.88,
      });
    }

    const filtered = labels.filter((label) => label.inputText && label.inputText !== UNKNOWN);

    return filtered.map((label) => ({
      inputText: label.inputText,
      targetArtifactId: artifact.artifactId,
      targetCategory: artifact.category,
      targetWorkspace: artifact.workspace,
      targetPack: artifact.assetPack,
      targetProduct: artifact.product,
      labelType: label.labelType,
      confidence: label.confidence,
    }));
  });
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(rows, fields) {
  return [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
  ].join('\n');
}

export function artifactsToCsv(artifacts = buildArtifactCatalog()) {
  return rowsToCsv(artifacts, ARTIFACT_SCHEMA_FIELDS);
}

export function artifactFeaturesToCsv(features = encodeArtifactFeatures()) {
  return rowsToCsv(features, ARTIFACT_FEATURE_FIELDS);
}

export function artifactTrainingDatasetToCsv(rows = buildArtifactTrainingDataset()) {
  return rowsToCsv(rows, ARTIFACT_TRAINING_FIELDS);
}

function tokenSet(text) {
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter((token) => token.length > 2),
  );
}

function jaccardSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / (left.size + right.size - intersection);
}

export class ArtifactResonanceService {
  artifacts: any[] = [];
  byId: Map<any, any> = new Map();

  constructor(artifacts = buildArtifactCatalog()) {
    this.artifacts = artifacts;
    this.byId = new Map(artifacts.map((artifact) => [artifact.artifactId, artifact]));
  }

  findSimilarArtifacts(artifactId, { limit = 8 }: any = {}) {
    const target = this.byId.get(artifactId);
    if (!target) return [];
    return this.artifacts
      .filter((artifact) => artifact.artifactId !== artifactId)
      .map((artifact) => ({
        artifact,
        score: Number(jaccardSimilarity(target.embeddingText, artifact.embeddingText).toFixed(3)),
      }))
      .filter((row) => row.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.artifact.artifactId.localeCompare(b.artifact.artifactId),
      )
      .slice(0, limit);
  }

  recommendArtifactsForRole(role, { limit = 12 }: any = {}) {
    const normalized = slug(role);
    return this.artifacts
      .filter((artifact) =>
        normalizeText(`${artifact.roles} ${artifact.embeddingText}`).includes(normalized),
      )
      .slice(0, limit);
  }

  recommendArtifactsForWorkspace(workspace, { limit = 12 }: any = {}) {
    const normalized = slug(workspace);
    return this.artifacts
      .filter((artifact) =>
        normalizeText(`${artifact.workspace} ${artifact.embeddingText}`).includes(normalized),
      )
      .slice(0, limit);
  }

  recommendAssetsForPack(packId, { limit = 20 }: any = {}) {
    const normalized = slug(packId);
    return this.artifacts
      .filter((artifact) => normalizeText(artifact.assetPack).includes(normalized))
      .slice(0, limit);
  }

  detectOrphanArtifacts() {
    return this.artifacts.filter(
      (artifact) =>
        artifact.assetPack === UNKNOWN &&
        artifact.product === UNKNOWN &&
        !['route', 'api-endpoint', 'document'].includes(artifact.type),
    );
  }

  detectDuplicateArtifacts() {
    const groups = new Map();
    for (const artifact of this.artifacts) {
      const key = `${slug(artifact.type)}:${slug(artifact.name)}`;
      groups.set(key, [...(groups.get(key) || []), artifact]);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  }

  detectMissingMetadata() {
    return this.artifacts
      .map((artifact) => ({
        artifact,
        missingFields: ARTIFACT_SCHEMA_FIELDS.filter((field) => artifact[field] === UNKNOWN),
      }))
      .filter((row) => row.missingFields.length > 0);
  }
}

export function createArtifactResonanceService(artifacts = buildArtifactCatalog()) {
  return new ArtifactResonanceService(artifacts);
}
