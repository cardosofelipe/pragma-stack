# MSW Auto-Generation from OpenAPI

## Overview

MSW (Mock Service Worker) handlers are **automatically generated** from your OpenAPI specification, ensuring perfect synchronization between your backend API and demo mode.

## Architecture

```
Backend API Changes
  ↓
npm run generate:api
  ↓
┌─────────────────────────────────────┐
│  1. Fetches OpenAPI spec            │
│  2. Generates TypeScript API client │
│  3. Generates MSW handlers          │
└─────────────────────────────────────┘
  ↓
src/mocks/handlers/
├── generated.ts    (AUTO-GENERATED - DO NOT EDIT)
├── overrides.ts    (CUSTOM LOGIC - EDIT AS NEEDED)
└── index.ts        (MERGES BOTH)
```

## How It Works

### 1. Automatic Generation

When you run:

```bash
npm run generate:api
```

The system:

1. Fetches `/api/v1/openapi.json` from backend
2. Generates TypeScript API client (`src/lib/api/generated/`)
3. **NEW:** Generates MSW handlers (`src/mocks/handlers/generated.ts`)

### 2. Generated Handlers

The generator (`scripts/generate-msw-handlers.ts`) creates handlers with:

**Smart Response Logic:**

- **Auth endpoints** → Use `validateCredentials()` and `setCurrentUser()`
- **User endpoints** → Use `currentUser` and mock data
- **Admin endpoints** → Check `is_superuser` + return paginated data
- **Generic endpoints** → Return success response

**Example Generated Handler:**

```typescript
/**
 * Login
 */
http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request, params }) => {
  await delay(NETWORK_DELAY);

  const body = (await request.json()) as any;
  const user = validateCredentials(body.email, body.password);

  if (!user) {
    return HttpResponse.json(
      { detail: 'Incorrect email or password' },
      { status: 401 }
    );
  }

  const accessToken = `demo-access-${user.id}-${Date.now()}`;
  const refreshToken = `demo-refresh-${user.id}-${Date.now()}`;

  setCurrentUser(user);

  return HttpResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: 900,
  });
}),
```

### 3. Custom Overrides

For complex logic that can't be auto-generated, use `overrides.ts`:

```typescript
// src/mocks/handlers/overrides.ts

export const overrideHandlers = [
  // Example: Simulate rate limiting
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    // 10% chance of rate limit
    if (Math.random() < 0.1) {
      return HttpResponse.json({ detail: 'Too many login attempts' }, { status: 429 });
    }
    // Fall through to generated handler
  }),

  // Example: Complex validation
  http.post(`${API_BASE_URL}/api/v1/users`, async ({ request }) => {
    const body = await request.json();

    // Custom validation logic
    if (body.email.endsWith('@blocked.com')) {
      return HttpResponse.json({ detail: 'Email domain not allowed' }, { status: 400 });
    }

    // Fall through to generated handler
  }),
];
```

**Override Precedence:**
Overrides are applied FIRST, so they take precedence over generated handlers.

## Benefits

### ✅ Zero Manual Work

**Before:**

```bash
# Backend adds new endpoint
# 1. Run npm run generate:api
# 2. Manually add MSW handler
# 3. Test demo mode
# 4. Fix bugs
# 5. Repeat for every endpoint change
```

**After:**

```bash
# Backend adds new endpoint
npm run generate:api  # Done! MSW auto-synced
```

### ✅ Always In Sync

- OpenAPI spec is single source of truth
- Generator reads same spec as API client
- Impossible to have mismatched endpoints
- New endpoints automatically available in demo mode

### ✅ Type-Safe

```typescript
// Generated handlers use your mock data
import { validateCredentials, currentUser } from '../data/users';
import { sampleOrganizations } from '../data/organizations';
import { adminStats } from '../data/stats';

// Everything is typed!
```

### ✅ Batteries Included

Generated handlers include:

- ✅ Network delays (300ms - realistic UX)
- ✅ Auth checks (401/403 responses)
- ✅ Pagination support
- ✅ Path parameters
- ✅ Request body parsing
- ✅ Proper HTTP methods

## File Structure

```
frontend/
├── scripts/
│   ├── generate-api-client.sh       # Main generation script
│   └── generate-msw-handlers.ts     # MSW handler generator
│
├── src/
│   ├── lib/api/generated/           # Auto-generated API client
│   │   ├── client.gen.ts
│   │   ├── sdk.gen.ts
│   │   └── types.gen.ts
│   │
│   └── mocks/
│       ├── browser.ts               # MSW setup
│       ├── data/                    # Mock data (EDIT THESE)
│       │   ├── users.ts
│       │   ├── organizations.ts
│       │   └── stats.ts
│       └── handlers/
│           ├── generated.ts         # ⚠️  AUTO-GENERATED
│           ├── overrides.ts         # ✅ EDIT FOR CUSTOM LOGIC
│           └── index.ts             # Merges both
```

## Workflow

### Adding New Backend Endpoint

1. **Add endpoint to backend** (FastAPI route)
2. **Regenerate clients:**
   ```bash
   cd frontend
   npm run generate:api
   ```
3. **Test demo mode:**
   ```bash
   NEXT_PUBLIC_DEMO_MODE=true npm run dev
   ```
4. **Done!** New endpoint automatically works in demo mode

### Customizing Handler Behavior

If generated handler doesn't fit your needs:

1. **Add override** in `src/mocks/handlers/overrides.ts`
2. **Keep generated handler** (don't edit `generated.ts`)
3. **Override takes precedence** automatically

Example:

```typescript
// overrides.ts
export const overrideHandlers = [
  // Override auto-generated login to add 2FA simulation
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const body = await request.json();

    // Simulate 2FA requirement for admin users
    if (body.email.includes('admin') && !body.two_factor_code) {
      return HttpResponse.json({ detail: 'Two-factor authentication required' }, { status: 403 });
    }

    // Fall through to generated handler
  }),
];
```

### Updating Mock Data

Mock data is separate from handlers:

```typescript
// src/mocks/data/users.ts
export const demoUser: UserResponse = {
  id: 'demo-user-id-1',
  email: 'demo@example.com',
  first_name: 'Demo',
  last_name: 'User',
  // ... add more fields as backend evolves
};
```

**To update:**

1. Edit `data/*.ts` files
2. Handlers automatically use updated data
3. No regeneration needed!

## Generator Internals

The generator (`scripts/generate-msw-handlers.ts`) does:

1. **Parse OpenAPI spec**

   ```typescript
   const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
   ```

2. **For each endpoint:**
   - Convert path params: `{id}` → `:id`
   - Determine handler category (auth/users/admin)
   - Generate appropriate mock response
   - Add network delay
   - Include error handling

3. **Write generated file:**
   ```typescript
   fs.writeFileSync('src/mocks/handlers/generated.ts', handlerCode);
   ```

## Troubleshooting

### Generated handler doesn't work

**Check:**

1. Is backend running? (`npm run generate:api` requires backend)
2. Check console for `[MSW]` warnings
3. Verify `generated.ts` exists and has your endpoint
4. Check path parameters match exactly

**Debug:**

```bash
# See what endpoints were generated
cat src/mocks/handlers/generated.ts | grep "http\."
```

### Need custom behavior

**Don't edit `generated.ts`!** Use overrides instead:

```typescript
// overrides.ts
export const overrideHandlers = [
  http.post(`${API_BASE_URL}/your/endpoint`, async ({ request }) => {
    // Your custom logic
  }),
];
```

### Regeneration fails

```bash
# Manual regeneration
cd frontend
curl -s http://localhost:8000/api/v1/openapi.json > /tmp/openapi.json
npx tsx scripts/generate-msw-handlers.ts /tmp/openapi.json
```

## Best Practices

### ✅ Do

- Run `npm run generate:api` after backend changes
- Use `overrides.ts` for complex logic
- Keep mock data in `data/` files
- Test demo mode regularly
- Commit `overrides.ts` to git

### ❌ Don't

- Don't edit `generated.ts` manually (changes will be overwritten)
- Don't commit `generated.ts` to git (it's auto-generated)
- Don't duplicate logic between overrides and generated
- Don't skip regeneration after API changes

## Advanced: Generator Customization

Want to customize the generator itself?

Edit `scripts/generate-msw-handlers.ts`:

```typescript
function generateMockResponse(path: string, method: string, operation: any): string {
  // Your custom generation logic

  if (path.includes('/your-special-endpoint')) {
    return `
    // Your custom handler code
    `;
  }

  // ... rest of generation logic
}
```

## Comparison

### Before (Manual)

```typescript
// Had to manually write this for EVERY endpoint:
http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
  // 50 lines of code...
}),

http.get(`${API_BASE_URL}/api/v1/users/me`, async ({ request }) => {
  // 30 lines of code...
}),

// ... repeat for 31+ endpoints
// ... manually update when backend changes
// ... easy to forget endpoints
// ... prone to bugs
```

### After (Automated)

```bash
npm run generate:api  # Done! All 31+ endpoints handled automatically
```

**Manual Code: 1500+ lines**
**Automated: 1 command**
**Time Saved: Hours per API change**
**Bugs: Near zero (generated from spec)**

---

## See Also

- [DEMO_MODE.md](./DEMO_MODE.md) - Complete demo mode guide
- [API_INTEGRATION.md](./API_INTEGRATION.md) - API client docs

## Summary

**This template is batteries-included.**
Your API client and MSW handlers stay perfectly synchronized with zero manual work.
Just run `npm run generate:api` and everything updates automatically.

That's the power of OpenAPI + automation! 🚀
