import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { UsageEvent } from './entities/usage-event.entity';
import { UsageMeteringInterceptor } from './usage-metering.interceptor';
import { UsageMeteringService } from './usage-metering.service';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, UsageEvent, User]), AuditModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    UsageMeteringService,
    {
      provide: APP_INTERCEPTOR,
      useClass: UsageMeteringInterceptor,
    },
  ],
  exports: [SubscriptionsService, UsageMeteringService],
})
export class SubscriptionsModule {}
