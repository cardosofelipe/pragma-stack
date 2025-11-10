import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends('next/core-web-vitals'),
  ...compat.extends('next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'src/lib/api/generated/**',
      '*.gen.ts',
      '*.gen.tsx',
    ],
  },
  {
    rules: {
      // Enforce Dependency Injection pattern for auth store
      // Components/hooks must use useAuth() from AuthContext, not useAuthStore directly
      // This ensures testability via DI (E2E mocks, unit test props)
      // Exception: Non-React contexts (client.ts) use dynamic import + __TEST_AUTH_STORE__ check
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/stores/authStore'],
              importNames: ['useAuthStore'],
              message:
                "Import useAuth from '@/lib/auth/AuthContext' instead. Direct authStore imports bypass dependency injection and break test mocking.",
            },
          ],
        },
      ],
    },
  },
];
