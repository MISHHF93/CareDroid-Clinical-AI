import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CigEventBus } from './cig-event.bus';
import { CigProjectionFacade } from './cig-projection.facade';
import {
  CigEdgeEntity,
  CigEventEntity,
  CigNodeEntity,
  CigOutboxEntity,
  CigSnapshotEntity,
} from './entities';

/**
 * Clinical Intelligence Graph (PR-4 schema + PR-5a projection facade).
 * Domain mutator wiring lands in PR-5b+.
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
  providers: [CigEventBus, CigProjectionFacade],
  exports: [TypeOrmModule, CigEventBus, CigProjectionFacade],
})
export class CigModule {}
