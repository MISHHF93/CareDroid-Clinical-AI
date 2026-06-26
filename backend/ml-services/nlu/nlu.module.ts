// NestJS module registration — import this into AppModule to activate the NLU endpoints.

import { Module } from '@nestjs/common';
import { NluController } from './nlu.controller';

@Module({
  controllers: [NluController],
})
export class NluModule {}
