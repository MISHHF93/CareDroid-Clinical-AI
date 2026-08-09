import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationRunEntity } from './entities/evaluation-run.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([EvaluationRunEntity])],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
