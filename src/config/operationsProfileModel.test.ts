import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { filterOperationAreas } from './operationsProfileModel';

const SAMPLE_AREAS = [
  { title: 'Hospital map', body: 'Map', path: CANONICAL_ROUTES.hospitalMap },
  { title: 'Whiteboard', body: 'Board', path: CANONICAL_ROUTES.emergencyWhiteboard },
];

describe('operationsProfileModel', () => {
  it('filters whiteboard for registration clerk', () => {
    const visible = filterOperationAreas('registration-clerk', SAMPLE_AREAS);
    expect(visible.some((area) => area.path === CANONICAL_ROUTES.emergencyWhiteboard)).toBe(false);
  });

  it('allows hospital map for biomedical engineer when route is entitled', () => {
    const visible = filterOperationAreas('biomedical-engineer', SAMPLE_AREAS);
    expect(visible.some((area) => area.path === CANONICAL_ROUTES.hospitalMap)).toBe(true);
  });
});
