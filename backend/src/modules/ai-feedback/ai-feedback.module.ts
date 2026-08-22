import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AiFeedbackEntity } from './entities/ai-feedback.entity';
import { AiFeedbackService } from './ai-feedback.service';
import { AiFeedbackController } from './ai-feedback.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiFeedbackEntity]), AuthModule],
  controllers: [AiFeedbackController],
  providers: [AiFeedbackService],
  exports: [AiFeedbackService],
})
export class AiFeedbackModule {}
