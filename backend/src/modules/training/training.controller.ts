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
