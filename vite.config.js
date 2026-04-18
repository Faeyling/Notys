import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

/**
 * VITE_APP_BASE – set this env var when deploying to a sub-directory.
 * Example: VITE_APP_BASE=/notys/  → all assets resolve from /notys/
 * Leave empty (or unset) for root deployment: https://yourdomain.com/
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  /* Base URL — overridable via env so the same repo works at root or sub-path */
  base: process.env.VITE_APP_BASE || '/',

  build: {
    outDir: 'dist',
    /* No source-maps in production (smaller + no source exposure) */
    sourcemap: false,
    /* Warn when a chunk exceeds 600 kB */
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting keeps the initial bundle small.
         * Vite writes content-hashed filenames so each chunk is
         * cached permanently by the browser / CDN.
         */
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-dnd':    ['@hello-pangea/dnd'],
          'vendor-db':     ['dexie'],
        },
      },
    },
  },

  /* Dev server: local port + open browser automatically */
  server: {
    port: 5173,
    open: true,
  },
});
