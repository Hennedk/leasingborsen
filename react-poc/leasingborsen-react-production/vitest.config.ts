/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Fix MSW compatibility issues
    pool: 'forks',
    testTimeout: 10000,
    hookTimeout: 10000,
    env: {
      // Force test environment detection
      VITEST: 'true',
      NODE_ENV: 'test',
      // Test-specific Supabase configuration
      VITE_SUPABASE_TEST_URL: 'http://localhost:54321',
      VITE_SUPABASE_TEST_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})