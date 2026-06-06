import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationAuditController } from './automation-audit.controller';
import { AutomationAuditService } from './automation-audit.service';
import { AutomationAuditEvent } from './entities/automation-audit-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AutomationAuditEvent])],
  controllers: [AutomationAuditController],
  providers: [AutomationAuditService],
  exports: [AutomationAuditService],
})
export class AutomationAuditModule {}
