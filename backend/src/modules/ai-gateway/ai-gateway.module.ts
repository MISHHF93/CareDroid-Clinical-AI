import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContextBuilderService } from './context-builder.service';
import { AIGatewayService } from './ai-gateway.service';
import { ResponseComposerService } from './response-composer.service';

@Module({
  imports: [AuditModule],
  providers: [AIGatewayService, ContextBuilderService, ResponseComposerService],
  exports: [AIGatewayService, ContextBuilderService, ResponseComposerService],
})
export class AIGatewayModule {}
