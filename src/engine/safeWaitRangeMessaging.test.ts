import { describe, expect, it } from 'vitest';
import {
  PUBLIC_WAIT_URGENCY_DISCLAIMER,
  SAFE_WAIT_RANGE_BUCKET,
  buildSafeWaitRangeMessage,
  classifySafeWaitRangeBucket,
  formatPublicWaitDuration,
  formatPublicWaitRange,
  formatSafeWaitRangeBucket,
} from './safeWaitRangeMessaging';

describe('safeWaitRangeMessaging', () => {
  it('classifies minute buckets without exposing exact times', () => {
    expect(classifySafeWaitRangeBucket(0)).toBe(SAFE_WAIT_RANGE_BUCKET.UNDER_30);
    expect(classifySafeWaitRangeBucket(15)).toBe(SAFE_WAIT_RANGE_BUCKET.UNDER_30);
    expect(classifySafeWaitRangeBucket(29)).toBe(SAFE_WAIT_RANGE_BUCKET.UNDER_30);
    expect(classifySafeWaitRangeBucket(30)).toBe(SAFE_WAIT_RANGE_BUCKET.THIRTY_TO_SIXTY);
    expect(classifySafeWaitRangeBucket(59)).toBe(SAFE_WAIT_RANGE_BUCKET.THIRTY_TO_SIXTY);
    expect(classifySafeWaitRangeBucket(60)).toBe(SAFE_WAIT_RANGE_BUCKET.ONE_TO_TWO_HOURS);
    expect(classifySafeWaitRangeBucket(119)).toBe(SAFE_WAIT_RANGE_BUCKET.ONE_TO_TWO_HOURS);
    expect(classifySafeWaitRangeBucket(120)).toBe(SAFE_WAIT_RANGE_BUCKET.TWO_TO_FOUR_HOURS);
    expect(classifySafeWaitRangeBucket(239)).toBe(SAFE_WAIT_RANGE_BUCKET.TWO_TO_FOUR_HOURS);
    expect(classifySafeWaitRangeBucket(240)).toBe(SAFE_WAIT_RANGE_BUCKET.OVER_FOUR_HOURS);
    expect(formatSafeWaitRangeBucket(42)).toBe('30–60 minutes');
  });

  it('builds a single bucket when avg and longest align', () => {
    const message = buildSafeWaitRangeMessage({ avgMinutes: 20, longestMinutes: 22 });
    expect(message.value).toBe('Less than 30 minutes');
    expect(message.bucketId).toBe(SAFE_WAIT_RANGE_BUCKET.UNDER_30);
    expect(message.disclaimer).toBe(PUBLIC_WAIT_URGENCY_DISCLAIMER);
  });

  it('spans buckets when avg and longest diverge', () => {
    const message = buildSafeWaitRangeMessage({ avgMinutes: 45, longestMinutes: 180 });
    expect(message.value).toBe('30–60 minutes to 2–4 hours');
    expect(message.bucketId).toBe('span');
  });

  it('supports single-metric triage-style messaging', () => {
    const message = buildSafeWaitRangeMessage({ minutes: 95 });
    expect(message.value).toBe('1–2 hours');
  });

  it('returns updating copy when no metrics are available', () => {
    expect(buildSafeWaitRangeMessage().value).toBe('Updating');
  });

  it('keeps deprecated format helpers on bucketed messaging', () => {
    expect(formatPublicWaitRange(30, 75)).toBe('30–60 minutes to 1–2 hours');
    expect(formatPublicWaitRange(20, 22)).toBe('Less than 30 minutes');
    expect(formatPublicWaitDuration(42)).toBe('30–60 minutes');
    expect(formatPublicWaitDuration(95)).toBe('1–2 hours');
  });
});
