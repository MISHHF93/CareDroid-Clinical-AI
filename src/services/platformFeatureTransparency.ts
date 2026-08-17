import {
  ED_PLATFORM_ENHANCEMENTS,
  type EdPlatformEnhancement,
  type EnhancementMaturity,
} from '../config/edPlatformEnhancementRegistry';
import {
  FEATURE_FLAG_REGISTRY,
  FEATURE_FLAG_CATEGORIES,
} from '../config/featureFlags.config';
import {
  CAREDROID_SUITES,
  FEATURE_SUITE_ASSIGNMENTS,
  type MaturityLabel,
} from '../../lib/features/suiteRegistry';
import { FEATURE_REGISTRY, type Feature } from '../../lib/features/featureRegistry';
import { isSimulationModeActive } from './simulationModeService';

export type TransparencyStatus = 'live' | 'demo' | 'planned' | 'partial';

export type PlatformFeatureTransparencyEntry = Readonly<{
  id: string;
  title: string;
  category: string;
  baseStatus: TransparencyStatus;
  effectiveStatus: TransparencyStatus;
  surfaces: readonly string[];
  notes: string;
}>;

const ENHANCEMENT_TO_TRANSPARENCY: Record<EnhancementMaturity, TransparencyStatus> = {
  live: 'live',
  partial: 'partial',
  demo: 'demo',
  planned: 'planned',
  missing: 'planned',
};

const SUITE_MATURITY_TO_TRANSPARENCY: Record<MaturityLabel, TransparencyStatus> = {
  live: 'live',
  demo: 'demo',
  preview: 'partial',
  planned: 'planned',
};

const FEATURE_STATUS_TO_TRANSPARENCY: Record<Feature['status'], TransparencyStatus> = {
  stable: 'live',
  beta: 'partial',
  preview: 'demo',
  deprecated: 'planned',
};

export function mapEnhancementMaturityToTransparency(
  maturity: EnhancementMaturity,
): TransparencyStatus {
  return ENHANCEMENT_TO_TRANSPARENCY[maturity] ?? 'planned';
}

export function applySimulationTransparencyOverride(
  status: TransparencyStatus,
  simulationActive = isSimulationModeActive(),
): TransparencyStatus {
  if (!simulationActive) return status;
  if (status === 'live' || status === 'partial') return 'demo';
  return status;
}

function enhancementEntry(
  enhancement: EdPlatformEnhancement,
  simulationActive: boolean,
): PlatformFeatureTransparencyEntry {
  const baseStatus = mapEnhancementMaturityToTransparency(enhancement.maturity);
  return {
    id: enhancement.id,
    title: enhancement.title,
    category: enhancement.pillar.replace(/_/g, ' '),
    baseStatus,
    effectiveStatus: applySimulationTransparencyOverride(baseStatus, simulationActive),
    surfaces: enhancement.primarySurfaces,
    notes: enhancement.gapSummary,
  };
}

/**
 * Honest-disclosure ordering, least- to most-mature: a suite whose real
 * per-feature assignments are a mix of 'live' and something less mature should
 * report the LEAST mature label present, not the most flattering one -- this is
 * a transparency panel, and erring toward under-claiming is the safe direction
 * for a surface whose whole purpose is to not overstate what's real.
 */
const MATURITY_RANK: Record<MaturityLabel, number> = { planned: 0, demo: 1, preview: 2, live: 3 };

export function worstMaturity(maturities: readonly MaturityLabel[]): MaturityLabel | undefined {
  return maturities.reduce<MaturityLabel | undefined>(
    (worst, current) =>
      worst === undefined || MATURITY_RANK[current] < MATURITY_RANK[worst] ? current : worst,
    undefined,
  );
}

function suiteEntry(
  suite: (typeof CAREDROID_SUITES)[number],
  simulationActive: boolean,
): PlatformFeatureTransparencyEntry {
  // FEATURE_SUITE_ASSIGNMENTS (suiteRegistry.ts) is the real, per-feature-detailed
  // maturity registry for this suite -- 87 hand-tracked assignments across 11
  // suites. This used to instead look up FEATURE_REGISTRY (a DIFFERENT, parallel
  // registry in featureRegistry.ts) and take whichever single feature happened to
  // be the first one .find()-matched by suiteId, using that one arbitrary
  // feature's maturity to represent the entire suite -- silently wrong whenever a
  // suite's features didn't all share the same maturity (most of them don't).
  const suiteAssignments = Object.values(FEATURE_SUITE_ASSIGNMENTS).filter(
    (assignment) => assignment.suiteId === suite.id,
  );
  const assignmentMaturity = worstMaturity(suiteAssignments.map((assignment) => assignment.maturity));
  const baseStatus = assignmentMaturity
    ? SUITE_MATURITY_TO_TRANSPARENCY[assignmentMaturity]
    : 'partial';
  return {
    id: suite.id,
    title: suite.label,
    category: 'suite',
    baseStatus,
    effectiveStatus: applySimulationTransparencyOverride(baseStatus, simulationActive),
    surfaces: FEATURE_REGISTRY.filter((feature) => feature.suiteId === suite.id)
      .map((feature) => feature.sidebarRoute)
      .filter((route): route is string => Boolean(route)),
    notes: suite.description,
  };
}

function registryFeatureEntry(
  feature: Feature,
  simulationActive: boolean,
): PlatformFeatureTransparencyEntry {
  const baseStatus = feature.maturity
    ? SUITE_MATURITY_TO_TRANSPARENCY[feature.maturity]
    : FEATURE_STATUS_TO_TRANSPARENCY[feature.status];
  return {
    id: feature.id,
    title: feature.label,
    category: feature.category,
    baseStatus,
    effectiveStatus: applySimulationTransparencyOverride(baseStatus, simulationActive),
    surfaces: feature.sidebarRoute ? [feature.sidebarRoute] : [],
    notes: feature.description,
  };
}

export function buildPlatformFeatureTransparency(options?: {
  simulationActive?: boolean;
  includeSuites?: boolean;
  includeRegistryFeatures?: boolean;
  includeFeatureFlags?: boolean;
}): PlatformFeatureTransparencyEntry[] {
  const simulationActive = options?.simulationActive ?? isSimulationModeActive();
  const entries: PlatformFeatureTransparencyEntry[] = ED_PLATFORM_ENHANCEMENTS.map((enhancement) =>
    enhancementEntry(enhancement, simulationActive),
  );

  if (options?.includeSuites !== false) {
    entries.push(...CAREDROID_SUITES.map((suite) => suiteEntry(suite, simulationActive)));
  }

  if (options?.includeRegistryFeatures) {
    entries.push(
      ...FEATURE_REGISTRY.slice(0, 24).map((feature) =>
        registryFeatureEntry(feature, simulationActive),
      ),
    );
  }

  if (options?.includeFeatureFlags) {
    entries.push(
      ...FEATURE_FLAG_REGISTRY.map((flag) => {
        const baseStatus: TransparencyStatus =
          flag.defaultState === 'enabled' || flag.defaultState === 'beta'
            ? flag.defaultState === 'beta'
              ? 'partial'
              : 'live'
            : flag.defaultState === 'experimental'
              ? 'demo'
              : 'planned';
        return {
          id: flag.id,
          title: flag.name,
          category: flag.category || FEATURE_FLAG_CATEGORIES.SIMULATION,
          baseStatus,
          effectiveStatus: applySimulationTransparencyOverride(baseStatus, simulationActive),
          surfaces: flag.route ? [flag.route] : [],
          notes: flag.description,
        };
      }),
    );
  }

  return entries;
}

export function summarizePlatformFeatureTransparency(
  entries: readonly PlatformFeatureTransparencyEntry[],
): Readonly<Record<TransparencyStatus, number>> {
  return entries.reduce(
    (counts, entry) => {
      counts[entry.effectiveStatus] += 1;
      return counts;
    },
    { live: 0, demo: 0, planned: 0, partial: 0 } as Record<TransparencyStatus, number>,
  );
}