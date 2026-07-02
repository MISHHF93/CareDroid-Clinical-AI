import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useEmergencyOperatingSurface from './useEmergencyOperatingSurface';

vi.mock('../services/emergencyOsApi', () => ({
  fetchEmergencyOperatingSurface: vi.fn(async (surfaceId: string) => ({
    generatedAt: '2026-07-02T12:00:00.000Z',
    data: { surfaceId },
  })),
}));

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: { backendAvailable: boolean; capacity: { updatedAt: string } }) => unknown) =>
    selector({
      backendAvailable: true,
      capacity: { updatedAt: '2026-07-02T11:00:00.000Z' },
    }),
}));

describe('useEmergencyOperatingSurface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads backend snapshot for a surface id', async () => {
    const { result } = renderHook(() => useEmergencyOperatingSurface('department-pulse'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.envelope.source).toBe('backend');
    expect(result.current.envelope.data).toEqual({ surfaceId: 'department-pulse' });
  });

  it('skips fetch when surface id is omitted', async () => {
    const { result } = renderHook(() => useEmergencyOperatingSurface(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.envelope.source).toBe('local-store-fallback');
  });
});