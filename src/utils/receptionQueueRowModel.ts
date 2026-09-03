/** Max inline badges on a reception queue row before showing +N overflow. */
export const RECEPTION_QUEUE_BADGE_LIMIT = 3;

export function summarizeReceptionQueueBadgeOverflow(
  badgeCount,
  limit = RECEPTION_QUEUE_BADGE_LIMIT,
) {
  const normalized = Math.max(0, Number(badgeCount) || 0);
  const cappedLimit = Math.max(1, Number(limit) || RECEPTION_QUEUE_BADGE_LIMIT);
  return {
    visible: Math.min(normalized, cappedLimit),
    overflow: Math.max(0, normalized - cappedLimit),
  };
}
