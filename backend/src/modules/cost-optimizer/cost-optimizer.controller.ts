import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { RoutingOptimizerService } from './routing-optimizer.service';
import { CostOptimizationRequestDto } from './dto/cost-optimizer-request.dto';

@Controller('cost-optimizer')
@UseGuards(AuthGuard('jwt'))
export class CostOptimizerController {
  constructor(private readonly routingOptimizer: RoutingOptimizerService) {}

  @Post('route')
  @HttpCode(HttpStatus.OK)
  route(@Body() body: CostOptimizationRequestDto) {
    return this.routingOptimizer.optimizeRequest(body);
  }

  // HEAL-331: getDashboardMetrics() reads process-wide, unscoped in-memory
  // counters (total AI-routing requests/cost, per-strategy route counts) --
  // this route had no permission check at all beyond "is authenticated",
  // exposing platform-wide AI cost/routing business data to any
  // authenticated user of any organization or role, including STUDENT.
  // Gated to the same VIEW_OPERATIONS tier this codebase already uses for
  // similar operational-dashboard reads (platform-telemetry.controller.ts).
  @Get('dashboard')
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.VIEW_OPERATIONS)
  @HttpCode(HttpStatus.OK)
  dashboard() {
    return this.routingOptimizer.getDashboardMetrics();
  }
}
