import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission, Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { CreateTrainingRunDto, EvaluateTrainingRunDto } from './training.types';
import { TrainingService } from './training.service';

// FIXED 2026-08-08 (was: every route here only required AuthGuard('jwt') --
// any authenticated user, not gated by AuthorizationGuard/@Permissions(...)
// like most other controllers in this codebase). Added VIEW_AI_TRAINING /
// MANAGE_AI_TRAINING (backend/src/modules/auth/enums/permission.enum.ts),
// granted only to UserRole.ADMIN -- the correctly-functioning 5-value
// backend role enum, not the SaaS roleProfileId vocabulary, which has a
// separate, documented, deliberately-unfixed mismatch bug (see memory:
// User/Role vocabulary mismatch). POST runs/:runId/evaluate's actual
// data-integrity risk -- a caller's numbers silently entering the
// model-promotion pool -- was already closed at the data layer separately:
// see EvaluateTrainingRunDto.provenance and TrainingService.evaluateRun(),
// which never let a caller's claim alone resolve to a promotion-eligible
// provenance. This adds the missing access-control layer on top of that.
@Controller('training')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('pipeline')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getPipeline() {
    return {
      pipeline: this.trainingService.getPipeline(),
      capabilities: this.trainingService.getCapabilities(),
    };
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getDashboard() {
    return this.trainingService.getDashboard();
  }

  @Get('runs')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getRuns() {
    return { runs: this.trainingService.getRuns() };
  }

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_AI_TRAINING)
  createRun(@Body() body: CreateTrainingRunDto) {
    return this.trainingService.createRun(body);
  }

  @Post('runs/:runId/evaluate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_AI_TRAINING)
  evaluateRun(@Param('runId') runId: string, @Body() body: EvaluateTrainingRunDto) {
    return this.trainingService.evaluateRun(runId, body);
  }

  @Get('moe-plan')
  @HttpCode(HttpStatus.OK)
  @AnyPermission(Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING)
  getMoeTrainingPlan(@Query('prompt') prompt?: string) {
    return this.trainingService.getMoeTrainingPlan(prompt);
  }
}
