import { afterEach, describe, expect, it } from 'vitest';
import {
  canaryBucket,
  readAiDeploymentFlags,
  shouldServeCandidate,
} from './deploymentFlags';

describe('deploymentFlags', () => {
  const keys = [
    'AI_KILL_SWITCH',
    'AI_DEPLOY_MODE',
    'AI_CANARY_PERCENT',
    'AI_CANDIDATE_PROVIDER',
    'AI_EXTERNAL_LLM_DISABLED',
  ];
  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  function snapshot() {
    for (const k of keys) prev[k] = process.env[k];
  }

  it('reads kill switch and modes', () => {
    snapshot();
    process.env.AI_KILL_SWITCH = '1';
    process.env.AI_DEPLOY_MODE = 'canary';
    const flags = readAiDeploymentFlags();
    expect(flags.killSwitch).toBe(true);
    expect(flags.mode).toBe('off');
  });

  it('canary bucket is stable', () => {
    expect(canaryBucket('user-a')).toBe(canaryBucket('user-a'));
    expect(canaryBucket('user-a')).toBeGreaterThanOrEqual(0);
    expect(canaryBucket('user-a')).toBeLessThan(100);
  });

  it('shouldServeCandidate respects canary percent', () => {
    snapshot();
    delete process.env.AI_KILL_SWITCH;
    process.env.AI_DEPLOY_MODE = 'canary';
    process.env.AI_CANARY_PERCENT = '100';
    process.env.AI_CANDIDATE_PROVIDER = 'local';
    expect(shouldServeCandidate(readAiDeploymentFlags(), 'any-user')).toBe(true);
    process.env.AI_CANARY_PERCENT = '0';
    expect(shouldServeCandidate(readAiDeploymentFlags(), 'any-user')).toBe(false);
  });
});
