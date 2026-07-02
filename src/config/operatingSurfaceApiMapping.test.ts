import { describe, expect, it } from 'vitest';
import { listApiBackedJourneySurfaces, resolveApiOperatingSurfaceId } from './operatingSurfaceApiMapping';

describe('operatingSurfaceApiMapping', () => {
  it('maps journey surface ids to Nest operating-surface API ids', () => {
    expect(resolveApiOperatingSurfaceId('dispatch')).toBe('dispatch');
    expect(resolveApiOperatingSurfaceId('pulse')).toBe('department-pulse');
    expect(resolveApiOperatingSurfaceId('command-center')).toBe('command-center');
    expect(resolveApiOperatingSurfaceId('alerts')).toBe('alerts');
    expect(resolveApiOperatingSurfaceId('whiteboard')).toBe('whiteboard');
    expect(resolveApiOperatingSurfaceId('reception')).toBeNull();
  });

  it('lists all API-backed journey surfaces', () => {
    expect(listApiBackedJourneySurfaces()).toEqual(
      expect.arrayContaining(['command-center', 'alerts', 'whiteboard', 'dispatch']),
    );
  });
});