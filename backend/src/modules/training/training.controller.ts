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
import { CreateTrainingRunDto, EvaluateTrainingRunDto } from './training.types';
import { TrainingService } from './training.service';

// KNOWN GAP (documented 2026-08-08, not fixed this round): every route here
// only requires AuthGuard('jwt') -- any authenticated user, not gated by
// AuthorizationGuard/@RequirePermission(...) like most other controllers in
// this codebase. No Permission enum value exists yet for
// training/evaluation configuration (checked
// backend/src/modules/auth/enums/permission.enum.ts). Adding one is a
// separate RBAC change. In the meantime, POST runs/:runId/evaluate's actual
// data-integrity risk -- a caller's numbers silently entering the
// model-promotion pool -- is closed at the data layer instead: see
// EvaluateTrainingRunDto.provenance and TrainingService.evaluateRun(),
// which never let a caller's claim alone resolve to a promotion-eligible
// provenance.
@Controller('training')
@UseGuards(AuthGuard('jwt'))
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('pipeline')
  @HttpCode(HttpStatus.OK)
  getPipeline() {
    return {
      pipeline: this.trainingService.getPipeline(),
      capabilities: this.trainingService.getCapabilities(),
    };
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  getDashboard() {
    return this.trainingService.getDashboard();
  }

  @Get('runs')
  @HttpCode(HttpStatus.OK)
  getRuns() {
    return { runs: this.trainingService.getRuns() };
  }

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  createRun(@Body() body: CreateTrainingRunDto) {
    return this.trainingService.createRun(body);
  }

  @Post('runs/:runId/evaluate')
  @HttpCode(HttpStatus.OK)
  evaluateRun(@Param('runId') runId: string, @Body() body: EvaluateTrainingRunDto) {
    return this.trainingService.evaluateRun(runId, body);
  }

  @Get('moe-plan')
  @HttpCode(HttpStatus.OK)
  getMoeTrainingPlan(@Query('prompt') prompt?: string) {
    return this.trainingService.getMoeTrainingPlan(prompt);
  }
}
