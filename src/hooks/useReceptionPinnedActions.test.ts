import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useReceptionPinnedActions from './useReceptionPinnedActions';

const STORAGE_KEY = 'careDroid.reception.pinnedActions.v1';

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe('useReceptionPinnedActions', () => {
  it('starts with no pinned queue tab', () => {
    const { result } = renderHook(() => useReceptionPinnedActions());
    expect(result.current.pinnedQueueTab).toBeNull();
  });

  it('toggles a queue tab on, then off, on repeated calls', () => {
    const { result } = renderHook(() => useReceptionPinnedActions());

    act(() => result.current.togglePinnedQueueTab('ems'));
    expect(result.current.pinnedQueueTab).toBe('ems');

    act(() => result.current.togglePinnedQueueTab('ems'));
    expect(result.current.pinnedQueueTab).toBeNull();
  });

  it('switches the pinned tab directly when a different tab is toggled', () => {
    const { result } = renderHook(() => useReceptionPinnedActions());

    act(() => result.current.togglePinnedQueueTab('ems'));
    act(() => result.current.togglePinnedQueueTab('pretriage'));
    expect(result.current.pinnedQueueTab).toBe('pretriage');
  });

  it('persists the pinned tab to localStorage and a fresh hook instance reads it back', () => {
    const { result, unmount } = renderHook(() => useReceptionPinnedActions());
    act(() => result.current.setPinnedQueueTab('verification'));
    unmount();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')).toEqual({ pinnedQueueTab: 'verification' });

    const { result: fresh } = renderHook(() => useReceptionPinnedActions());
    expect(fresh.current.pinnedQueueTab).toBe('verification');
  });

  it('ignores corrupt stored JSON instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const { result } = renderHook(() => useReceptionPinnedActions());
    expect(result.current.pinnedQueueTab).toBeNull();
  });
});
