const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^next-intl$': '<rootDir>/tests/__mocks__/next-intl.tsx',
    '^next-intl/routing$': '<rootDir>/tests/__mocks__/next-intl-routing.tsx',
    '^next-intl/navigation$': '<rootDir>/tests/__mocks__/next-intl-navigation.tsx',
    '^@/components/i18n$': '<rootDir>/tests/__mocks__/components-i18n.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-syntax-highlighter|refractor|hastscript|hast-.*|unist-.*|property-information|space-separated-tokens|comma-separated-tokens|web-namespaces|next-intl|use-intl)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/lib/api/generated/**', // Auto-generated API client - do not test
    '!src/lib/api/client-config.ts', // Integration glue for generated client - covered by E2E
    '!src/lib/api/hooks/**', // React Query hooks - tested in E2E (require API mocking)
    '!src/**/*.old.{js,jsx,ts,tsx}', // Old implementation files
    '!src/components/ui/**', // shadcn/ui components - third-party, no need to test
    '!src/app/**/layout.{js,jsx,ts,tsx}', // Layout files - complex Next.js-specific behavior (test in E2E)
    '!src/app/dev/**', // Dev pages - development tools, not production code
    '!src/app/**/error.{js,jsx,ts,tsx}', // Error boundaries - tested in E2E
    '!src/app/**/loading.{js,jsx,ts,tsx}', // Loading states - tested in E2E
    '!src/**/index.{js,jsx,ts,tsx}', // Re-export index files - no logic to test
    '!src/lib/utils/cn.ts', // Simple utility function from shadcn
    '!src/middleware.ts', // middleware.ts - no logic to test
    '!src/mocks/**', // MSW mock data (demo mode only, not production code)
    '!src/components/providers/MSWProvider.tsx', // MSW provider - demo mode only
    '!src/components/demo/**', // Demo mode UI components - demo mode only
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
