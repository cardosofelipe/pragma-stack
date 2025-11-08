# E2E Coverage Integration Guide

This guide explains how to collect and merge E2E test coverage with unit test coverage to get a comprehensive view of your test coverage.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Approach 1: V8 Coverage (Recommended)](#approach-1-v8-coverage-recommended)
4. [Approach 2: Istanbul Instrumentation](#approach-2-istanbul-instrumentation)
5. [Combined Coverage Workflow](#combined-coverage-workflow)
6. [Integration Steps](#integration-steps)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Overview

### Why Combined Coverage?

Your project uses a **dual testing strategy**:

- **Jest (Unit tests):** 97%+ coverage, excludes browser-specific code
- **Playwright (E2E tests):** Tests excluded files (layouts, API hooks, error boundaries)

**Combined coverage** shows the full picture by merging both coverage sources.

### Current Exclusions from Jest

```javascript
// From jest.config.js - These ARE tested by E2E:
'!src/lib/api/hooks/**',        // React Query hooks
'!src/app/**/layout.tsx',        // Next.js layouts
'!src/app/**/error.tsx',         // Error boundaries
'!src/app/**/loading.tsx',       // Loading states
```

### Expected Results

```
Unit test coverage:     97.19% (excluding above)
E2E coverage:          ~25-35% (user flows + excluded files)
Combined coverage:     98-100% ✅
```

---

## Quick Start

### Prerequisites

All infrastructure is already created! Just need dependencies:

```bash
# Option 1: V8 Coverage (Chromium only, no instrumentation)
npm install -D v8-to-istanbul istanbul-lib-coverage istanbul-lib-report istanbul-reports

# Option 2: Istanbul Instrumentation (all browsers)
npm install -D @istanbuljs/nyc-config-typescript babel-plugin-istanbul nyc \
               istanbul-lib-coverage istanbul-lib-report istanbul-reports
```

### Add Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "coverage:convert": "tsx scripts/convert-v8-to-istanbul.ts",
    "coverage:merge": "tsx scripts/merge-coverage.ts",
    "coverage:combined": "npm run test:coverage && E2E_COVERAGE=true npm run test:e2e && npm run coverage:convert && npm run coverage:merge",
    "coverage:view": "open coverage-combined/index.html"
  }
}
```

### Run Combined Coverage

```bash
# Full workflow (unit + E2E + merge)
npm run coverage:combined

# View HTML report
npm run coverage:view
```

---

## Approach 1: V8 Coverage (Recommended)

### Pros & Cons

**Pros:**
- ✅ Native browser coverage (most accurate)
- ✅ No build instrumentation needed (faster)
- ✅ Works with source maps
- ✅ Zero performance overhead

**Cons:**
- ❌ Chromium only (V8 engine specific)
- ❌ Requires v8-to-istanbul conversion

### Setup Steps

#### 1. Install Dependencies

```bash
npm install -D v8-to-istanbul istanbul-lib-coverage istanbul-lib-report istanbul-reports
```

#### 2. Integrate into E2E Tests

Update your E2E test files to use coverage helpers:

```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';
import { withCoverage } from './helpers/coverage';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start coverage collection
    await withCoverage.start(page);
    await page.goto('/');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Stop and save coverage
    await withCoverage.stop(page, testInfo.title);
  });

  test('displays header', async ({ page }) => {
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
```

#### 3. Run E2E Tests with Coverage

```bash
E2E_COVERAGE=true npm run test:e2e
```

This generates: `coverage-e2e/raw/*.json` (V8 format)

#### 4. Convert V8 to Istanbul

```bash
npm run coverage:convert
```

This converts to: `coverage-e2e/.nyc_output/e2e-coverage.json` (Istanbul format)

#### 5. Merge with Jest Coverage

```bash
npm run coverage:merge
```

This generates: `coverage-combined/index.html`

---

## Approach 2: Istanbul Instrumentation

### Pros & Cons

**Pros:**
- ✅ Works on all browsers (Firefox, Safari, etc.)
- ✅ Industry standard tooling
- ✅ No conversion needed

**Cons:**
- ❌ Requires code instrumentation (slower builds)
- ❌ More complex setup
- ❌ Slight test performance overhead

### Setup Steps

#### 1. Install Dependencies

```bash
npm install -D @istanbuljs/nyc-config-typescript babel-plugin-istanbul \
               nyc istanbul-lib-coverage istanbul-lib-report istanbul-reports \
               @babel/core babel-loader
```

#### 2. Configure Babel Instrumentation

Create `.babelrc.js`:

```javascript
module.exports = {
  presets: ['next/babel'],
  env: {
    test: {
      plugins: [
        process.env.E2E_COVERAGE && 'istanbul'
      ].filter(Boolean)
    }
  }
};
```

#### 3. Configure Next.js Webpack

Update `next.config.js`:

```javascript
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add Istanbul instrumentation in E2E coverage mode
    if (process.env.E2E_COVERAGE && !isServer) {
      config.module.rules.push({
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            plugins: ['istanbul'],
          },
        },
      });
    }
    return config;
  },
};

module.exports = nextConfig;
```

#### 4. Integrate into E2E Tests

Use the Istanbul helper instead:

```typescript
import { test, expect } from '@playwright/test';
import { saveIstanbulCoverage } from './helpers/coverage';

test.describe('Homepage Tests', () => {
  test.afterEach(async ({ page }, testInfo) => {
    await saveIstanbulCoverage(page, testInfo.title);
  });

  test('my test', async ({ page }) => {
    await page.goto('/');
    // Test code...
  });
});
```

#### 5. Run Tests

```bash
# Start dev server with instrumentation
E2E_COVERAGE=true npm run dev

# In another terminal, run E2E tests
E2E_COVERAGE=true npm run test:e2e
```

#### 6. Merge Coverage

```bash
npm run coverage:merge
```

No conversion step needed! Istanbul coverage goes directly to `.nyc_output/`.

---

## Combined Coverage Workflow

### Full Workflow Diagram

```
┌─────────────────────┐
│  Jest Unit Tests    │
│  npm run test:cov   │
└──────────┬──────────┘
           │
           v
     coverage/coverage-final.json
           │
           ├─────────────────────┐
           │                     │
           v                     v
    ┌─────────────────┐   ┌──────────────────┐
    │  E2E Tests      │   │  E2E Tests       │
    │  (V8 Coverage)  │   │  (Istanbul)      │
    └────────┬────────┘   └────────┬─────────┘
             │                     │
             v                     v
    coverage-e2e/raw/*.json   coverage-e2e/.nyc_output/*.json
             │                     │
             v                     │
    scripts/convert-v8-to-istanbul.ts
             │                     │
             v                     │
    coverage-e2e/.nyc_output/e2e-coverage.json
             │                     │
             └──────────┬──────────┘
                        v
             scripts/merge-coverage.ts
                        │
                        v
              coverage-combined/
              ├── index.html
              ├── lcov.info
              └── coverage-final.json
```

### Commands Summary

```bash
# 1. Run unit tests with coverage
npm run test:coverage

# 2. Run E2E tests with coverage
E2E_COVERAGE=true npm run test:e2e

# 3. Convert V8 to Istanbul (if using V8 approach)
npm run coverage:convert

# 4. Merge all coverage
npm run coverage:merge

# 5. View combined report
npm run coverage:view

# OR: Do all at once
npm run coverage:combined
```

---

## Integration Steps

### Phase 1: Pilot Integration (Single Test File)

Start with one E2E test file to verify the setup:

**File: `e2e/homepage.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { withCoverage } from './helpers/coverage';

test.describe('Homepage - Desktop Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await withCoverage.start(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }, testInfo) => {
    await withCoverage.stop(page, testInfo.title);
  });

  test('should display header with logo and navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: /FastNext/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Components' })).toBeVisible();
  });
});
```

**Test the pilot:**

```bash
# Install dependencies
npm install -D v8-to-istanbul istanbul-lib-coverage istanbul-lib-report istanbul-reports

# Run single test with coverage
E2E_COVERAGE=true npx playwright test homepage.spec.ts

# Verify coverage files created
ls coverage-e2e/raw/

# Convert and merge
npm run coverage:convert
npm run coverage:merge

# Check results
npm run coverage:view
```

### Phase 2: Rollout to All Tests

Once pilot works, update all 15 E2E spec files:

**Automated rollout script:**

```bash
# Create a helper script: scripts/add-coverage-to-tests.sh
#!/bin/bash

for file in e2e/*.spec.ts; do
  # Add import at top (if not already present)
  if ! grep -q "import.*coverage" "$file"; then
    sed -i "1i import { withCoverage } from './helpers/coverage';" "$file"
  fi

  # Add beforeEach hook (manual review recommended)
  echo "Updated: $file"
done
```

**Or manually add to each file:**

1. Import coverage helper
2. Add `beforeEach` with `withCoverage.start(page)`
3. Add `afterEach` with `withCoverage.stop(page, testInfo.title)`

### Phase 3: CI/CD Integration

Add to your CI pipeline (e.g., `.github/workflows/test.yml`):

```yaml
- name: Run E2E tests with coverage
  run: E2E_COVERAGE=true npm run test:e2e

- name: Convert E2E coverage
  run: npm run coverage:convert

- name: Merge coverage
  run: npm run coverage:merge

- name: Upload combined coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage-combined/lcov.info
    flags: combined
```

---

## Troubleshooting

### Problem: No coverage files generated

**Symptoms:**
```bash
npm run coverage:convert
# ❌ No V8 coverage found at: coverage-e2e/raw
```

**Solutions:**
1. Verify `E2E_COVERAGE=true` is set when running tests
2. Check coverage helpers are imported: `import { withCoverage } from './helpers/coverage'`
3. Verify `beforeEach` and `afterEach` hooks are added
4. Check browser console for errors during test run

### Problem: V8 conversion fails

**Symptoms:**
```bash
npm run coverage:convert
# ❌ v8-to-istanbul not installed
```

**Solution:**
```bash
npm install -D v8-to-istanbul
```

### Problem: Coverage lower than expected

**Symptoms:**
```
Combined: 85% (expected 99%)
```

**Causes & Solutions:**

1. **E2E tests don't trigger all code paths**
   - Check which files are E2E-only: `npm run coverage:merge` shows breakdown
   - Add more E2E tests for uncovered scenarios

2. **Source maps not working**
   - Verify Next.js generates source maps: check `next.config.js`
   - Istanbul needs source maps to map coverage back to source

3. **Wrong files included**
   - Check `.nycrc.json` includes correct patterns
   - Verify excluded files match between Jest and NYC configs

### Problem: Istanbul coverage is empty

**Symptoms:**
```typescript
await saveIstanbulCoverage(page, testName);
// ⚠️  No Istanbul coverage found
```

**Solutions:**
1. Verify `babel-plugin-istanbul` is configured
2. Check `window.__coverage__` exists:
   ```typescript
   const hasCoverage = await page.evaluate(() => !!(window as any).__coverage__);
   console.log('Istanbul available:', hasCoverage);
   ```
3. Ensure dev server started with `E2E_COVERAGE=true npm run dev`

### Problem: Merge script fails

**Symptoms:**
```bash
npm run coverage:merge
# ❌ Error: Cannot find module 'istanbul-lib-coverage'
```

**Solution:**
```bash
npm install -D istanbul-lib-coverage istanbul-lib-report istanbul-reports
```

---

## FAQ

### Q: Should I use V8 or Istanbul coverage?

**A: V8 coverage (Approach 1)** if:
- ✅ You only test in Chromium
- ✅ You want zero instrumentation overhead
- ✅ You want the most accurate coverage

**Istanbul (Approach 2)** if:
- ✅ You need cross-browser coverage
- ✅ You already use Istanbul tooling
- ✅ You need complex coverage transformations

### Q: Do I need to remove Jest exclusions?

**A: No!** Keep them. The `.nycrc.json` config handles combined coverage independently.

### Q: Will this slow down my tests?

**V8 Approach:** Minimal overhead (~5% slower)
**Istanbul Approach:** Moderate overhead (~15-20% slower due to instrumentation)

### Q: Can I run coverage only for specific tests?

**Yes:**
```bash
# Single file
E2E_COVERAGE=true npx playwright test homepage.spec.ts

# Specific describe block
E2E_COVERAGE=true npx playwright test --grep "Mobile Menu"
```

### Q: How do I exclude files from E2E coverage?

Edit `.nycrc.json` and add to `exclude` array:

```json
{
  "exclude": [
    "src/app/dev/**",
    "src/lib/utils/debug.ts"
  ]
}
```

### Q: Can I see which lines are covered by E2E vs Unit tests?

Not directly in the HTML report, but you can:

1. Generate separate reports:
   ```bash
   npx nyc report --reporter=html --report-dir=coverage-unit --temp-dir=coverage/.nyc_output
   npx nyc report --reporter=html --report-dir=coverage-e2e-only --temp-dir=coverage-e2e/.nyc_output
   ```

2. Compare the two reports to see differences

### Q: What's the performance impact on CI?

Typical impact:
- V8 coverage: +2-3 minutes (conversion time)
- Istanbul coverage: +5-7 minutes (build instrumentation)
- Merge step: ~10 seconds

Total CI time increase: **3-8 minutes**

---

## Next Steps

### After Phase 1 (Infrastructure - DONE ✅)

You've completed:
- ✅ `.nycrc.json` configuration
- ✅ Merge script (`scripts/merge-coverage.ts`)
- ✅ Conversion script (`scripts/convert-v8-to-istanbul.ts`)
- ✅ Coverage helpers (`e2e/helpers/coverage.ts`)
- ✅ This documentation

### Phase 2: Activation (When Ready)

1. **Install dependencies:**
   ```bash
   npm install -D v8-to-istanbul istanbul-lib-coverage istanbul-lib-report istanbul-reports
   ```

2. **Add package.json scripts** (see Quick Start)

3. **Test with one E2E file** (homepage.spec.ts recommended)

4. **Rollout to all E2E tests**

5. **Add to CI/CD pipeline**

### Expected Timeline

- **Phase 1:** ✅ Done (non-disruptive infrastructure)
- **Phase 2:** ~1-2 hours (pilot + dependency installation)
- **Rollout:** ~30 minutes (add hooks to 15 test files)
- **CI integration:** ~20 minutes

---

## Additional Resources

- [Istanbul Coverage](https://istanbul.js.org/)
- [NYC Configuration](https://github.com/istanbuljs/nyc#configuration-files)
- [Playwright Coverage](https://playwright.dev/docs/api/class-coverage)
- [V8 to Istanbul](https://github.com/istanbuljs/v8-to-istanbul)

---

**Questions or issues?** Check troubleshooting section or review the example in `e2e/helpers/coverage.ts`.
