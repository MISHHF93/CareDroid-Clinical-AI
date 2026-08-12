import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('./useOperationalIntelligenceCore', () => ({
  default: vi.fn(() => ({ centralSnapshot: 'CORE_CENTRAL_SNAPSHOT', snapshot: 'CORE_SNAPSHOT' })),
}));
vi.mock('./useRouteScreenMode', () => ({
  default: vi.fn(() => 'WHITEBOARD_SCREEN'),
}));

import useOperationalIntelligenceCore from './useOperationalIntelligenceCore';
import useOperationalIntelligence from './useOperationalIntelligence';

describe('useOperationalIntelligence', () => {
  it('delegates directly to the lightweight core hook instead of the full AI Chief orchestrator', () => {
    const { result } = renderHook(() =>
      useOperationalIntelligence({ screenMode: 'COMMAND_CENTER_SCREEN' as never, realtime: true }),
    );

    expect(useOperationalIntelligenceCore).toHaveBeenCalledWith({
      screenMode: 'COMMAND_CENTER_SCREEN',
      realtime: true,
    });
    // Passed through unmodified -- no extra AI Chief snapshot / knowledge graph fields grafted on.
    expect(result.current).toEqual({
      centralSnapshot: 'CORE_CENTRAL_SNAPSHOT',
      snapshot: 'CORE_SNAPSHOT',
    });
  });

  it('falls back to the current route screen mode when no screenMode is supplied', () => {
    renderHook(() => useOperationalIntelligence({ realtime: false }));

    expect(useOperationalIntelligenceCore).toHaveBeenCalledWith({
      screenMode: 'WHITEBOARD_SCREEN',
      realtime: false,
    });
  });
});
