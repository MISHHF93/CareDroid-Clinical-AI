// TypeScript replacement for app.py (FastAPI → NestJS controller)
// Registers as a module in the existing NestJS backend — no separate Python process needed.

import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { NluService, type PredictResult, type BatchPredictResult } from './nlu.service';
import { INTENT_CLASSES, type IntentClass } from './nlu.config';

interface PredictRequestDto {
  text: string;
  includeEmbeddings?: boolean;
}

interface BatchPredictRequestDto {
  texts: string[];
}

interface HealthResponse {
  status: string;
  modelLoaded: boolean;
  modelName: string;
  intentClasses: readonly string[];
  uptimeSeconds: number;
}

@Controller('nlu')
export class NluController implements OnModuleInit {
  private readonly startTime = Date.now();

  constructor(private readonly nluService: NluService) {}

  async onModuleInit(): Promise<void> {
    await this.nluService.load();
  }

  @Get('health')
  health(): HealthResponse {
    const info = this.nluService.getModelInfo();
    return {
      status: 'healthy',
      modelLoaded: info.status === 'loaded',
      modelName: info.modelName,
      intentClasses: INTENT_CLASSES,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  @Post('predict')
  async predict(@Body() body: PredictRequestDto): Promise<PredictResult> {
    if (!body?.text?.trim()) {
      throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
    }
    if (body.text.length > 2048) {
      throw new HttpException('text exceeds 2048 character limit', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.nluService.predict(body.text);
    } catch (err) {
      throw new HttpException(
        `Prediction failed: ${err instanceof Error ? err.message : String(err)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('batch-predict')
  async batchPredict(@Body() body: BatchPredictRequestDto): Promise<BatchPredictResult> {
    if (!Array.isArray(body?.texts) || body.texts.length === 0) {
      throw new HttpException('texts array is required and must not be empty', HttpStatus.BAD_REQUEST);
    }
    if (body.texts.length > 100) {
      throw new HttpException('batch size must not exceed 100', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.nluService.predictBatch(body.texts);
    } catch (err) {
      throw new HttpException(
        `Batch prediction failed: ${err instanceof Error ? err.message : String(err)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('intent-classes')
  intentClasses(): { intentClasses: readonly IntentClass[]; numClasses: number } {
    return { intentClasses: INTENT_CLASSES, numClasses: INTENT_CLASSES.length };
  }

  @Get('model-info')
  modelInfo() {
    return this.nluService.getModelInfo();
  }
}
