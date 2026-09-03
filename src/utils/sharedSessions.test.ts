import { beforeEach, describe, expect, it } from 'vitest';
import { buildSharedSessionUrl, createSharedSession, getSharedSession } from './sharedSessions';

describe('sharedSessions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates local shared sessions on the mounted /shared/tools route', () => {
    const shareId = createSharedSession({
      toolId: 'drug-check',
      toolName: 'Drug Interaction Checker',
      results: { severity: 'high' },
    });

    expect(buildSharedSessionUrl(shareId, 'https://app.example')).toBe(
      `https://app.example/shared/tools/${shareId}`,
    );
    expect(buildSharedSessionUrl(shareId, 'https://app.example')).not.toContain('/shared-result/');

    const session = getSharedSession(shareId);
    expect(session).toMatchObject({
      id: shareId,
      toolId: 'drug-check',
      scope: 'local-browser',
      results: { severity: 'high' },
    });
    expect(Date.parse(session.expiresAt)).toBeGreaterThan(Date.now());
  });
});
