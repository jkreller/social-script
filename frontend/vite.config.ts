import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    __GIT_COMMIT__: JSON.stringify(execSync('git rev-parse HEAD').toString().trim()),
  },
  // Pyodide ships its own runtime; don't let esbuild pre-bundle it.
  optimizeDeps: { exclude: ['pyodide'] },
  // The engine worker imports Pyodide (code-split) — needs ES module output.
  worker: { format: 'es' },
  // Allow the worker to read social_script/ + scripts/ (above the frontend root) via ?raw glob.
  server: { fs: { allow: ['..'] } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache the Pyodide runtime (incl. the ~9.6 MB wasm) so runs work offline.
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,wasm,zip,json,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
      manifest: {
        name: 'Social Script Runner',
        short_name: 'Script',
        description: 'Execute social scripts step by step',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f5f0e8',
        background_color: '#f5f0e8',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
