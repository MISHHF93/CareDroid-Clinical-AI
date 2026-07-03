// NestJS module registration — import this into AppModule to activate the NLU endpoints.

import { Module } from '@nestjs/common';
import { NluController } from './nlu.controller';
import { NluService } from './nlu.service';

@Module({
  controllers: [NluController],
  providers: [NluService],
  exports: [NluService],
})
export class NluModule {}
