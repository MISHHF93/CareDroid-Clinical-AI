export type EdDataFreshness = Readonly<{
  label: string;
  stale: boolean;
}>;

export function resolveEdDataFreshness(generatedAt?: string | null): EdDataFreshness {
  if (!generatedAt) {
    return { label: 'latest local state', stale: false };
  }

  const timestamp = new Date(generatedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return { label: 'latest local state', stale: false };
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  const timeLabel = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (elapsedMinutes < 1) {
    return { label: `updated now at ${timeLabel}`, stale: false };
  }

  return {
    label: `updated ${elapsedMinutes < 60 ? `${elapsedMinutes}m ago` : `${Math.round(elapsedMinutes / 60)}h ago`} at ${timeLabel}`,
    stale: elapsedMinutes >= 5,
  };
}

export function resolveEdSourceLabel(source?: string | null): string {
  if (source === 'simulation-mode') {
    return 'simulation / training generators — no live patient data';
  }
  if (!source || /fallback|demo|fixture|first-customer|scenario/i.test(source)) {
    return 'walkthrough/local dataset — no live hospital integration';
  }
  if (source === 'backend' || source === 'live') {
    return 'live CareDroid feed';
  }
  return source.replace(/-/g, ' ');
}

export type EdDataSourceInput = Readonly<{
  envelope?: { source?: string; generatedAt?: string } | null;
  loading?: boolean;
  error?: string | null;
  activeScenarioId?: string | null;
  backendAvailable?: boolean;
  simulationModeActive?: boolean;
}>;

export function resolveEdDataSourcePresentation(input: EdDataSourceInput): Readonly<{
  sourceLabel: string;
  freshness: EdDataFreshness;
  warnStale: boolean;
}> {
  const envelope = input.envelope;
  const generatedAt = envelope?.generatedAt;
  const freshness = resolveEdDataFreshness(generatedAt);

  let source = envelope?.source;
  if (input.simulationModeActive) {
    source = 'simulation-mode';
  } else if (input.activeScenarioId) {
    source = 'scenario-fixture';
  } else if (!source && input.backendAvailable === false) {
    source = 'local-store-fallback';
  } else if (!source && input.error) {
    source = 'api-unavailable-local';
  }

  return {
    sourceLabel: resolveEdSourceLabel(source),
    freshness,
    warnStale: freshness.stale,
  };
}