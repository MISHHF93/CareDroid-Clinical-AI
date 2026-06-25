import { describe, expect, it } from 'vitest';
import {
  RECEPTION_QUEUE_BADGE_LIMIT,
  summarizeReceptionQueueBadgeOverflow,
} from './receptionQueueRowModel';

describe('receptionQueueRowModel', () => {
  it('caps visible badges at three with overflow count', () => {
    expect(summarizeReceptionQueueBadgeOverflow(0)).toEqual({ visible: 0, overflow: 0 });
    expect(summarizeReceptionQueueBadgeOverflow(2)).toEqual({ visible: 2, overflow: 0 });
    expect(summarizeReceptionQueueBadgeOverflow(3)).toEqual({ visible: 3, overflow: 0 });
    expect(summarizeReceptionQueueBadgeOverflow(7)).toEqual({ visible: 3, overflow: 4 });
    expect(RECEPTION_QUEUE_BADGE_LIMIT).toBe(3);
  });
});