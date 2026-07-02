import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useUnifiedOperatingSurface from './useUnifiedOperatingSurface';

vi.mock('./useEdOperatingSurface', () => ({
  useEdOperatingSurface: () => ({
    surface: { surfaceId: 'dispatch', label: 'Dispatch Console' },
    phaseId: 'pre-arrival',
    phaseLabel: 'Pre-Arrival',
    phaseOrder: 1,
    ownerRole: 'Dispatcher',
    priority: 'P0',
    primaryDecision: 'Assign unit',
    defaultNextAction: 'Dispatch unit',
    threeMinuteRelevant: true,
    situationBrief: { status: 'ok', attention: 'none', owner: 'Dispatcher', nextAction: 'Dispatch' },
    topActionLabel: 'Dispatch',
    topActionRoute: '/emergency/dispatch',
    isEmergencyRoute: true,
  }),
}));

vi.mock('./useEmergencyOperatingSurface', () => ({
  default: vi.fn(() => ({
    loading: false,
    error: null,
    envelope: {
      source: 'backend',
      generatedAt: '2026-07-02T12:00:00.000Z',
      surfaceId: 'dispatch',
      data: { activeCalls: 2 },
    },
    refresh: vi.fn(async () => undefined),
  })),
}));

describe('useUnifiedOperatingSurface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges journey context with API envelope for mapped surfaces', async () => {
    const { result } = renderHook(() => useUnifiedOperatingSurface());
    await waitFor(() => expect(result.current.surface?.surfaceId).toBe('dispatch'));
    expect(result.current.apiSurfaceId).toBe('dispatch');
    expect(result.current.hasBackendSnapshot).toBe(true);
    expect(result.current.apiEnvelope.data).toEqual({ activeCalls: 2 });
    expect(result.current.situationBrief?.owner).toBe('Dispatcher');
  });
});