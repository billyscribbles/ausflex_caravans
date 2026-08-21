/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// `yarn build:analyze` sets ANALYZE=true to emit dist/bundle-stats.html.
const analyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    react(),
    analyze && visualizer({ filename: 'dist/bundle-stats.html', gzipSize: true }),
  ].filter(Boolean),
  preview: {
    host: '0.0.0.0',
    port: 4173,
    // Railway assigns a per-deploy *.up.railway.app subdomain plus any custom
    // domains. The leading dot makes Vite treat this as a wildcard, so we
    // don't have to update the config every deploy.
    allowedHosts: ['.up.railway.app'],
    // Baseline security headers — `yarn start` serves this preview config in
    // production on Railway. CSP and HSTS are deliberately omitted: CSP needs
    // a per-site allowlist (GA, Formspree) and HSTS is a host-level decision.
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  // Vitest runs the foundation "contract" suite — see src/test/.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}', 'server/**/*.test.js'],
  },
})
