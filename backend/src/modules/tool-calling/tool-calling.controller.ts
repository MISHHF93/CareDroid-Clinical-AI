import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ToolExecutionService } from './tool-execution.service';
import { ToolResolverService } from './tool-resolver.service';
import { EntitlementService } from '../platform-assets/entitlement.service';
import {
  assertEntitlementLaunchFromRequest,
  resolveToolCallingAssetId,
} from '../platform-assets/entitlement-launch.util';
import { ToolCallingExecuteDto } from './dto/tool-calling-execute.dto';

@Controller('tool-calling')
@UseGuards(AuthGuard('jwt'))
export class ToolCallingController {
  constructor(
    private readonly toolExecutionService: ToolExecutionService,
    private readonly toolResolverService: ToolResolverService,
    private readonly entitlementService: EntitlementService,
  ) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async execute(@Body() body: ToolCallingExecuteDto, @Request() req: any) {
    await assertEntitlementLaunchFromRequest(
      this.entitlementService,
      req,
      resolveToolCallingAssetId(body.toolId),
    );
    return this.toolExecutionService.executePrompt({
      ...body,
      userId: req.user?.id || body.userId || 'anonymous',
      context: {
        ...(body.context || {}),
        req,
      },
    });
  }

  @Get('catalog')
  @HttpCode(HttpStatus.OK)
  getCatalog() {
    const tools = this.toolResolverService.getCatalog();
    return { tools, count: tools.length };
  }

  @Get('resolve')
  @HttpCode(HttpStatus.OK)
  resolveCatalogLaunch(@Query('toolId') toolId: string) {
    return this.toolResolverService.resolveCatalogLaunch(toolId);
  }

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  getLogs(@Request() req: any, @Query('limit') limit?: string) {
    return {
      logs: this.toolExecutionService.getExecutionLogs(
        req.user?.id || 'anonymous',
        limit ? Number(limit) : undefined,
      ),
    };
  }
}
