// TypeScript replacement for anomaly_detector.py (sklearn IsolationForest → z-score)
// Queries Prometheus metrics and pushes anomaly scores via Pushgateway.
// Run via: npx ts-node anomaly-detector.ts  OR  node --import tsx anomaly-detector.ts

interface DataPoint {
  timestamp: number;
  value: number;
}

interface MetricConfig {
  name: string;
  query: string;
  window: string;
  threshold: number;
}

interface AnomalyScores {
  [metricName: string]: number;
}

const METRICS_TO_MONITOR: MetricConfig[] = [
  {
    name: 'intent_classification_confidence',
    query: 'intent_classification_confidence',
    window: '1h',
    threshold: 0.7,
  },
  {
    name: 'http_request_duration_seconds',
    query: 'histogram_quantile(0.95, http_request_duration_seconds_bucket)',
    window: '1h',
    threshold: 0.7,
  },
  {
    name: 'errors_total',
    query: 'rate(errors_total[5m])',
    window: '1h',
    threshold: 0.7,
  },
  {
    name: 'tool_invocation_duration_seconds',
    query: 'histogram_quantile(0.95, tool_invocation_duration_seconds_bucket)',
    window: '1h',
    threshold: 0.7,
  },
  {
    name: 'rag_retrieval_duration_seconds',
    query: 'histogram_quantile(0.95, rag_retrieval_duration_seconds_bucket)',
    window: '1h',
    threshold: 0.7,
  },
];

async function queryPrometheus(
  prometheusUrl: string,
  query: string,
  startTs: number,
  endTs: number,
  step = '5m',
): Promise<DataPoint[]> {
  try {
    const params = new URLSearchParams({ query, start: String(startTs), end: String(endTs), step });
    const response = await fetch(`${prometheusUrl}/api/v1/query_range?${params}`, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      status: string;
      data?: { result?: Array<{ values?: [number, string][] }> };
    };

    if (data.status !== 'success') return [];

    const points: DataPoint[] = [];
    for (const series of data.data?.result ?? []) {
      for (const [timestamp, value] of series.values ?? []) {
        const num = parseFloat(value);
        if (Number.isFinite(num)) points.push({ timestamp, value: num });
      }
    }
    return points;
  } catch {
    return [];
  }
}

function detectAnomalyScore(values: number[]): number {
  if (values.length < 5) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Z-score for the latest value (normalized to 0–1)
  const latestZ = Math.abs(values[values.length - 1] - mean) / stdDev;
  return Math.min(latestZ / 3, 1); // z=3 maps to score=1
}

async function processMetric(prometheusUrl: string, config: MetricConfig): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 24 * 60 * 60;

  const points = await queryPrometheus(prometheusUrl, config.query, start, now);
  if (points.length < 5) {
    console.warn(`[anomaly] Insufficient data for ${config.name} (${points.length} points)`);
    return 0;
  }

  const values = points.map((p) => p.value);
  const score = detectAnomalyScore(values);
  console.info(`[anomaly] ${config.name}: score=${score.toFixed(3)}`);
  return score;
}

async function pushMetrics(gatewayUrl: string, scores: AnomalyScores): Promise<void> {
  const lines = Object.entries(scores)
    .map(([name, score]) => `anomaly_score{metric_name="${name}"} ${score}`)
    .join('\n');

  const body = `# HELP anomaly_score Anomaly score (0-1, higher = more anomalous)\n# TYPE anomaly_score gauge\n${lines}\n`;

  try {
    await fetch(`${gatewayUrl}/metrics/job/anomaly_detector`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain; version=0.0.4' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    console.info(`[anomaly] Metrics pushed to ${gatewayUrl}`);
  } catch (err) {
    console.error('[anomaly] Failed to push metrics:', err);
  }
}

async function run(): Promise<AnomalyScores> {
  const prometheusUrl = process.env.PROMETHEUS_URL ?? 'http://localhost:9090';
  const gatewayUrl = process.env.PROMETHEUS_PUSHGATEWAY_URL;

  console.info(`[anomaly] Starting detection run (Prometheus: ${prometheusUrl})`);

  const scores: AnomalyScores = {};
  for (const config of METRICS_TO_MONITOR) {
    scores[config.name] = await processMetric(prometheusUrl, config);
  }

  console.info('[anomaly] Scores:', JSON.stringify(scores, null, 2));

  if (gatewayUrl) {
    await pushMetrics(gatewayUrl, scores);
  }

  return scores;
}

// Entry point when run directly
run()
  .then((scores) => {
    console.info('[anomaly] Run complete:', scores);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[anomaly] Run failed:', err);
    process.exit(1);
  });

export { run, detectAnomalyScore, type AnomalyScores, type MetricConfig };
