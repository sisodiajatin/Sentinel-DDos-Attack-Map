import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Secrets (GEMINI/ABUSEIPDB/OTX keys) are read only by the /api serverless
// functions via process.env. Never inject them with `define` here, because
// anything in `define` is inlined into the public browser bundle.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ['d3', 'topojson-client'],
          charts: ['recharts'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
