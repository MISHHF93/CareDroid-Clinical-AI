import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppNavigatorService } from './app-navigator.service';
import { NavigatorQueryDto } from './dto/navigator-query.dto';

/**
 * Ported from the formerly-standalone navigator/ app (2026-08-06
 * consolidation) so "where do I find X?" workflow lookup is a real, linked
 * feature of the one product, not a disconnected companion on its own port.
 * Contains no patient data and is not a clinical decision-support system —
 * a plain JWT check is enough, no permission gate beyond being signed in.
 */
@ApiTags('app-navigator')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('navigator')
export class AppNavigatorController {
  constructor(private readonly navigatorService: AppNavigatorService) {}

  @Get('health')
  @ApiOperation({ summary: 'App navigator index status and Groq-synthesis availability' })
  health() {
    return this.navigatorService.getHealth();
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Current public application-location catalog' })
  catalog() {
    return this.navigatorService.getCatalog();
  }

  @Post('query')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Ask a workflow question, get grounded route matches' })
  async query(@Body() body: NavigatorQueryDto) {
    return this.navigatorService.query(body.query);
  }
}
