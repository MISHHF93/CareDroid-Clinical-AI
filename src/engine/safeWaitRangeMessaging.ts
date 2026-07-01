/**
 * Patient-safe wait range messaging — buckets internal minute metrics into
 * non-exact ranges suitable for public waiting-room displays.
 */

export const SAFE_WAIT_RANGE_BUCKET = Object.freeze({
  UNDER_30: 'under-30',
  THIRTY_TO_SIXTY: '30-60',
  ONE_TO_TWO_HOURS: '1-2h',
  TWO_TO_FOUR_HOURS: '2-4h',
  OVER_FOUR_HOURS: 'over-4h',
} as const);

export type SafeWaitRangeBucketId =
  (typeof SAFE_WAIT_RANGE_BUCKET)[keyof typeof SAFE_WAIT_RANGE_BUCKET];

export const PUBLIC_WAIT_URGENCY_DISCLAIMER =
  'Emergency patients are prioritized by urgency — these wait ranges are estimates, not guarantees.';

const BUCKET_ORDER: SafeWaitRangeBucketId[] = [
  SAFE_WAIT_RANGE_BUCKET.UNDER_30,
  SAFE_WAIT_RANGE_BUCKET.THIRTY_TO_SIXTY,
  SAFE_WAIT_RANGE_BUCKET.ONE_TO_TWO_HOURS,
  SAFE_WAIT_RANGE_BUCKET.TWO_TO_FOUR_HOURS,
  SAFE_WAIT_RANGE_BUCKET.OVER_FOUR_HOURS,
];

const BUCKET_LABELS: Record<SafeWaitRangeBucketId, string> = {
  [SAFE_WAIT_RANGE_BUCKET.UNDER_30]: 'Less than 30 minutes',
  [SAFE_WAIT_RANGE_BUCKET.THIRTY_TO_SIXTY]: '30–60 minutes',
  [SAFE_WAIT_RANGE_BUCKET.ONE_TO_TWO_HOURS]: '1–2 hours',
  [SAFE_WAIT_RANGE_BUCKET.TWO_TO_FOUR_HOURS]: '2–4 hours',
  [SAFE_WAIT_RANGE_BUCKET.OVER_FOUR_HOURS]: 'More than 4 hours',
};

export type SafeWaitRangeMessage = Readonly<{
  value: string;
  detail: string;
  disclaimer: string;
  bucketId: SafeWaitRangeBucketId | 'span';
  lowBucketId: SafeWaitRangeBucketId;
  highBucketId: SafeWaitRangeBucketId;
}>;

function normalizeMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) return 0;
  return Math.round(minutes);
}

/** Map internal wait minutes to a patient-safe bucket. */
export function classifySafeWaitRangeBucket(minutes: number): SafeWaitRangeBucketId {
  const value = normalizeMinutes(minutes);
  if (value < 30) return SAFE_WAIT_RANGE_BUCKET.UNDER_30;
  if (value < 60) return SAFE_WAIT_RANGE_BUCKET.THIRTY_TO_SIXTY;
  if (value < 120) return SAFE_WAIT_RANGE_BUCKET.ONE_TO_TWO_HOURS;
  if (value < 240) return SAFE_WAIT_RANGE_BUCKET.TWO_TO_FOUR_HOURS;
  return SAFE_WAIT_RANGE_BUCKET.OVER_FOUR_HOURS;
}

export function formatSafeWaitRangeBucket(minutes: number): string {
  return BUCKET_LABELS[classifySafeWaitRangeBucket(minutes)];
}

function bucketIndex(bucketId: SafeWaitRangeBucketId): number {
  return BUCKET_ORDER.indexOf(bucketId);
}

function formatBucketSpan(
  lowBucketId: SafeWaitRangeBucketId,
  highBucketId: SafeWaitRangeBucketId,
): string {
  if (lowBucketId === highBucketId) return BUCKET_LABELS[lowBucketId];
  return `${BUCKET_LABELS[lowBucketId]} to ${BUCKET_LABELS[highBucketId]}`;
}

export type BuildSafeWaitRangeMessageInput = {
  avgMinutes?: number;
  longestMinutes?: number;
  /** Single-metric convenience (e.g. triage queue). */
  minutes?: number;
  disclaimer?: string;
};

/**
 * Convert internal wait metrics into a patient-safe range label.
 * Uses the lower and upper bounds from avg/longest to avoid promising exact times.
 */
export function buildSafeWaitRangeMessage(
  input: BuildSafeWaitRangeMessageInput = {},
): SafeWaitRangeMessage {
  const disclaimer = input.disclaimer ?? PUBLIC_WAIT_URGENCY_DISCLAIMER;
  const avg = normalizeMinutes(input.avgMinutes ?? 0);
  const longest = normalizeMinutes(input.longestMinutes ?? 0);
  const single = normalizeMinutes(input.minutes ?? 0);

  const hasPair = avg > 0 || longest > 0;
  const lowMinutes = hasPair ? Math.min(avg || longest, longest || avg) : single;
  const highMinutes = hasPair ? Math.max(avg || longest, longest || avg) : single;

  if (!lowMinutes && !highMinutes) {
    return Object.freeze({
      value: 'Updating',
      detail: 'Wait range will appear when enough patients are in the waiting room.',
      disclaimer,
      bucketId: SAFE_WAIT_RANGE_BUCKET.UNDER_30,
      lowBucketId: SAFE_WAIT_RANGE_BUCKET.UNDER_30,
      highBucketId: SAFE_WAIT_RANGE_BUCKET.UNDER_30,
    });
  }

  const lowBucketId = classifySafeWaitRangeBucket(lowMinutes);
  const highBucketId = classifySafeWaitRangeBucket(highMinutes);
  const value = formatBucketSpan(lowBucketId, highBucketId);
  const bucketId = lowBucketId === highBucketId ? lowBucketId : 'span';

  const detail =
    bucketId === 'span'
      ? 'Typical wait to see a clinician — actual times vary and urgent cases are seen first.'
      : 'Typical wait to see a clinician — urgent cases are seen first.';

  return Object.freeze({
    value,
    detail,
    disclaimer,
    bucketId,
    lowBucketId,
    highBucketId,
  });
}

/** @deprecated Use buildSafeWaitRangeMessage — kept for import stability. */
export function formatPublicWaitRange(avgMinutes: number, longestMinutes: number): string {
  return buildSafeWaitRangeMessage({ avgMinutes, longestMinutes }).value;
}

/** @deprecated Use formatSafeWaitRangeBucket — kept for import stability. */
export function formatPublicWaitDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  return formatSafeWaitRangeBucket(minutes);
}
