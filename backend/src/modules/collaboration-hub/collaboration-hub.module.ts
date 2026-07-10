import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { CollaborationChannel } from './entities/collaboration-channel.entity';
import { CollaborationChannelMembership } from './entities/collaboration-channel-membership.entity';
import { CollaborationMessage } from './entities/collaboration-message.entity';
import { CollaborationMessageReaction } from './entities/collaboration-message-reaction.entity';
import { CollaborationAttachment } from './entities/collaboration-attachment.entity';
import { CollaborationExternalLink } from './entities/collaboration-external-link.entity';
import { CollaborationHubService } from './collaboration-hub.service';
import { CollaborationHubController } from './collaboration-hub.controller';
import { CollaborationRealtimeService } from './collaboration-realtime.service';
import { CollaborationRealtimeController } from './collaboration-realtime.controller';
import { CollaborationRetentionScheduler } from './collaboration-retention.scheduler';
import { CollaborationProviderRegistry } from './providers/collaboration-provider.registry';
import { NativeCollaborationProvider } from './providers/native-collaboration.provider';
import { SlackCollaborationProvider } from './providers/slack-collaboration.provider';
import { LocalDiskAttachmentStorageProvider } from './providers/attachment-storage.provider';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { JwtQueryAuthGuard } from '../emergency-os/guards/jwt-query-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollaborationChannel,
      CollaborationChannelMembership,
      CollaborationMessage,
      CollaborationMessageReaction,
      CollaborationAttachment,
      CollaborationExternalLink,
    ]),
    AuditModule,
    NotificationModule,
    // JwtQueryAuthGuard (reused from emergency-os) needs its own JwtService instance
    // for the SSE stream's ?token= query-param auth path, matching how
    // EmergencyOsModule wires it for backend/src/modules/emergency-os/emergency-realtime.controller.ts.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<{
          secret?: string;
          accessTokenExpiry?: string;
          issuer?: string;
          audience?: string;
        }>('jwt');
        return {
          secret: config?.secret,
          signOptions: {
            expiresIn: config?.accessTokenExpiry as StringValue | undefined,
            issuer: config?.issuer,
            audience: config?.audience,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [CollaborationHubController, CollaborationRealtimeController],
  providers: [
    CollaborationHubService,
    CollaborationRealtimeService,
    CollaborationRetentionScheduler,
    CollaborationProviderRegistry,
    NativeCollaborationProvider,
    SlackCollaborationProvider,
    LocalDiskAttachmentStorageProvider,
    JwtQueryAuthGuard,
  ],
  exports: [CollaborationHubService, CollaborationRealtimeService],
})
export class CollaborationHubModule {}
