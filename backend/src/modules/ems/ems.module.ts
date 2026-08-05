import { Module } from '@nestjs/common';
import { EmsController } from './ems.controller';
import { EMSService } from '../../services/ems.service';

@Module({
  controllers: [EmsController],
  providers: [EMSService],
  exports: [EMSService],
})
export class EmsModule {}
