import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission, Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { CreateEvaluationRunDto } from './evaluation.types';
import { EvaluationService } from './evaluation.service';

// FIXED 2026-08-08 (same gap and same fix as TrainingController, its sibling
// module -- see that controller's own comment for the full rationale).
@Controller('evaluation')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getDashboard() {
    return this.evaluationService.getDashboard();
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getMetricDefinitions() {
    return { metrics: this.evaluationService.getMetricDefinitions() };
  }

  @Get('runs')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getRuns() {
    return { runs: this.evaluationService.getRuns() };
  }

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_AI_TRAINING)
  createRun(@Body() body: CreateEvaluationRunDto) {
    return this.evaluationService.createRun(body);
  }
}
