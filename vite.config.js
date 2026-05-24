import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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

  return {
    plugins: [react()],
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
      port: 4173,
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
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('dexie')) {
                return 'vendor-idb';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              return 'vendor';
            }

            if (id.includes('pages/tools/Calculators')) {
              return 'calculators';
            }
            if (id.includes('ClinicalToolCatalog')) {
              return 'clinical-catalog';
            }
            if (id.includes('pages/Dashboard')) {
              return 'dashboard';
            }
            if (id.includes('AnalyticsDashboard') || id.includes('CostAnalyticsDashboard')) {
              return 'analytics';
            }
            if (id.includes('components/charts/')) {
              return 'charts';
            }
          },
          // Consistent chunk naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Increase chunk size warning limit (we're using code splitting)
      chunkSizeWarningLimit: 600,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['@capacitor/core', '@capacitor/android'],
    },
  };
});
