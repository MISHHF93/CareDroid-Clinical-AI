import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './services/notification.service';
import { FirebaseService } from './services/firebase.service';
import { DeviceTokenService } from './services/device-token.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, DeviceToken, NotificationPreference])],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    FirebaseService,
    DeviceTokenService,
    NotificationPreferenceService,
  ],
  exports: [
    NotificationService,
    FirebaseService,
    DeviceTokenService,
    NotificationPreferenceService,
  ],
})
export class NotificationModule {}
