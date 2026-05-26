import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateEvaluationRunDto } from './evaluation.types';
import { EvaluationService } from './evaluation.service';

@Controller('evaluation')
@UseGuards(AuthGuard('jwt'))
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  getDashboard() {
    return this.evaluationService.getDashboard();
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  getMetricDefinitions() {
    return { metrics: this.evaluationService.getMetricDefinitions() };
  }

  @Get('runs')
  @HttpCode(HttpStatus.OK)
  getRuns() {
    return { runs: this.evaluationService.getRuns() };
  }

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  createRun(@Body() body: CreateEvaluationRunDto) {
    return this.evaluationService.createRun(body);
  }
}
