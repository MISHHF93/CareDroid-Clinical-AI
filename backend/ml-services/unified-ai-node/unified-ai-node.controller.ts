import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { UnifiedAiNodeService } from './unified-ai-node.service';

interface RouteRequestDto {
  text: string;
}

/**
 * CareDroid Unified AI Node HTTP surface (ADR-0003).
 * Single deployment unit for local NLU + artifact-router heads.
 */
@Controller('ai/node')
export class UnifiedAiNodeController implements OnModuleInit {
  constructor(private readonly unifiedAiNode: UnifiedAiNodeService) {}

  async onModuleInit(): Promise<void> {
    await this.unifiedAiNode.load();
  }

  /** Compact readiness for load balancers / worker probes. */
  @Get('health')
  health() {
    const status = this.unifiedAiNode.getStatus();
    const allLoaded = status.heads.nlu.loaded && status.heads.artifactRouter.loaded;
    const diskReady = this.unifiedAiNode.isReady();
    return {
      status: allLoaded && diskReady ? 'ready' : diskReady ? 'loading' : 'degraded',
      nodeId: status.nodeId,
      singleNode: status.singleNode,
      quarantine: status.quarantine,
      scores: status.scores,
      ready: allLoaded && diskReady,
    };
  }

  /** Full operational status + head metrics + registry binding. */
  @Get('models/health')
  modelsHealth() {
    const status = this.unifiedAiNode.getStatus();
    const allLoaded = status.heads.nlu.loaded && status.heads.artifactRouter.loaded;
    return {
      status: allLoaded ? 'ready' : 'degraded',
      ...status,
    };
  }

  @Get('models/manifest')
  manifest() {
    return this.unifiedAiNode.getManifest();
  }

  /** Alias for clients that expect /ai/node/manifest. */
  @Get('manifest')
  manifestAlias() {
    return this.unifiedAiNode.getManifest();
  }

  @Post('models/route')
  async route(@Body() body: RouteRequestDto) {
    if (!body?.text?.trim()) {
      throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
    }
    if (body.text.length > 2048) {
      throw new HttpException('text exceeds 2048 character limit', HttpStatus.BAD_REQUEST);
    }
    return this.unifiedAiNode.route(body.text);
  }

  /** Alias for clients that expect /ai/node/route. */
  @Post('route')
  async routeAlias(@Body() body: RouteRequestDto) {
    return this.route(body);
  }
}
