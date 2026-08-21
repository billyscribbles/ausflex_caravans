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
  server: {
    // `yarn dev` serves the SPA; the API and uploads come from `yarn dev:api`.
    // Production is Express (server/index.js), which owns the security headers
    // the old `preview` block used to set.
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
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
