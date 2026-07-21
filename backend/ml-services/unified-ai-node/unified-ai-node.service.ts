import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { ArtifactRouterService } from './artifact-router.service';
import { NluService } from '../nlu/nlu.service';
import { loadLocalMlModelDescriptors } from '../shared/local-ml-models';
import { readManifest, type UnifiedModelManifest } from '../shared/manifest';
import { MANIFEST_PATH, resolveClassifierPath, resolveMetricsPath } from '../shared/paths';

export interface UnifiedRouteResult {
  intent: Awaited<ReturnType<NluService['predict']>>;
  artifact: Awaited<ReturnType<ArtifactRouterService['predict']>>;
  /** Shared embedding model name (both heads use the same backbone; input text may differ per head). */
  embeddingModel: string;
  nodeId: string;
  latencyMs: number;
}

export interface UnifiedHeadStatus {
  loaded: boolean;
  classifierPath: string;
  metricsPath: string;
  classifierExists: boolean;
  metricsExists: boolean;
  architecture?: string;
  accuracy?: number;
  testSetSize?: number;
  evaluatedAt?: string;
  trainedAt?: string;
}

export interface UnifiedModelStatus {
  /** Canonical single-node identity (ADR-0003). */
  nodeId: string;
  name: string;
  registryModelId: string;
  singleNode: true;
  quarantine: 'none';
  manifestPath: string;
  embeddingModel: string;
  updatedAt: string;
  scores: {
    nluAccuracy: number | null;
    artifactRouterAccuracy: number | null;
    composite: number | null;
  };
  heads: {
    nlu: UnifiedHeadStatus;
    artifactRouter: UnifiedHeadStatus;
  };
  localDescriptors: ReturnType<typeof loadLocalMlModelDescriptors>;
}

function readMetricsFile(metricsPath: string): Record<string, unknown> {
  if (!existsSync(metricsPath)) return {};
  try {
    return JSON.parse(readFileSync(metricsPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

@Injectable()
export class UnifiedAiNodeService {
  /** Stable product identity for the CareDroid 1-node local ML backbone. */
  static readonly NODE_ID = 'caredroid-unified-ai-node';
  static readonly REGISTRY_MODEL_ID = 'mdl-unified-ai-node-v1';

  constructor(
    private readonly nluService: NluService,
    private readonly artifactRouterService: ArtifactRouterService,
  ) {}

  async load(): Promise<void> {
    await Promise.all([this.nluService.load(), this.artifactRouterService.load()]);
  }

  async route(text: string): Promise<UnifiedRouteResult> {
    const start = Date.now();
    // Heads may format text differently (raw utterance vs router input), so each
    // still embeds its own string — but both share one embedding *model* and
    // one deployment unit (this service).
    const [intent, artifact] = await Promise.all([
      this.nluService.predict(text),
      this.artifactRouterService.predict(text),
    ]);
    const manifest = readManifest();
    return {
      intent,
      artifact,
      embeddingModel: manifest.embeddingModel,
      nodeId: UnifiedAiNodeService.NODE_ID,
      latencyMs: Date.now() - start,
    };
  }

  getManifest(): UnifiedModelManifest {
    return readManifest();
  }

  getStatus(): UnifiedModelStatus {
    const manifest = readManifest();
    const nluClassifier = resolveClassifierPath('nlu');
    const artifactClassifier = resolveClassifierPath('artifact-router');
    const nluMetricsPath = resolveMetricsPath('nlu');
    const artifactMetricsPath = resolveMetricsPath('artifact-router');
    const nluMetrics = readMetricsFile(nluMetricsPath);
    const artifactMetrics = readMetricsFile(artifactMetricsPath);

    const nluAccuracy =
      asNumber(nluMetrics.accuracy) ?? asNumber(manifest.heads.nlu?.accuracy) ?? null;
    const artifactAccuracy =
      asNumber(artifactMetrics.accuracy) ??
      asNumber(manifest.heads['artifact-router']?.accuracy) ??
      null;

    let composite: number | null = null;
    if (nluAccuracy != null && artifactAccuracy != null) {
      // Equal-weight composite for operational dashboards (not a medical claim).
      composite = Math.round(((nluAccuracy + artifactAccuracy) / 2) * 10000) / 10000;
    }

    const nluHead: UnifiedHeadStatus = {
      loaded: this.nluService.getModelInfo().status === 'loaded',
      classifierPath: nluClassifier,
      metricsPath: nluMetricsPath,
      classifierExists: existsSync(nluClassifier),
      metricsExists: existsSync(nluMetricsPath),
      architecture: asString(nluMetrics.architecture) ?? manifest.heads.nlu?.architecture,
      accuracy: nluAccuracy ?? undefined,
      testSetSize: asNumber(nluMetrics.testSetSize) ?? manifest.heads.nlu?.testSetSize,
      evaluatedAt: asString(nluMetrics.evaluatedAt) ?? manifest.heads.nlu?.evaluatedAt,
      trainedAt: asString(nluMetrics.trainedAt) ?? manifest.heads.nlu?.trainedAt,
    };

    const artifactHead: UnifiedHeadStatus = {
      loaded: this.artifactRouterService.getModelInfo().status === 'loaded',
      classifierPath: artifactClassifier,
      metricsPath: artifactMetricsPath,
      classifierExists: existsSync(artifactClassifier),
      metricsExists: existsSync(artifactMetricsPath),
      architecture:
        asString(artifactMetrics.architecture) ??
        manifest.heads['artifact-router']?.architecture,
      accuracy: artifactAccuracy ?? undefined,
      testSetSize:
        asNumber(artifactMetrics.testSetSize) ??
        manifest.heads['artifact-router']?.testSetSize,
      evaluatedAt:
        asString(artifactMetrics.evaluatedAt) ??
        manifest.heads['artifact-router']?.evaluatedAt,
      trainedAt:
        asString(artifactMetrics.trainedAt) ??
        manifest.heads['artifact-router']?.trainedAt,
    };

    return {
      nodeId: UnifiedAiNodeService.NODE_ID,
      name: manifest.name,
      registryModelId: UnifiedAiNodeService.REGISTRY_MODEL_ID,
      singleNode: true,
      quarantine: 'none',
      manifestPath: MANIFEST_PATH,
      embeddingModel: manifest.embeddingModel,
      updatedAt: manifest.updatedAt,
      scores: {
        nluAccuracy,
        artifactRouterAccuracy: artifactAccuracy,
        composite,
      },
      heads: {
        nlu: nluHead,
        artifactRouter: artifactHead,
      },
      localDescriptors: loadLocalMlModelDescriptors(),
    };
  }

  /**
   * Offline-friendly readiness check used by health and verify scripts.
   * Ready = both classifiers present on disk and loadable in-process when requested.
   */
  isReady(): boolean {
    const status = this.getStatus();
    return (
      status.heads.nlu.classifierExists &&
      status.heads.artifactRouter.classifierExists &&
      status.singleNode === true &&
      status.quarantine === 'none'
    );
  }

  /** Absolute models root for ops tooling. */
  getModelsRoot(): string {
    return path.dirname(MANIFEST_PATH);
  }
}
