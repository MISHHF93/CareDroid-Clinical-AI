// NLU load-test harness for the in-process Nest /api/nlu endpoints.
// Usage: ts-node scripts/loadTest.ts [--url http://localhost:3340/api/nlu/predict] [--requests 50] [--concurrency 5] [--live]

const SAMPLE_QUERIES = [
  'Patient has severe chest pain and shortness of breath',
  'Calculate SOFA score for this patient',
  'Interpret potassium level of 6.1',
  'Show sepsis protocol',
  'What are risk factors for stroke?',
];

interface LoadTestOptions {
  url: string;
  requests: number;
  concurrency: number;
  live: boolean;
}

function parseArgs(argv: string[]): LoadTestOptions {
  const get = (flag: string, fallback: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : fallback;
  };
  return {
    url: get('--url', 'http://localhost:3340/api/nlu/predict'),
    requests: Number(get('--requests', '50')),
    concurrency: Number(get('--concurrency', '5')),
    live: argv.includes('--live'),
  };
}

async function simulatePrediction(): Promise<number> {
  const latencyMs = 20 + Math.random() * 40;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  return latencyMs;
}

async function runSingleRequest(query: string, options: LoadTestOptions): Promise<number> {
  const start = Date.now();

  if (options.live) {
    try {
      const response = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await response.json();
    } catch (err) {
      console.warn(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      return -1;
    }
    return Date.now() - start;
  }

  return simulatePrediction();
}

async function runLoadTest(options: LoadTestOptions): Promise<void> {
  console.log(`Starting load test:`);
  console.log(`  URL: ${options.url}`);
  console.log(`  Total Requests: ${options.requests}`);
  console.log(`  Concurrency: ${options.concurrency}`);
  console.log(`  Mode: ${options.live ? 'Live Service' : 'Simulation'}`);

  const latencies: number[] = [];
  const queue = Array.from({ length: options.requests }, (_, i) => SAMPLE_QUERIES[i % SAMPLE_QUERIES.length]);

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const query = queue.shift();
      if (!query) return;
      const latency = await runSingleRequest(query, options);
      if (latency > 0) latencies.push(latency);
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));

  if (latencies.length === 0) {
    console.error('No successful requests!');
    return;
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Requests:      ${options.requests}`);
  console.log(`Successful:          ${latencies.length}`);
  console.log(`Failed:              ${options.requests - latencies.length}`);
  console.log('-'.repeat(60));
  console.log(`Latency p50:         ${p50.toFixed(2)} ms`);
  console.log(`Latency p95:         ${p95.toFixed(2)} ms`);
  console.log(`Latency p99:         ${p99.toFixed(2)} ms`);
  console.log(`Mean Latency:        ${mean.toFixed(2)} ms`);
  console.log('='.repeat(60));

  const targetP95Ms = 50;
  if (p95 < targetP95Ms) {
    console.log(`PASS: p95 latency ${p95.toFixed(2)}ms < target ${targetP95Ms}ms`);
  } else {
    console.warn(`FAIL: p95 latency ${p95.toFixed(2)}ms >= target ${targetP95Ms}ms`);
  }
}

if (require.main === module) {
  runLoadTest(parseArgs(process.argv.slice(2))).catch((err) => {
    console.error('Load test failed:', err);
    process.exitCode = 1;
  });
}

export { runLoadTest, parseArgs };
