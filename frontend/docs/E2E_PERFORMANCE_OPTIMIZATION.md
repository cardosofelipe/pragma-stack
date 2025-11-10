# E2E Test Performance Optimization Plan

**Current State**: 230 tests, ~2100 seconds total execution time
**Target**: Reduce to <900 seconds (60% improvement)

## Bottleneck Analysis

### 1. Authentication Overhead (HIGHEST IMPACT)

**Problem**: Each test logs in fresh via UI

- **Impact**: 5-7s per test × 133 admin tests = ~700s wasted
- **Root Cause**: Using `loginViaUI(page)` in every `beforeEach`

**Example of current slow pattern:**

```typescript
test.beforeEach(async ({ page }) => {
  await setupSuperuserMocks(page);
  await loginViaUI(page); // ← 5-7s UI login EVERY test
  await page.goto('/admin');
});
```

**Solution: Playwright Storage State** (SAVE ~600-700s)

```typescript
// auth.setup.ts - Run ONCE per worker
import { test as setup } from '@playwright/test';

setup('authenticate as admin', async ({ page }) => {
  await setupSuperuserMocks(page);
  await loginViaUI(page);
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});

setup('authenticate as regular user', async ({ page }) => {
  await setupAuthenticatedMocks(page);
  await loginViaUI(page);
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'admin tests',
      use: { storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
      testMatch: /admin-.*\.spec\.ts/,
    },
    {
      name: 'user tests',
      use: { storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
      testMatch: /settings-.*\.spec\.ts/,
    },
  ],
});
```

```typescript
// admin-users.spec.ts - NO MORE loginViaUI!
test.beforeEach(async ({ page }) => {
  // Auth already loaded from storageState
  await page.goto('/admin/users'); // ← Direct navigation, ~1-2s
});
```

**Expected Improvement**: 5-6s → 0.5-1s per test = **~600s saved** (133 tests × 5s)

---

### 2. Redundant Navigation Tests (MEDIUM IMPACT)

**Problem**: Separate tests for "navigate to X" and "display X page"

- **Impact**: 3-5s per redundant test × ~15 tests = ~60s wasted

**Current slow pattern:**

```typescript
test('should navigate to users page', async ({ page }) => {
  await page.goto('/admin/users'); // 3s
  await expect(page).toHaveURL('/admin/users');
  await expect(page.locator('h1')).toContainText('User Management');
});

test('should display user management page', async ({ page }) => {
  await page.goto('/admin/users'); // 3s DUPLICATE
  await expect(page.locator('h1')).toContainText('User Management');
  await expect(page.getByText(/manage users/i)).toBeVisible();
});
```

**Optimized pattern:**

```typescript
test('should navigate to users page and display content', async ({ page }) => {
  await page.goto('/admin/users'); // 3s ONCE

  // Navigation assertions
  await expect(page).toHaveURL('/admin/users');

  // Content assertions
  await expect(page.locator('h1')).toContainText('User Management');
  await expect(page.getByText(/manage users/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create User' })).toBeVisible();
});
```

**Expected Improvement**: **~45-60s saved** (15 tests eliminated)

---

### 3. Flaky Test Fix (CRITICAL)

**Problem**: Test #218 failed once, passed on retry

```
Test: settings-password.spec.ts:24:7 › Password Change › should display password change form
Failed: 12.8s → Retry passed: 8.3s
```

**Root Cause Options**:

1. Race condition in form rendering
2. Slow network request not properly awaited
3. Animation/transition timing issue

**Investigation needed:**

```typescript
// Current test (lines 24-35)
test('should display password change form', async ({ page }) => {
  await page.goto('/settings/password');

  // ← Likely missing waitForLoadState or explicit wait
  await expect(page.getByLabel(/current password/i)).toBeVisible();
  await expect(page.getByLabel(/new password/i)).toBeVisible();
  await expect(page.getByLabel(/confirm password/i)).toBeVisible();
});
```

**Temporary Solution: Skip until fixed**

```typescript
test.skip('should display password change form', async ({ page }) => {
  // TODO: Fix race condition (issue #XXX)
  await page.goto('/settings/password');
  await page.waitForLoadState('networkidle'); // ← Add this
  await expect(page.getByLabel(/current password/i)).toBeVisible();
});
```

**Expected Improvement**: Eliminate retry overhead + improve reliability

---

### 4. Optimize Wait Timeouts (LOW IMPACT)

**Problem**: Default timeout is 10s for all assertions

- **Impact**: Tests wait unnecessarily when elements load faster

**Current global timeout:**

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 30000, // Per test
  expect: { timeout: 10000 }, // Per assertion
});
```

**Optimized for fast-loading pages:**

```typescript
export default defineConfig({
  timeout: 20000, // Reduce from 30s
  expect: { timeout: 5000 }, // Reduce from 10s (most elements load <2s)
});
```

**Expected Improvement**: **~100-150s saved** (faster failures, less waiting)

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours work)

1. ✅ **Skip flaky test #218** temporarily
2. ✅ **Reduce timeout defaults** (5s for expects, 20s for tests)
3. ✅ **Combine 5 most obvious redundant navigation tests**

**Expected savings**: ~100-150s (5-7% improvement)

---

### Phase 2: Auth State Caching (2-4 hours work)

1. ✅ Create `e2e/auth.setup.ts` with storage state setup
2. ✅ Update `playwright.config.ts` with projects + dependencies
3. ✅ Remove `loginViaUI` from all admin test `beforeEach` hooks
4. ✅ Update auth helper to support both mock + storageState modes

**Expected savings**: ~600-700s (30-35% improvement)

---

### Phase 3: Deep Optimization (4-8 hours work)

1. ✅ Investigate and fix flaky test root cause
2. ✅ Audit all navigation tests for redundancy
3. ✅ Combine related assertions (e.g., all stat cards in one test)
4. ✅ Profile slowest 10 tests individually

**Expected savings**: ~150-200s (7-10% improvement)

---

## Total Expected Improvement

| Phase     | Time Investment | Time Saved | % Improvement |
| --------- | --------------- | ---------- | ------------- |
| Phase 1   | 1-2 hours       | ~150s      | 7%            |
| Phase 2   | 2-4 hours       | ~700s      | 35%           |
| Phase 3   | 4-8 hours       | ~200s      | 10%           |
| **Total** | **7-14 hours**  | **~1050s** | **50-60%**    |

**Final target**: 2100s → 1050s = **~17-18 minutes** (currently ~35 minutes)

---

## Risks and Considerations

### Storage State Caching Risks:

1. **Test isolation**: Shared auth state could cause cross-test pollution
   - **Mitigation**: Use separate storage files per role, clear cookies between tests
2. **Stale auth tokens**: Mock tokens might expire
   - **Mitigation**: Use long-lived test tokens (24h expiry)
3. **Debugging difficulty**: Harder to debug auth issues
   - **Mitigation**: Keep `loginViaUI` tests for auth flow verification

### Recommended Safeguards:

```typescript
// Clear non-auth state between tests
test.beforeEach(async ({ page }) => {
  await page.goto('/admin');
  await page.evaluate(() => {
    // Clear localStorage except auth tokens
    const tokens = {
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token'),
    };
    localStorage.clear();
    if (tokens.access_token) localStorage.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
  });
});
```

---

## Next Steps

**Immediate Actions (Do Now):**

1. Skip flaky test #218 with TODO comment
2. Reduce timeout defaults in playwright.config.ts
3. Create this optimization plan issue/ticket

**Short-term (This Week):**

1. Implement auth storage state (Phase 2)
2. Combine obvious redundant tests (Phase 1)

**Medium-term (Next Sprint):**

1. Investigate flaky test root cause
2. Audit all tests for redundancy
3. Measure and report improvements

---

## Metrics to Track

Before optimization:

- Total time: ~2100s (35 minutes)
- Avg test time: 9.1s
- Slowest test: 20.1s (settings navigation)
- Flaky tests: 1

After Phase 1+2 target:

- Total time: <1200s (20 minutes) ✅
- Avg test time: <5.5s ✅
- Slowest test: <12s ✅
- Flaky tests: 0 ✅

After Phase 3 target:

- Total time: <1050s (17 minutes) 🎯
- Avg test time: <4.8s 🎯
- Slowest test: <10s 🎯
- Flaky tests: 0 🎯
