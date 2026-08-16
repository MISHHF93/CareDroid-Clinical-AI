import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SharedToolSession from './SharedToolSession';
import { getSharedSession } from '../../utils/sharedSessions';

vi.mock('../../utils/sharedSessions', () => ({
  getSharedSession: vi.fn(),
}));

function renderAtShareId(shareId: string) {
  return render(
    <MemoryRouter initialEntries={[`/tools/shared/${shareId}`]}>
      <Routes>
        <Route path="/tools/shared/:shareId" element={<SharedToolSession />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SharedToolSession (HEAL-224)', () => {
  it('does not call getSharedSession (a read-with-side-effecting-delete) synchronously during render', () => {
    vi.mocked(getSharedSession).mockReturnValue({
      toolId: 'lab-interpreter',
      toolName: 'Lab Interpreter',
      createdAt: new Date().toISOString(),
      results: null,
    });

    // getSharedSession must not have been invoked as a direct consequence
    // of the render call itself -- only via an effect that runs after
    // commit. If it fires synchronously in the render body, a discarded
    // render (Strict Mode double-invoke, a concurrent render that never
    // commits) can still trigger its side-effecting expiry-delete against
    // localStorage for a screen the user never saw.
    render(
      <MemoryRouter initialEntries={['/tools/shared/share-1']}>
        <Routes>
          <Route
            path="/tools/shared/:shareId"
            element={
              (() => {
                expect(getSharedSession).not.toHaveBeenCalled();
                return <SharedToolSession />;
              })()
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  });

  it('does not call getSharedSession again on an incidental re-render with the same shareId', async () => {
    vi.mocked(getSharedSession).mockReturnValue({
      toolId: 'lab-interpreter',
      toolName: 'Lab Interpreter',
      createdAt: new Date().toISOString(),
      results: null,
    });

    const { rerender } = renderAtShareId('share-1');
    await screen.findByText('Lab Interpreter');
    const callsAfterMount = vi.mocked(getSharedSession).mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    // An unrelated re-render (e.g. from an ancestor) must not re-trigger
    // the read/possible-delete -- the useEffect's [shareId] dependency
    // hasn't changed, so the call count must stay exactly where it was
    // after the initial mount settled.
    rerender(
      <MemoryRouter initialEntries={['/tools/shared/share-1']}>
        <Routes>
          <Route path="/tools/shared/:shareId" element={<SharedToolSession />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(getSharedSession).toHaveBeenCalledTimes(callsAfterMount);
  });

  it('shows the not-found state when the session is missing or expired', async () => {
    vi.mocked(getSharedSession).mockReturnValue(null);
    renderAtShareId('share-missing');
    expect(await screen.findByText('Session Not Found')).toBeInTheDocument();
  });
});
