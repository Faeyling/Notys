import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * VITE_APP_BASE – set this env var when deploying to a sub-directory.
 * Example: VITE_APP_BASE=/notys/  → all assets resolve from /notys/
 * Leave empty (or unset) for root deployment: https://yourdomain.com/
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* Auto-update SW in the background — no prompt shown to the user */
      registerType: 'autoUpdate',

      /* Inject the SW registration <script> into the built HTML automatically */
      injectRegister: 'auto',

      /* Workbox generates the SW; lists every build asset for pre-caching */
      strategies: 'generateSW',
      filename: 'sw.js',

      /* Static assets in /public to pre-cache alongside the build output */
      includeAssets: [
        'favicon.ico',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
      ],

      workbox: {
        /* Pre-cache all JS/CSS/HTML and common static asset types */
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        /* Delete caches from old SW versions on activation */
        cleanupOutdatedCaches: true,

        /* SPA fallback — serve the shell for all navigation requests */
        navigateFallback: '/index.html',

        /* Don't intercept /.well-known/ — TWA asset link verification must reach the CDN */
        navigateFallbackDenylist: [/^\/\.well-known/],
      },

      /* Web App Manifest — managed here so Workbox can cross-reference icons */
      manifest: {
        id: '/',
        name: "Noty's",
        short_name: "Noty's",
        description: "Application de prise de notes locale et colorée — notes, dossiers, notes vocales.",
        start_url: '/',
        scope: '/',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFBFE',
        theme_color: '#FFC7EE',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        /* screenshots — add 2+ phone captures (9:16, min 1080×1920) before Play Store submission */
        screenshots: [],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  base: process.env.VITE_APP_BASE || '/',

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-dnd':    ['@hello-pangea/dnd'],
          'vendor-db':     ['dexie'],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
  },
});
