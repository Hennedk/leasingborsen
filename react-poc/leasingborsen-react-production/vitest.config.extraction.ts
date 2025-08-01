import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'extraction-changes',
    include: ['src/services/extraction/__tests__/**/*.test.ts'],
    exclude: ['src/services/extraction/__tests__/**/*.integration.test.ts'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/extraction',
      include: [
        'src/services/extraction/**/*.ts',
        'src/services/comparison/**/*.ts',
        'src/hooks/useListingComparison.ts',
        'src/hooks/useAdminListingOperations.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/types.ts',
        '**/index.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
    testTimeout: 10000,
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/extraction/index.html',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

// Separate config for integration tests
export const integrationConfig = defineConfig({
  ...defineConfig({
    plugins: [react()],
    test: {
      name: 'extraction-integration',
      include: ['src/services/extraction/__tests__/**/*.integration.test.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 30000, // Longer timeout for integration tests
      // Load test environment from .env.test
      env: {
        VITEST: 'true',
      },
      envFiles: ['.env.test'],
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  }),
});