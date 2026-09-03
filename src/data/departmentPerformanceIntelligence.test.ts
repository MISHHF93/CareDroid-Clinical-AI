import { describe, expect, it } from 'vitest';
import {
  buildDepartmentPerformanceIntelligence,
  calculateDepartmentHealthScore,
  getDepartmentHealthBand,
} from './departmentPerformanceIntelligence';

describe('departmentPerformanceIntelligence', () => {
  it('calculates rounded department health scores and health bands', () => {
    expect(calculateDepartmentHealthScore([{ score: 80 }, { score: 91 }])).toBe(86);
    expect(getDepartmentHealthBand(86)).toMatchObject({ id: 'strong' });
    expect(getDepartmentHealthBand(64)).toMatchObject({ id: 'watch' });
  });

  it('generates measurable outcomes for emergency, laboratory, and operations', () => {
    const model = buildDepartmentPerformanceIntelligence();
    const byId = Object.fromEntries(
      model.departments.map((department) => [department.id, department]),
    );

    expect(model.summary.departmentCount).toBe(3);
    expect(model.summary.measurableOutcomeCount).toBeGreaterThanOrEqual(7);
    expect(byId.emergency.metrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining([
        'Workflow adoption',
        'Calculator utilization',
        'Simulation readiness',
      ]),
    );
    expect(byId.laboratory.metrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining(['Turnaround metrics', 'Interpretation utilization']),
    );
    expect(byId.operations.metrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining(['Asset uptime', 'Maintenance workload']),
    );
    expect(model.departments.every((department) => department.measurableOutcomeCount > 0)).toBe(
      true,
    );
  });
});
