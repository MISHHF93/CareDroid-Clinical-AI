/**
 * In-process smoke test for the unified AI node (NLU + artifact-router heads).
 * Usage: ts-node ml-services/unified-ai-node/scripts/smokeTest.ts
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { embedText } from '../../nlu/training/embeddings';
import { loadAnyClassifier, predictFromAny } from '../../nlu/training/classifier';
import { MANIFEST_PATH, resolveClassifierPath } from '../../shared/paths';
import { resolveExecutorToolId } from '../../shared/routing-maps';

const SAMPLES = [
  { text: 'Calculate SOFA score for ICU patient with hypotension', expectIntent: 'sofa_score_calculation', expectArtifact: 'calculator' },
  { text: 'Can warfarin be combined with aspirin safely?', expectIntent: 'drug_interaction_check' },
  { text: 'Potassium is 6.1 mEq/L — interpret this lab result', expectIntent: 'lab_interpretation' },
  { text: 'Patient is coding — need immediate emergency response', expectIntent: 'emergency_alert' },
  { text: 'What causes hyponatremia in heart failure?', expectIntent: 'general_clinical_query' },
  { text: 'SOFA Score Calculator', expectArtifact: 'calculator' },
  { text: '/tools/calculators/sofa', expectArtifact: 'calculator' },
];

function labelName(weights: ReturnType<typeof loadAnyClassifier>, labelId: number): string {
  const map = weights.labelToIntent ?? {};
  return map[labelId] ?? map[String(labelId)] ?? 'unknown';
}

async function main(): Promise<void> {
  const nluPath = resolveClassifierPath('nlu');
  const artPath = resolveClassifierPath('artifact-router');
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

  console.log('=== Unified AI Node Smoke Test ===\n');
  console.log('Manifest:', manifest.name, '| updated:', manifest.updatedAt);
  console.log('Shared embedding:', manifest.embeddingModel);
  console.log('NLU classifier exists:', existsSync(nluPath));
  console.log('Artifact classifier exists:', existsSync(artPath));
  console.log('NLU accuracy (manifest):', `${(manifest.heads.nlu.accuracy * 100).toFixed(2)}%`);
  console.log(
    'Artifact accuracy (manifest):',
    `${(manifest.heads['artifact-router'].accuracy * 100).toFixed(2)}%`,
  );

  const nlu = loadAnyClassifier(nluPath);
  const art = loadAnyClassifier(artPath);
  const warmup = await embedText('warmup clinical query');
  const nluEmbDim = nlu.embeddingDim ?? ('w1' in nlu ? nlu.w1[0]?.length : nlu.weights?.[0]?.length) ?? 0;
  const artEmbDim = art.embeddingDim ?? ('w1' in art ? art.w1[0]?.length : art.weights?.[0]?.length) ?? 0;
  const nluHidden = 'hiddenDim' in nlu ? nlu.hiddenDim : 'n/a';
  const artHidden = 'hiddenDim' in art ? art.hiddenDim : 'n/a';

  console.log('\nEmbedding check:');
  console.log(`  Runtime dim: ${warmup.length}`);
  console.log(`  NLU weights expect: ${nluEmbDim} | arch: ${nlu.kind} | hidden: ${nluHidden}`);
  console.log(`  Artifact weights expect: ${artEmbDim} | arch: ${art.kind} | hidden: ${artHidden}`);

  if (warmup.length !== nluEmbDim || warmup.length !== artEmbDim) {
    console.error('\nFAIL: embedding dimension mismatch');
    process.exitCode = 1;
    return;
  }

  console.log('\nSample predictions:');
  let pass = 0;
  for (const sample of SAMPLES) {
    const embedding = await embedText(sample.text);
    const nluPred = predictFromAny(nlu, embedding);
    const artPred = predictFromAny(art, embedding);
    const intent = labelName(nlu, nluPred.labelId);
    const artifact = labelName(art, artPred.labelId);
    const toolId = resolveExecutorToolId(intent, artifact, sample.text);
    const intentOk = !sample.expectIntent || intent === sample.expectIntent;
    const artOk = !sample.expectArtifact || artifact === sample.expectArtifact;
    const ok = intentOk && artOk;
    if (ok) pass += 1;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'} | "${sample.text.slice(0, 48)}..."`,
      `→ intent=${intent}(${nluPred.confidence.toFixed(3)})`,
      `artifact=${artifact}(${artPred.confidence.toFixed(3)})`,
      toolId ? `tool=${toolId}` : '',
    );
  }

  console.log(`\nResult: ${pass}/${SAMPLES.length} sample checks passed`);
  if (pass < SAMPLES.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}