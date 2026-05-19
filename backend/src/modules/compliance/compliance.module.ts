import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { TwoFactor } from '../two-factor/entities/two-factor.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, OAuthAccount, Subscription, TwoFactor, AuditLog]),
    AuditModule,
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
