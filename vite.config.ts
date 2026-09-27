/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // Absolute base: locale-prefixed routes (/fr/login, /ar/account…) are two
  // levels deep, so relative asset URLs would resolve to /fr/assets/* and 404.
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Phase 17: hidden source maps only when Sentry is configured at build
    // time (uploaded to Sentry at deploy; never referenced from the HTML).
    sourcemap: process.env.VITE_SENTRY_DSN ? 'hidden' : false,
    // Phase 14: split the heavy vendors into long-lived cacheable chunks;
    // route-level lazy() in App.tsx keeps admin/account code out of the
    // public bundle entirely.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
