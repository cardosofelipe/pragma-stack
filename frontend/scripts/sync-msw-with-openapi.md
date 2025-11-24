# Keeping MSW Handlers Synced with OpenAPI Spec

## Problem
MSW handlers can drift out of sync with the backend API as it evolves.

## Solution Options

### Option 1: Use openapi-msw (Recommended)

Install the package that auto-generates MSW handlers from OpenAPI:

```bash
npm install --save-dev openapi-msw
```

Then create a generation script:

```typescript
// scripts/generate-msw-handlers.ts
import { generateMockHandlers } from 'openapi-msw';
import fs from 'fs';

async function generate() {
  const spec = JSON.parse(fs.readFileSync('/tmp/openapi.json', 'utf-8'));

  const handlers = generateMockHandlers(spec, {
    baseUrl: 'http://localhost:8000',
  });

  fs.writeFileSync('src/mocks/handlers/generated.ts', handlers);
}

generate();
```

### Option 2: Manual Sync Checklist

When you add/change backend endpoints:

1. **Update Backend** → Make API changes
2. **Generate Frontend Client** → `npm run generate:api`
3. **Update MSW Handlers** → Edit `src/mocks/handlers/*.ts`
4. **Test Demo Mode** → `NEXT_PUBLIC_DEMO_MODE=true npm run dev`

### Option 3: Automated with Script Hook

Add to `package.json`:

```json
{
  "scripts": {
    "generate:api": "./scripts/generate-api-client.sh && npm run sync:msw",
    "sync:msw": "echo '⚠️  Don't forget to update MSW handlers in src/mocks/handlers/'"
  }
}
```

## Current Coverage

Our MSW handlers currently cover:

**Auth Endpoints:**
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/refresh`
- POST `/api/v1/auth/logout`
- POST `/api/v1/auth/logout-all`
- POST `/api/v1/auth/password-reset`
- POST `/api/v1/auth/password-reset/confirm`
- POST `/api/v1/auth/change-password`

**User Endpoints:**
- GET `/api/v1/users/me`
- PATCH `/api/v1/users/me`
- DELETE `/api/v1/users/me`
- GET `/api/v1/users/:id`
- GET `/api/v1/users`
- GET `/api/v1/organizations/me`
- GET `/api/v1/sessions`
- DELETE `/api/v1/sessions/:id`

**Admin Endpoints:**
- GET `/api/v1/admin/stats`
- GET `/api/v1/admin/users`
- GET `/api/v1/admin/users/:id`
- POST `/api/v1/admin/users`
- PATCH `/api/v1/admin/users/:id`
- DELETE `/api/v1/admin/users/:id`
- POST `/api/v1/admin/users/bulk`
- GET `/api/v1/admin/organizations`
- GET `/api/v1/admin/organizations/:id`
- GET `/api/v1/admin/organizations/:id/members`
- GET `/api/v1/admin/sessions`

## Quick Validation

To check if MSW is missing handlers:

1. Start demo mode: `NEXT_PUBLIC_DEMO_MODE=true npm run dev`
2. Open browser console
3. Look for `[MSW] Warning: intercepted a request without a matching request handler`
4. Add missing handlers to appropriate file in `src/mocks/handlers/`

## Best Practices

1. **Keep handlers simple** - Return happy path responses by default
2. **Match backend schemas** - Use generated TypeScript types
3. **Realistic delays** - Use `await delay(300)` for UX testing
4. **Document passwords** - Make demo credentials obvious
5. **Test regularly** - Run demo mode after API changes
