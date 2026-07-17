import { describe, expect, it } from 'vitest';
import {
  cigIdToKgId,
  isCigNodeId,
  isKgNodeId,
  isSimulationTenantId,
  kgIdToCigId,
  makeCigEdgeId,
  makeCigNodeId,
  makeKgNodeId,
  makeSimulationTenantId,
  parseGraphNodeId,
} from './ids';

describe('cig ids', () => {
  it('builds multi-tenant cig node ids', () => {
    expect(makeCigNodeId('tenant-a', 'patient', 'p-1')).toBe('cig:tenant-a:patient:p-1');
  });

  it('builds session kg ids matching FE convention', () => {
    expect(makeKgNodeId('patient', 'p-1')).toBe('kg:patient:p-1');
  });

  it('rejects empty segments', () => {
    expect(() => makeCigNodeId('', 'patient', 'p-1')).toThrow(/non-empty/);
    expect(() => makeKgNodeId('patient', '')).toThrow(/non-empty/);
  });

  it('parses cig and kg ids', () => {
    expect(parseGraphNodeId('cig:t1:room:12')).toEqual({
      kind: 'cig',
      tenantId: 't1',
      entityType: 'room',
      sourceId: '12',
    });
    expect(parseGraphNodeId('kg:room:12')).toEqual({
      kind: 'kg',
      entityType: 'room',
      sourceId: '12',
    });
    expect(parseGraphNodeId('not-a-graph-id')).toBeNull();
  });

  it('bridges kg ↔ cig aliases', () => {
    const kg = 'kg:patient:abc';
    const cig = kgIdToCigId(kg, 'org-9');
    expect(cig).toBe('cig:org-9:patient:abc');
    expect(cigIdToKgId(cig)).toBe(kg);
  });

  it('detects id kinds', () => {
    expect(isCigNodeId('cig:t:patient:1')).toBe(true);
    expect(isKgNodeId('kg:patient:1')).toBe(true);
    expect(isCigNodeId('kg:patient:1')).toBe(false);
  });

  it('builds edge ids', () => {
    const from = makeCigNodeId('t', 'patient', '1');
    const to = makeCigNodeId('t', 'room', '12');
    expect(makeCigEdgeId('t', 'located_in', from, to)).toBe(
      `cig-edge:t:located_in:${from}:${to}`,
    );
  });

  it('builds simulation tenant ids (K21)', () => {
    expect(makeSimulationTenantId('scenario-42')).toBe('cig-sim:scenario-42');
    expect(isSimulationTenantId('cig-sim:scenario-42')).toBe(true);
    expect(isSimulationTenantId('live-hospital')).toBe(false);
  });
});
