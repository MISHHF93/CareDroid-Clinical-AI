import { Module } from '@nestjs/common';
import { ReassessmentController } from './reassessment.controller';
import { ReassessmentService } from '../../services/reassessment.service';

@Module({
  controllers: [ReassessmentController],
  providers: [ReassessmentService],
  exports: [ReassessmentService],
})
export class ReassessmentModule {}
