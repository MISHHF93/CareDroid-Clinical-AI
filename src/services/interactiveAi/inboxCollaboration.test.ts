import { afterEach, describe, expect, it } from 'vitest';
import {
  addInboxComment,
  assignInboxItem,
  clearInboxCollaborationForTests,
  countInboxComments,
  getInboxAssignment,
  listInboxComments,
  unassignInboxItem,
} from './inboxCollaboration';

afterEach(() => {
  clearInboxCollaborationForTests();
});

describe('inboxCollaboration — assignment', () => {
  it('assigns an item to a user and role, and can be read back', () => {
    const assignment = assignInboxItem(
      'card:c1',
      { userId: 'user-1', role: 'triage_nurse' },
      'user-2',
      () => '2026-07-17T00:00:00.000Z',
    );
    expect(assignment).toEqual({
      itemId: 'card:c1',
      assignedToUserId: 'user-1',
      assignedToRole: 'triage_nurse',
      assignedByUserId: 'user-2',
      assignedAt: '2026-07-17T00:00:00.000Z',
    });
    expect(getInboxAssignment('card:c1')).toEqual(assignment);
  });

  it('reassigning an item overwrites the previous assignee, not appends', () => {
    assignInboxItem('card:c1', { userId: 'user-1' });
    assignInboxItem('card:c1', { userId: 'user-2' });
    expect(getInboxAssignment('card:c1')?.assignedToUserId).toBe('user-2');
  });

  it('unassigning clears the assignment', () => {
    assignInboxItem('card:c1', { userId: 'user-1' });
    unassignInboxItem('card:c1');
    expect(getInboxAssignment('card:c1')).toBeUndefined();
  });

  it('rejects an assignment with neither a userId nor a role', () => {
    expect(() => assignInboxItem('card:c1', {})).toThrow(/assignee/);
  });

  it('rejects an empty item id', () => {
    expect(() => assignInboxItem('', { userId: 'user-1' })).toThrow(/item id/);
  });

  it('assignments are isolated per item id', () => {
    assignInboxItem('card:c1', { userId: 'user-1' });
    expect(getInboxAssignment('proposal:p1')).toBeUndefined();
  });
});

describe('inboxCollaboration — comments', () => {
  it('adds a comment and lists it back in order', () => {
    addInboxComment(
      'proposal:p1',
      { authorUserId: 'user-1', authorRole: 'nurse', body: 'First' },
      () => 't1',
    );
    addInboxComment(
      'proposal:p1',
      { authorUserId: 'user-2', authorRole: 'physician', body: 'Second' },
      () => 't2',
    );
    const thread = listInboxComments('proposal:p1');
    expect(thread.map((c) => c.body)).toEqual(['First', 'Second']);
    expect(countInboxComments('proposal:p1')).toBe(2);
  });

  it('trims whitespace and rejects an empty comment body', () => {
    expect(() =>
      addInboxComment('proposal:p1', { authorUserId: 'u', authorRole: 'nurse', body: '   ' }),
    ).toThrow(/empty/);
  });

  it('rejects a comment over the length ceiling', () => {
    const tooLong = 'x'.repeat(2001);
    expect(() =>
      addInboxComment('proposal:p1', { authorUserId: 'u', authorRole: 'nurse', body: tooLong }),
    ).toThrow(/exceeds/);
  });

  it('requires an author role', () => {
    expect(() =>
      addInboxComment('proposal:p1', { authorUserId: 'u', authorRole: '', body: 'hi' }),
    ).toThrow(/author role/);
  });

  it('caps stored comments per item so a thread cannot grow unbounded', () => {
    for (let i = 0; i < 105; i++) {
      addInboxComment('proposal:p1', { authorRole: 'nurse', body: `msg-${i}` });
    }
    const thread = listInboxComments('proposal:p1');
    expect(thread).toHaveLength(100);
    expect(thread[0].body).toBe('msg-5');
    expect(thread[99].body).toBe('msg-104');
  });

  it('comments are isolated per item id', () => {
    addInboxComment('proposal:p1', { authorRole: 'nurse', body: 'on p1' });
    expect(listInboxComments('card:c1')).toEqual([]);
  });

  it('returned comment/assignment objects are copies, not live references', () => {
    const assignment = assignInboxItem('card:c1', { userId: 'user-1' });
    assignment.assignedToUserId = 'tampered';
    expect(getInboxAssignment('card:c1')?.assignedToUserId).toBe('user-1');

    addInboxComment('proposal:p1', { authorRole: 'nurse', body: 'original' });
    const [comment] = listInboxComments('proposal:p1');
    comment.body = 'tampered';
    expect(listInboxComments('proposal:p1')[0].body).toBe('original');
  });
});
