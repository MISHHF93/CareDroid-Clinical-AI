import { Module } from '@nestjs/common';
import { ProtocolController } from './protocol.controller';
import { ClinicalProtocolService } from '../../services/clinical-protocol.service';

@Module({
  controllers: [ProtocolController],
  providers: [ClinicalProtocolService],
  exports: [ClinicalProtocolService],
})
export class ProtocolModule {}
