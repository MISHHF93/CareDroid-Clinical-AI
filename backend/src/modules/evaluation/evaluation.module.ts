import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [AuthModule],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
