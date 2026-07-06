import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { ArtifactRouterService } from './artifact-router.service';
import { NluService } from '../nlu/nlu.service';
import { readManifest, type UnifiedModelManifest } from '../shared/manifest';
import { MANIFEST_PATH, resolveClassifierPath, resolveMetricsPath } from '../shared/paths';

export interface UnifiedRouteResult {
  intent: Awaited<ReturnType<NluService['predict']>>;
  artifact: Awaited<ReturnType<ArtifactRouterService['predict']>>;
  latencyMs: number;
}

export interface UnifiedModelStatus {
  name: string;
  manifestPath: string;
  embeddingModel: string;
  updatedAt: string;
  heads: {
    nlu: {
      loaded: boolean;
      classifierPath: string;
      metricsPath: string;
      classifierExists: boolean;
      metricsExists: boolean;
    };
    artifactRouter: {
      loaded: boolean;
      classifierPath: string;
      metricsPath: string;
      classifierExists: boolean;
      metricsExists: boolean;
    };
  };
}

@Injectable()
export class UnifiedAiNodeService {
  constructor(
    private readonly nluService: NluService,
    private readonly artifactRouterService: ArtifactRouterService,
  ) {}

  async load(): Promise<void> {
    await Promise.all([this.nluService.load(), this.artifactRouterService.load()]);
  }

  async route(text: string): Promise<UnifiedRouteResult> {
    const start = Date.now();
    const [intent, artifact] = await Promise.all([
      this.nluService.predict(text),
      this.artifactRouterService.predict(text),
    ]);
    return { intent, artifact, latencyMs: Date.now() - start };
  }

  getManifest(): UnifiedModelManifest {
    return readManifest();
  }

  getStatus(): UnifiedModelStatus {
    const manifest = readManifest();
    const nluClassifier = resolveClassifierPath('nlu');
    const artifactClassifier = resolveClassifierPath('artifact-router');
    const nluMetrics = resolveMetricsPath('nlu');
    const artifactMetrics = resolveMetricsPath('artifact-router');

    return {
      name: manifest.name,
      manifestPath: MANIFEST_PATH,
      embeddingModel: manifest.embeddingModel,
      updatedAt: manifest.updatedAt,
      heads: {
        nlu: {
          loaded: this.nluService.getModelInfo().status === 'loaded',
          classifierPath: nluClassifier,
          metricsPath: nluMetrics,
          classifierExists: existsSync(nluClassifier),
          metricsExists: existsSync(nluMetrics),
        },
        artifactRouter: {
          loaded: this.artifactRouterService.getModelInfo().status === 'loaded',
          classifierPath: artifactClassifier,
          metricsPath: artifactMetrics,
          classifierExists: existsSync(artifactClassifier),
          metricsExists: existsSync(artifactMetrics),
        },
      },
    };
  }
}