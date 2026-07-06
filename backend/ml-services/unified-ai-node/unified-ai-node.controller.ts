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

@Controller('ai/node/models')
export class UnifiedAiNodeController implements OnModuleInit {
  constructor(private readonly unifiedAiNode: UnifiedAiNodeService) {}

  async onModuleInit(): Promise<void> {
    await this.unifiedAiNode.load();
  }

  @Get('health')
  health() {
    const status = this.unifiedAiNode.getStatus();
    const allLoaded = status.heads.nlu.loaded && status.heads.artifactRouter.loaded;
    return {
      status: allLoaded ? 'ready' : 'degraded',
      ...status,
    };
  }

  @Get('manifest')
  manifest() {
    return this.unifiedAiNode.getManifest();
  }

  @Post('route')
  async route(@Body() body: RouteRequestDto) {
    if (!body?.text?.trim()) {
      throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
    }
    if (body.text.length > 2048) {
      throw new HttpException('text exceeds 2048 character limit', HttpStatus.BAD_REQUEST);
    }
    return this.unifiedAiNode.route(body.text);
  }
}