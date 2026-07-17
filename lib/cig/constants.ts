/**
 * Clinical Intelligence Graph (CIG) — shared constants.
 * See docs/architecture/clinical-intelligence-graph-design.md
 */

export const CARE_DROID_CIG_LAYER = 'CareDroidClinicalIntelligenceGraph' as const;

/** Projector rules generation — bump when projection semantics change. */
export const CIG_PROJECTOR_GENERATION = '1.0.0-contracts';

/** Default soft-archive retention for discharged patients in the hot graph (K19). */
export const CIG_DISCHARGED_RETENTION_MS = 36 * 60 * 60 * 1000;

/** Dual-read freshness threshold: snapshot older than this forces T2 fallback (C3/K15). */
export const CIG_SNAPSHOT_FRESHNESS_MS = 2 * 60 * 1000;

/** Projector lag above this forces dual-read degrade (C5/K15). */
export const CIG_PROJECTOR_LAG_DEGRADE_MS = 2_000;

/** Target p95 projection latency after durable write (K15). */
export const CIG_PROJECT_P95_TARGET_MS = 200;

/** Canvas route (K20). */
export const CIG_OPERATIONAL_CANVAS_ROUTE = '/emergency/operational-canvas' as const;

/**
 * Simulation / Hybrid twin writes must use a synthetic tenant (K21).
 * Never project simulation state into a live hospital tenant.
 */
export const CIG_SIMULATION_TENANT_PREFIX = 'cig-sim:' as const;

export const CIG_DISCLAIMERS = Object.freeze({
  operational:
    'Clinical Intelligence Graph is advisory operational intelligence. Human review required.',
  multiUser:
    'Multi-user durable twin claims require Mode A (durable clinical SoT + outbox). Session projections must not show multi-user live badges.',
  clinical:
    'Human review required. Graph paths and AI summaries do not replace clinical judgment.',
});
