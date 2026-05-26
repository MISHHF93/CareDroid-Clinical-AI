import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CostOptimizationRequest } from './cost-optimizer.types';
import { RoutingOptimizerService } from './routing-optimizer.service';

@Controller('cost-optimizer')
@UseGuards(AuthGuard('jwt'))
export class CostOptimizerController {
  constructor(private readonly routingOptimizer: RoutingOptimizerService) {}

  @Post('route')
  @HttpCode(HttpStatus.OK)
  route(@Body() body: CostOptimizationRequest) {
    return this.routingOptimizer.optimizeRequest(body);
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  dashboard() {
    return this.routingOptimizer.getDashboardMetrics();
  }
}
