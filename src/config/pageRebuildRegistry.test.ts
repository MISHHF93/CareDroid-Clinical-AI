import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  PAGE_REBUILD_REGISTRY,
  PAGE_REBUILD_WAVES,
  getNextPageRebuildTarget,
  listPageRebuildEntriesByWave,
} from './pageRebuildRegistry';
import { PAGE_REBUILD_STATUS } from './pageUxContract';

describe('pageRebuildRegistry', () => {
  it('orders waves from entry through extension consoles', () => {
    expect(PAGE_REBUILD_WAVES[0]?.id).toBe('wave-0-entry');
    expect(PAGE_REBUILD_WAVES.at(-1)?.id).toBe('wave-8-consoles');
  });

  it('marks rebuilt ED OS entry and command surfaces', () => {
    const entry = PAGE_REBUILD_REGISTRY.find((page) => page.id === 'platform-entry-hub');
    expect(entry?.path).toBe(CANONICAL_ROUTES.platformStart);
    expect(entry?.status).toBe(PAGE_REBUILD_STATUS.rebuilt);
    const command = PAGE_REBUILD_REGISTRY.find((page) => page.id === 'command-center');
    expect(command?.status).toBe(PAGE_REBUILD_STATUS.rebuilt);
    const alerts = PAGE_REBUILD_REGISTRY.find((page) => page.id === 'alerts');
    expect(alerts?.status).toBe(PAGE_REBUILD_STATUS.rebuilt);
    const reception = PAGE_REBUILD_REGISTRY.find((page) => page.id === 'reception');
    expect(reception?.status).toBe(PAGE_REBUILD_STATUS.rebuilt);
    const dispatch = PAGE_REBUILD_REGISTRY.find((page) => page.id === 'dispatch');
    expect(dispatch?.status).toBe(PAGE_REBUILD_STATUS.rebuilt);
    const publicDisplay = PAGE_REBUILD_REGISTRY.find((page) => page.id === 'public-waiting-display');
    expect(publicDisplay?.status).toBe(PAGE_REBUILD_STATUS.rebuilt);
    expect(getNextPageRebuildTarget()?.status).not.toBe(PAGE_REBUILD_STATUS.rebuilt);
  });

  it('maps ED architecture pages to journey waves without duplicate paths', () => {
    const paths = PAGE_REBUILD_REGISTRY.map((entry) => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(listPageRebuildEntriesByWave('wave-2-arrival').some((e) => e.id === 'reception')).toBe(
      true,
    );
    expect(listPageRebuildEntriesByWave('wave-3-command').some((e) => e.id === 'whiteboard')).toBe(
      true,
    );
  });
});