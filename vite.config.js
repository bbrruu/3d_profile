import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // public/ holds manifest.json, icons, models — copied to dist/ as-is
  publicDir: 'public',

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',

      // We manage our own manifest.json in public/ — don't generate one
      manifest: false,
      includeManifestIcons: false,

      workbox: {
        // Precache everything in the built output
        globPatterns: ['**/*.{js,css,html,png,ico,svg,json,woff2}'],

        // Fallback for SPA navigation
        navigateFallback: '/index.html',

        runtimeCaching: [
          // Google Fonts — cache for 1 year
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Live price APIs — NetworkOnly (never cache stale prices)
          {
            urlPattern: /^https:\/\/(query1|query2)\.finance\.yahoo\.com\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/api\.coingecko\.com\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/(corsproxy\.io|api\.allorigins\.win)\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      },

      devOptions: {
        enabled: true   // Service worker also active during `npm run dev`
      }
    })
  ],

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep bundles reasonably sized
        manualChunks: {
          chartjs: ['chart.js']
        }
      }
    }
  }
})
