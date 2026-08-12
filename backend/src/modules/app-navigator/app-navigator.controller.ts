import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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
 * a plain JWT check is enough for most of the catalog. `query()` additionally
 * passes the caller's role through so `AppNavigatorService` can hide the
 * handful of admin/manager-scoped results (settings, audit, staff, analytics
 * pages) from roles that don't hold the corresponding Permission — those
 * pages are genuinely permission-gated at the route level, and the search
 * results were leaking their existence/description to any signed-in role.
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
  async query(@Req() req: any, @Body() body: NavigatorQueryDto) {
    return this.navigatorService.query(body.query, req.user?.role);
  }
}
