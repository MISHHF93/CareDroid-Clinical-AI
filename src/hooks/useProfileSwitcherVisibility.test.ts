import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileSwitcherVisibility } from './useProfileSwitcherVisibility';

vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../contexts/UserContext';

describe('useProfileSwitcherVisibility', () => {
  it('returns true for open-access auth mode', () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user' },
      authMode: 'open-access',
    });

    const { result } = renderHook(() => useProfileSwitcherVisibility());
    expect(result.current).toBe(true);
  });

  it('returns true for demo persona users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'open-access-user', name: 'Dr. Cara George' },
      authMode: 'platform-access',
    });

    const { result } = renderHook(() => useProfileSwitcherVisibility());
    expect(result.current).toBe(true);
  });

  it('returns true for local-dev-demo auth mode', () => {
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'dev-user', name: 'Dev Clinician' },
      authMode: 'local-dev-demo',
    });

    const { result } = renderHook(() => useProfileSwitcherVisibility());
    expect(result.current).toBe(true);
  });
});