import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import {
  SentinelAiRecommendationEntity,
  SentinelAlarmEntity,
  SentinelAlarmEventEntity,
  SentinelEpisodeEntity,
  SentinelEtaEntity,
  SentinelGeofenceEntity,
  SentinelGeofenceEventEntity,
  SentinelInboundPatientEntity,
  SentinelIntegrationCursorEntity,
  SentinelOutboxEntity,
  SentinelPositionEntity,
  SentinelUnitEntity,
} from './entities';
import { SentinelController } from './sentinel.controller';
import { SentinelAlarmService } from './sentinel-alarm.service';
import { SentinelInboundService } from './sentinel-inbound.service';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { SentinelTrackingService } from './sentinel-tracking.service';

const entities = [
  SentinelUnitEntity,
  SentinelPositionEntity,
  SentinelEtaEntity,
  SentinelGeofenceEntity,
  SentinelGeofenceEventEntity,
  SentinelInboundPatientEntity,
  SentinelEpisodeEntity,
  SentinelAlarmEntity,
  SentinelAlarmEventEntity,
  SentinelOutboxEntity,
  SentinelAiRecommendationEntity,
  SentinelIntegrationCursorEntity,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities), AuditModule],
  controllers: [SentinelController],
  providers: [
    SentinelOutboxService,
    SentinelAlarmService,
    SentinelTrackingService,
    SentinelInboundService,
  ],
  exports: [
    SentinelOutboxService,
    SentinelAlarmService,
    SentinelTrackingService,
    SentinelInboundService,
  ],
})
export class SentinelModule {}
