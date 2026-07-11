/**
 * AI deployment flags — shadow / canary / kill (PR-10).
 * Env-driven; no silent production model swaps.
 */

export type AiDeployMode = 'off' | 'shadow' | 'canary' | 'full';

export interface AiDeploymentFlags {
  /** Hard block on all LLM egress */
  killSwitch: boolean;
  /** AI_DEPLOY_MODE: off | shadow | canary | full */
  mode: AiDeployMode;
  /** 0–100 when mode=canary */
  canaryPercent: number;
  /** Candidate provider/model for shadow/canary (optional) */
  candidateProvider?: string;
  candidateModel?: string;
  /** Log candidate outputs without returning them to users (shadow) */
  shadowLogOnly: boolean;
  /** Require offline eval gate artifact present before full mode in strict ops */
  requireEvalGatePass: boolean;
}

function readBool(name: string, fallback = false): boolean {
  if (typeof process === 'undefined') return fallback;
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

function readInt(name: string, fallback: number, min: number, max: number): number {
  if (typeof process === 'undefined') return fallback;
  const n = Number.parseInt(String(process.env[name] ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function readAiDeploymentFlags(env: NodeJS.ProcessEnv = process.env): AiDeploymentFlags {
  const killSwitch =
    env.AI_KILL_SWITCH === '1' ||
    env.AI_KILL_SWITCH === 'true' ||
    env.AI_EXTERNAL_LLM_DISABLED === '1' ||
    env.AI_EXTERNAL_LLM_DISABLED === 'true';

  const rawMode = String(env.AI_DEPLOY_MODE || 'full').toLowerCase().trim();
  let mode: AiDeployMode = 'full';
  if (rawMode === 'off' || rawMode === 'shadow' || rawMode === 'canary' || rawMode === 'full') {
    mode = rawMode;
  }

  return {
    killSwitch,
    mode: killSwitch ? 'off' : mode,
    canaryPercent: readInt('AI_CANARY_PERCENT', 10, 0, 100),
    candidateProvider: env.AI_CANDIDATE_PROVIDER || undefined,
    candidateModel: env.AI_CANDIDATE_MODEL || undefined,
    shadowLogOnly: mode === 'shadow' || readBool('AI_SHADOW_LOG_ONLY', false),
    requireEvalGatePass: readBool('AI_REQUIRE_EVAL_GATE_PASS', false),
  };
}

/**
 * Stable bucket 0–99 for canary routing (user/session id).
 */
export function canaryBucket(stableId: string): number {
  let h = 0;
  const s = String(stableId || 'anonymous');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 100;
}

export function shouldServeCandidate(
  flags: AiDeploymentFlags,
  stableId: string,
): boolean {
  if (flags.killSwitch || flags.mode === 'off') return false;
  if (flags.mode === 'full') return false; // full uses primary, not candidate
  if (flags.mode === 'shadow') return true; // run candidate for logging only
  if (flags.mode === 'canary') {
    return canaryBucket(stableId) < flags.canaryPercent;
  }
  return false;
}

export function describeDeploymentFlags(flags: AiDeploymentFlags = readAiDeploymentFlags()): string {
  return [
    `mode=${flags.mode}`,
    `kill=${flags.killSwitch}`,
    `canaryPercent=${flags.canaryPercent}`,
    flags.candidateProvider ? `candidateProvider=${flags.candidateProvider}` : null,
    flags.candidateModel ? `candidateModel=${flags.candidateModel}` : null,
    `shadowLogOnly=${flags.shadowLogOnly}`,
  ]
    .filter(Boolean)
    .join(' ');
}
