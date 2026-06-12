import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

const readGitValue = (command, fallback = 'unknown') => {
  try {
    return (
      execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
};

const buildInfoFor = (mode, env) => ({
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

const proxyPaths = (target) => ({
  '/api': {
    target,
    changeOrigin: true,
  },
  '/socket.io': {
    target,
    ws: true,
  },
  '/health': {
    target,
    changeOrigin: true,
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';
  const buildInfo = buildInfoFor(mode, env);

  return {
    plugins: [react()],
    define: {
      __CARE_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    server: {
      port: 8000,
      strictPort: false,
      host: true,
      proxy: proxyPaths(proxyTarget),
    },
    /** Same proxy as dev so `vite preview` can reach the API on relative /api (direct LAN access). */
    preview: {
      port: 8000,
      strictPort: false,
      host: true,
      proxy: proxyPaths(proxyTarget),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      // Performance optimizations
      target: 'esnext',
      // esbuild minify (default); avoids optional terser peer on CI (e.g. Vercel)
      minify: 'esbuild',
      // Code splitting - manual chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            const normalizedId = id.replaceAll('\\', '/');

            if (normalizedId.includes('node_modules')) {
              if (normalizedId.includes('recharts')) {
                return 'vendor-charts';
              }
              if (normalizedId.includes('dexie')) {
                return 'vendor-idb';
              }
              if (normalizedId.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (normalizedId.includes('lucide-react')) {
                return 'vendor-icons';
              }
              return 'vendor';
            }

            if (normalizedId.includes('/src/pages/tools/mentalHealthCalculators')) {
              return 'calculators-mental-health';
            }
            if (
              normalizedId.includes('/src/pages/tools/pr4aCalculators') ||
              normalizedId.includes('/src/pages/tools/pr8ClinicalBatchCalculators') ||
              normalizedId.includes('/src/pages/tools/sourceBackedClinicalCalculators') ||
              normalizedId.includes('/src/pages/tools/abcd2Calculator') ||
              normalizedId.includes('/src/pages/tools/nextWaveCalculators')
            ) {
              return 'calculators-general-clinical';
            }
            if (normalizedId.includes('/src/pages/tools/emergencyCriticalCareCalculators')) {
              return 'calculators-emergency-critical-care';
            }
            if (normalizedId.includes('/src/pages/tools/cardiologyCalculators')) {
              return 'calculators-cardiology';
            }
            if (normalizedId.includes('/src/pages/tools/pulmonologyCalculators')) {
              return 'calculators-pulmonology';
            }
            if (normalizedId.includes('/src/pages/tools/nephrologyCalculators')) {
              return 'calculators-nephrology';
            }
            if (normalizedId.includes('/src/pages/tools/endocrineMetabolicCalculators')) {
              return 'calculators-endocrine-metabolic';
            }
            if (normalizedId.includes('/src/pages/tools/neurologyCalculators')) {
              return 'calculators-neurology';
            }
            if (normalizedId.includes('/src/pages/tools/pediatricsObgynCalculators')) {
              return 'calculators-pediatrics-obgyn';
            }
            if (normalizedId.includes('/src/pages/tools/psychiatryScreeningCalculators')) {
              return 'calculators-psychiatry-screening';
            }
            if (normalizedId.includes('/src/pages/tools/hospitalOperationsCalculators')) {
              return 'calculators-hospital-operations';
            }
            if (normalizedId.includes('/src/pages/tools/hepatologyGiCalculators')) {
              return 'calculators-hepatology-gi';
            }
            if (normalizedId.includes('pages/tools/Calculators')) {
              return 'calculators';
            }
            if (normalizedId.includes('ClinicalToolCatalog')) {
              return 'clinical-catalog';
            }
            if (normalizedId.includes('pages/Dashboard')) {
              return 'dashboard';
            }
            if (
              normalizedId.includes('AnalyticsDashboard') ||
              normalizedId.includes('CostAnalyticsDashboard')
            ) {
              return 'analytics';
            }
            if (normalizedId.includes('components/charts/')) {
              return 'charts';
            }
          },
          // Consistent chunk naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // The calculator hub is an intentionally lazy-loaded clinical route with many form
      // implementations. Keep Vercel warnings focused on unexpected chunk growth.
      chunkSizeWarningLimit: 950,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['@capacitor/core', '@capacitor/android'],
    },
  };
});
