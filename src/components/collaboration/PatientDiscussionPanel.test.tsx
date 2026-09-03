import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatientDiscussionPanel } from './PatientDiscussionPanel';
import * as collaborationApi from '../../services/collaborationApi';

vi.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'staff-1', name: 'Demo Nurse' } }),
}));

vi.mock('../../hooks/useSecurityAccess', () => ({
  default: () => ({ can: () => true }),
  useSecurityAccess: () => ({ can: () => true }),
}));

vi.mock('../../services/collaborationApi');

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('PatientDiscussionPanel (HEAL-220)', () => {
  it('does not let a slower-resolving Patient A response overwrite a faster-resolving Patient B once the panel has switched to B', async () => {
    const threadA = deferred<any>();
    const threadB = deferred<any>();
    const messagesB = deferred<any>();

    vi.mocked(collaborationApi.fetchPatientThread).mockImplementation((patientId: string) =>
      patientId === 'patient-a' ? threadA.promise : threadB.promise,
    );
    vi.mocked(collaborationApi.fetchMessages).mockImplementation((channelId: string) =>
      channelId === 'channel-b' ? messagesB.promise : new Promise(() => {}),
    );

    const { rerender } = render(<PatientDiscussionPanel patientId="patient-a" />);

    // Switch to patient B before A's thread lookup resolves.
    rerender(<PatientDiscussionPanel patientId="patient-b" />);

    // B's chain resolves first (plausible: A might be creating a new thread).
    threadB.resolve({ ok: true, data: { id: 'channel-b' } });
    messagesB.resolve({
      ok: true,
      data: [
        {
          id: 'm-b1',
          channelId: 'channel-b',
          senderType: 'user',
          senderId: 'staff-1',
          body: 'Patient B message',
          createdAt: '2026-08-15T12:00:00.000Z',
        },
      ],
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading discussion…')).not.toBeInTheDocument();
    });

    // A's slower response now resolves, after B has already rendered.
    threadA.resolve({ ok: true, data: { id: 'channel-a' } });

    // Give any (incorrect) stale setState calls a chance to land.
    await new Promise((r) => setTimeout(r, 20));

    // The panel is still showing patient B's content -- A's stale response
    // must not have overwritten it.
    expect(screen.getByText('Patient B message')).toBeInTheDocument();
    expect(vi.mocked(collaborationApi.fetchMessages)).not.toHaveBeenCalledWith(
      'channel-a',
      expect.anything(),
    );
  });
});
