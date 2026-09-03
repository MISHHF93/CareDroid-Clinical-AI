import { Priority } from '../types/emergency';

export const CTAS_TARGET_MINUTES: Record<Priority, number> = {
  [Priority.P1]: 0,
  [Priority.P2]: 15,
  [Priority.P3]: 30,
  [Priority.P4]: 60,
  [Priority.P5]: 120,
};

type CtasSettings = {
  ctasThresholds?: Partial<Record<Priority, number>>;
  thresholds?: {
    ctasTargets?: Partial<Record<Priority, number>>;
    ctasThresholds?: Partial<Record<Priority, number>>;
  };
};

export function resolveCtasTargetMinutes(
  settingsOrTargets: CtasSettings | Partial<Record<Priority, number>> = {},
): Record<Priority, number> {
  const settings = settingsOrTargets as CtasSettings;
  let source: Partial<Record<Priority, number>> = {};
  if (settings.ctasThresholds) {
    source = settings.ctasThresholds;
  } else if (settings.thresholds?.ctasTargets) {
    source = settings.thresholds.ctasTargets;
  } else if (settings.thresholds?.ctasThresholds) {
    source = settings.thresholds.ctasThresholds;
  } else {
    source = settingsOrTargets as Partial<Record<Priority, number>>;
  }

  return Object.fromEntries(
    Object.values(Priority).map((priority) => {
      const configured = Number(source?.[priority]);
      return [
        priority,
        Number.isFinite(configured) && configured >= 0 ? configured : CTAS_TARGET_MINUTES[priority],
      ];
    }),
  ) as Record<Priority, number>;
}

export function ctasTargetMinutes(
  priority: Priority | string | number | null | undefined,
  settingsOrTargets: CtasSettings | Partial<Record<Priority, number>> = {},
): number {
  const targets = resolveCtasTargetMinutes(settingsOrTargets);
  if (priority === Priority.P1 || priority === 1 || priority === '1') return targets[Priority.P1];
  if (priority === Priority.P2 || priority === 2 || priority === '2') return targets[Priority.P2];
  if (priority === Priority.P3 || priority === 3 || priority === '3') return targets[Priority.P3];
  if (priority === Priority.P4 || priority === 4 || priority === '4') return targets[Priority.P4];
  return targets[Priority.P5];
}
