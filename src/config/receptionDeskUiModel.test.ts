import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  filterReceptionStripMetrics,
  resolveReceptionDeskUi,
} from './receptionDeskUiModel';
import { RECEPTION_DESK_UI } from './receptionDeskUi.config';

describe('receptionDeskUiModel', () => {
  it('enables slim desk mode for registration clerk on reception route', () => {
    const desk = resolveReceptionDeskUi({
      role: EMERGENCY_ROLE_IDS.registrationClerk,
      isReceptionRoute: true,
    });
    expect(desk.slim).toBe(true);
    expect(desk.show(RECEPTION_DESK_UI.surfaces.queueAuditPanel)).toBe(false);
    expect(desk.show(RECEPTION_DESK_UI.surfaces.dataQualityPanel)).toBe(false);
    expect(desk.stripMetricIds).toEqual(RECEPTION_DESK_UI.coreStripMetricIds);
  });

  it('uses slim desk metrics for charge nurse on reception route during pilot', () => {
    const desk = resolveReceptionDeskUi({
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      isReceptionRoute: true,
    });
    expect(desk.slim).toBe(true);
    expect(desk.show(RECEPTION_DESK_UI.surfaces.queueAuditPanel)).toBe(false);
    expect(desk.stripMetricIds).toEqual(RECEPTION_DESK_UI.coreStripMetricIds);
  });

  it('filters strip metrics to core clerk counts', () => {
    const filtered = filterReceptionStripMetrics(
      [
        { id: 'arrivals-today', value: 3 },
        { id: 'queue-overdue', value: 2 },
        { id: 'ems-inbound', value: 1 },
      ],
      RECEPTION_DESK_UI.coreStripMetricIds,
    );
    expect(filtered.map((metric) => metric.id)).toEqual(['arrivals-today']);
  });
});
