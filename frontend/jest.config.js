const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/lib/api/generated/**', // Auto-generated API client - do not test
    '!src/lib/api/client.ts', // TODO: Replace with generated client + thin interceptor wrapper
    '!src/lib/api/errors.ts', // TODO: Remove - error parsing should be in generated client
    '!src/**/*.old.{js,jsx,ts,tsx}', // Old implementation files
    '!src/components/ui/**', // shadcn/ui components - third-party, no need to test
    '!src/app/**', // Next.js app directory - layout/page files (test in E2E)
    '!src/**/index.{js,jsx,ts,tsx}', // Re-export index files - no logic to test
    '!src/lib/utils/cn.ts', // Simple utility function from shadcn
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
