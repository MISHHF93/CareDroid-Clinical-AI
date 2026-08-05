import { Module } from '@nestjs/common';
import { SmartIntakeController } from './smart-intake.controller';
import { SmartIntakeService } from '../../services/smart-intake.service';

@Module({
  controllers: [SmartIntakeController],
  providers: [SmartIntakeService],
  exports: [SmartIntakeService],
})
export class SmartIntakeModule {}
