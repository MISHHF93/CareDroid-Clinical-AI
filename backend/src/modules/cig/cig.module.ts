import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CigEdgeEntity,
  CigEventEntity,
  CigNodeEntity,
  CigOutboxEntity,
  CigSnapshotEntity,
} from './entities';

/**
 * Clinical Intelligence Graph durable storage (PR-4).
 * Projection facade / APIs land in later PRs — this module registers schema entities only.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CigNodeEntity,
      CigEdgeEntity,
      CigEventEntity,
      CigOutboxEntity,
      CigSnapshotEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class CigModule {}
