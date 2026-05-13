import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 8000,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  /** Same proxy as dev so `vite preview` can reach the API on relative /api (direct LAN access). */
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Performance optimizations
    target: 'esnext',
    // esbuild minify (default); avoids optional terser peer on CI (e.g. Vercel)
    minify: 'esbuild',
    // Code splitting - manual chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - group by library
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Charts library
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // Other vendors
            return 'vendor';
          }
          
          // Analytics pages
          if (id.includes('AnalyticsDashboard') || id.includes('CostAnalyticsDashboard')) {
            return 'analytics';
          }
          
          // Chart components
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
});
