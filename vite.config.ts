import { createLogger, defineConfig, loadEnv, type Logger, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import path from 'node:path';

const PROXY_REFUSED_LOG_INTERVAL_MS = 60_000;

const createThrottledDevLogger = (proxyTarget: string): Logger => {
  const logger = createLogger();
  const warn = logger.warn.bind(logger);
  let lastProxyRefusedLogAt = 0;

  logger.warn = (msg: string | Error, options?: Parameters<Logger['warn']>[1]) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (text.includes('http proxy error')) {
      const now = Date.now();
      if (now - lastProxyRefusedLogAt < PROXY_REFUSED_LOG_INTERVAL_MS) return;
      lastProxyRefusedLogAt = now;
      warn(
        `API proxy could not reach ${proxyTarget} (ECONNREFUSED). ` +
          'Start the backend with `npm run dev:api` or use `npm run dev:fullstack` for frontend + API.',
        options,
      );
      return;
    }
    warn(msg as string, options);
  };

  return logger;
};

const backendHealthPlugin = (proxyTarget: string): Plugin => ({
  name: 'care-backend-health',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      void fetch(`${proxyTarget}/health`)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        })
        .catch(() => {
          server.config.logger.warn(
            `\nCareDroid API is not reachable at ${proxyTarget}.\n` +
              '  Full stack: npm run dev:fullstack\n' +
              '  API only:   npm run dev:api\n',
          );
        });
    });
  },
});

const readGitValue = (command: string, fallback = 'unknown'): string => {
  try {
    return (
      execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
};

const buildInfoFor = (mode: string, env: Record<string, string>) => ({
  appVersion: env.VITE_APP_VERSION || '1.0.0',
  buildTime: env.VITE_BUILD_TIME || process.env.VITE_BUILD_TIME || new Date().toISOString(),
  commit:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    env.VITE_GIT_COMMIT_SHA ||
    process.env.VITE_GIT_COMMIT_SHA ||
    readGitValue('git rev-parse HEAD'),
  branch:
    process.env.VERCEL_GIT_COMMIT_REF ||
    env.VITE_GIT_BRANCH ||
    process.env.VITE_GIT_BRANCH ||
    readGitValue('git rev-parse --abbrev-ref HEAD'),
  environment: process.env.VERCEL_ENV || env.VITE_APP_ENVIRONMENT || mode,
  deploymentUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || '',
  vercelDetected: Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL),
  vercelEnv: process.env.VERCEL_ENV || '',
  vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || '',
  repository:
    process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : env.VITE_GIT_REPOSITORY || '',
});

const attachProxyOfflineHandler = (proxy: { on: (event: string, handler: (...args: any[]) => void) => void }) => {
  proxy.on('error', (_error, _req, res) => {
    if (!res || typeof res.writeHead !== 'function' || res.headersSent) return;
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'offline',
        message:
          'CareDroid API is not running. Start it with `npm run dev:fullstack` or `npm run dev:api`.',
      }),
    );
  });
};

const proxyPaths = (target: string) => ({
  '/api': {
    target,
    changeOrigin: true,
    configure: attachProxyOfflineHandler,
  },
  '/socket.io': {
    target,
    ws: true,
    configure: attachProxyOfflineHandler,
  },
  '/health': {
    target,
    changeOrigin: true,
    configure: attachProxyOfflineHandler,
  },
});

const readPort = (...values: (string | undefined)[]): number => {
  for (const value of values) {
    const parsed = Number.parseInt(value || '', 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) return parsed;
  }
  return 5190;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const frontendPort = readPort(
    env.FRONTEND_PORT,
    env.VITE_DEV_PORT,
    process.env.FRONTEND_PORT,
    process.env.VITE_DEV_PORT,
    '5190',
  );
  const backendPort = readPort(
    env.BACKEND_PORT,
    process.env.BACKEND_PORT,
    process.env.PORT,
    '3350',
  );
  const proxyTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${backendPort}`;
  const buildInfo = buildInfoFor(mode, env);

  return {
    customLogger: mode === 'development' ? createThrottledDevLogger(proxyTarget) : undefined,
    plugins: [react(), mode === 'development' ? backendHealthPlugin(proxyTarget) : null].filter(
      Boolean,
    ) as Plugin[],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
        '@lib': path.resolve(process.cwd(), './lib'),
        '@store': path.resolve(process.cwd(), './src/store'),
      },
    },
    define: {
      __CARE_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    esbuild: {
      drop: mode === 'production' ? (['console', 'debugger'] as const) : [],
    },
    server: {
      port: frontendPort,
      strictPort: true,
      host: true,
      proxy: proxyPaths(proxyTarget),
    },
    preview: {
      port: frontendPort,
      strictPort: true,
      host: true,
      proxy: proxyPaths(proxyTarget),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const normalizedId = id.replaceAll('\\', '/');

            if (normalizedId.includes('node_modules')) {
              if (normalizedId.includes('recharts')) return 'vendor-charts';
              if (normalizedId.includes('dexie')) return 'vendor-idb';
              if (normalizedId.includes('firebase')) return 'vendor-firebase';
              if (
                normalizedId.includes('lucide-react') ||
                normalizedId.includes('@tabler/icons-react')
              ) return 'vendor-icons';
              if (
                normalizedId.includes('axios') ||
                normalizedId.includes('socket.io-client') ||
                normalizedId.includes('engine.io-client')
              ) return 'vendor-network';
              return 'vendor';
            }

            if (
              normalizedId.includes('/src/config/unified-navigation') ||
              normalizedId.includes('/src/config/navigation') ||
              normalizedId.includes('/src/data/workspaceExperience') ||
              normalizedId.includes('/src/data/workspaceArchitecture')
            ) return 'data-navigation';

            if (normalizedId.includes('/src/pages/tools/mentalHealthCalculators')) return 'calculators-mental-health';
            if (
              normalizedId.includes('/src/pages/tools/pr4aCalculators') ||
              normalizedId.includes('/src/pages/tools/pr8ClinicalBatchCalculators') ||
              normalizedId.includes('/src/pages/tools/sourceBackedClinicalCalculators') ||
              normalizedId.includes('/src/pages/tools/abcd2Calculator') ||
              normalizedId.includes('/src/pages/tools/nextWaveCalculators')
            ) return 'calculators-general-clinical';
            if (normalizedId.includes('/src/pages/tools/emergencyCriticalCareCalculators')) return 'calculators-emergency-critical-care';
            if (normalizedId.includes('/src/pages/tools/cardiologyCalculators')) return 'calculators-cardiology';
            if (normalizedId.includes('/src/pages/tools/pulmonologyCalculators')) return 'calculators-pulmonology';
            if (normalizedId.includes('/src/pages/tools/nephrologyCalculators')) return 'calculators-nephrology';
            if (normalizedId.includes('/src/pages/tools/endocrineMetabolicCalculators')) return 'calculators-endocrine-metabolic';
            if (normalizedId.includes('/src/pages/tools/neurologyCalculators')) return 'calculators-neurology';
            if (normalizedId.includes('/src/pages/tools/pediatricsObgynCalculators')) return 'calculators-pediatrics-obgyn';
            if (normalizedId.includes('/src/pages/tools/psychiatryScreeningCalculators')) return 'calculators-psychiatry-screening';
            if (normalizedId.includes('/src/pages/tools/hospitalOperationsCalculators')) return 'calculators-hospital-operations';
            if (normalizedId.includes('/src/pages/tools/hepatologyGiCalculators')) return 'calculators-hepatology-gi';
            if (normalizedId.includes('pages/tools/Calculators')) return 'calculators';
            if (normalizedId.includes('ClinicalToolCatalog')) return 'clinical-catalog';
            if (normalizedId.includes('pages/Dashboard')) return 'dashboard';
            if (
              normalizedId.includes('AnalyticsDashboard') ||
              normalizedId.includes('CostAnalyticsDashboard')
            ) return 'analytics';
            if (normalizedId.includes('components/charts/')) return 'charts';

            return undefined;
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1600,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        path.resolve(process.cwd(), './lib/native-ai/index.ts'),
        path.resolve(process.cwd(), './lib/patient-orchestration/index.ts'),
      ],
    },
  };
});
