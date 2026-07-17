export { CigNodeEntity } from './cig-node.entity';
export { CigEdgeEntity } from './cig-edge.entity';
export { CigEventEntity } from './cig-event.entity';
export { CigOutboxEntity } from './cig-outbox.entity';
export { CigSnapshotEntity } from './cig-snapshot.entity';

import { CigNodeEntity } from './cig-node.entity';
import { CigEdgeEntity } from './cig-edge.entity';
import { CigEventEntity } from './cig-event.entity';
import { CigOutboxEntity } from './cig-outbox.entity';
import { CigSnapshotEntity } from './cig-snapshot.entity';

export const CIG_ENTITIES = [
  CigNodeEntity,
  CigEdgeEntity,
  CigEventEntity,
  CigOutboxEntity,
  CigSnapshotEntity,
] as const;
