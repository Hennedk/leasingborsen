import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/services/comparison/**/*.{ts,tsx}',
        'src/hooks/useListingComparison.ts',
        'supabase/functions/compare-extracted-listings/**/*.ts'
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test-data.ts',
        '**/types.ts'
      ],
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 85,
        statements: 85
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})