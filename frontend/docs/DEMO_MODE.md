# Demo Mode Documentation

## Overview

Demo Mode allows you to run the frontend without a backend by using **Mock Service Worker (MSW)** to intercept and mock all API calls. This is perfect for:

- **Free deployment** on Vercel (no backend costs)
- **Portfolio showcasing** with live, interactive demos
- **Client presentations** without infrastructure setup
- **Development** when backend is unavailable

## Architecture

```
┌─────────────────┐
│  Your Component │
│                 │
│  login({...})   │  ← Same code in all modes
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│   API Client       │
│   (Axios)          │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Decision Point (Automatic)                │
│                                            │
│  DEMO_MODE=true?                           │
│    → MSW intercepts request                │
│    → Returns mock data                     │
│    → Never touches network                 │
│                                            │
│  DEMO_MODE=false? (default)                │
│    → Request goes to real backend          │
│    → Normal HTTP to localhost:8000         │
│                                            │
│  Test environment?                         │
│    → MSW skipped automatically             │
│    → Jest uses existing mocks              │
│    → Playwright uses page.route()          │
└────────────────────────────────────────────┘
```

**Key Feature:** Your application code is completely unaware of demo mode. The same code works in dev, production, and demo environments.

## Quick Start

### Enable Demo Mode

**Development (local testing):**

```bash
cd frontend

# Create .env.local
echo "NEXT_PUBLIC_DEMO_MODE=true" > .env.local

# Start frontend only (no backend needed)
npm run dev

# Open http://localhost:3000
```

**Vercel Deployment:**

```bash
# Add environment variable in Vercel dashboard:
NEXT_PUBLIC_DEMO_MODE=true

# Deploy
vercel --prod
```

### Demo Credentials

When demo mode is active, use these credentials:

**Regular User:**

- Email: `demo@example.com`
- Password: `DemoPass123`
- Features: Dashboard, profile, organizations, sessions

**Admin User:**

- Email: `admin@example.com`
- Password: `AdminPass123`
- Features: Everything + admin panel, user management, statistics

## Mode Comparison

| Feature          | Development (Default)         | Demo Mode               | Full-Stack Demo                |
| ---------------- | ----------------------------- | ----------------------- | ------------------------------ |
| Frontend         | Real Next.js app              | Real Next.js app        | Real Next.js app               |
| Backend          | Real FastAPI (localhost:8000) | MSW (mocked in browser) | Real FastAPI with demo data    |
| Database         | Real PostgreSQL               | None (in-memory)        | Real PostgreSQL with seed data |
| Data Persistence | Yes                           | No (resets on reload)   | Yes                            |
| API Calls        | Real HTTP requests            | Intercepted by MSW      | Real HTTP requests             |
| Authentication   | JWT tokens                    | Mock tokens             | JWT tokens                     |
| Use Case         | Local development             | Frontend-only demos     | Full-stack showcasing          |
| Cost             | Free (local)                  | Free (Vercel)           | Backend hosting costs          |

## How It Works

### MSW Initialization

**1. Safe Guards**

MSW only starts when ALL conditions are met:

```typescript
const shouldStart =
  typeof window !== 'undefined' && // Browser (not SSR)
  process.env.NODE_ENV !== 'test' && // Not Jest
  !window.__PLAYWRIGHT_TEST__ && // Not Playwright
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true'; // Explicit opt-in
```

**2. Initialization Flow**

```
Page Load
  ↓
MSWProvider component mounts
  ↓
Check if demo mode enabled
  ↓
[Yes] → Initialize MSW service worker
      → Load request handlers
      → Start intercepting
      → Show demo banner
      → Render app
  ↓
[No] → Skip (normal mode)
     → Render app immediately
```

### Mock Data Structure

```
src/mocks/
├── browser.ts              # MSW setup & initialization
├── handlers/
│   ├── index.ts           # Export all handlers
│   ├── auth.ts            # Login, register, refresh
│   ├── users.ts           # Profile, sessions, organizations
│   └── admin.ts           # Admin panel, stats, management
├── data/
│   ├── users.ts           # Sample users (5+ users)
│   ├── organizations.ts   # Sample orgs (5+ orgs with members)
│   └── stats.ts           # Dashboard statistics
└── index.ts               # Main exports
```

### Request Handling

**Example: Login Flow**

```typescript
// 1. User submits login form
await login({
  body: {
    email: 'demo@example.com',
    password: 'DemoPass123',
  },
});

// 2. Axios makes POST request to /api/v1/auth/login

// 3a. Demo Mode: MSW intercepts
//     - Validates credentials against mock data
//     - Returns TokenResponse with mock tokens
//     - Updates in-memory user state
//     - No network request made

// 3b. Normal Mode: Request hits real backend
//     - Real database lookup
//     - Real JWT token generation
//     - Real session creation

// 4. App receives response (same shape in both modes)
// 5. Auth store updated
// 6. User redirected to dashboard
```

## Demo Mode Features

### Authentication

- ✅ Login with email/password
- ✅ Register new users (in-memory only)
- ✅ Password reset flow (simulated)
- ✅ Change password
- ✅ Token refresh
- ✅ Logout / logout all devices

### User Features

- ✅ View/edit profile
- ✅ View organizations
- ✅ Session management
- ✅ Account deletion (simulated)

### Admin Features

- ✅ Dashboard with statistics and charts
- ✅ User management (list, create, edit, delete)
- ✅ Organization management
- ✅ Bulk actions
- ✅ Session monitoring

### Realistic Behavior

- ✅ Network delays (300ms simulated)
- ✅ Validation errors
- ✅ 401/403/404 responses
- ✅ Pagination
- ✅ Search/filtering

## Testing Compatibility

### Unit Tests (Jest)

**Status:** ✅ **Fully Compatible**

MSW never initializes during Jest tests:

- `process.env.NODE_ENV === 'test'` → MSW skipped
- Existing mocks continue to work
- 97%+ coverage maintained

```bash
npm test  # MSW will NOT interfere
```

### E2E Tests (Playwright)

**Status:** ✅ **Fully Compatible**

MSW never initializes during Playwright tests:

- `window.__PLAYWRIGHT_TEST__` flag detected → MSW skipped
- Playwright's `page.route()` mocking continues to work
- All E2E tests pass unchanged

```bash
npm run test:e2e  # MSW will NOT interfere
```

### Manual Testing in Demo Mode

```bash
# Enable demo mode
NEXT_PUBLIC_DEMO_MODE=true npm run dev

# Test flows:
# 1. Open http://localhost:3000
# 2. See orange demo banner at top
# 3. Login with demo@example.com / DemoPass123
# 4. Browse dashboard, profile, settings
# 5. Login with admin@example.com / AdminPass123
# 6. Browse admin panel
# 7. Check browser console for MSW logs
```

## Deployment Guides

### Vercel (Recommended for Demo)

**1. Fork Repository**

```bash
gh repo fork your-repo/fast-next-template
```

**2. Connect to Vercel**

- Go to vercel.com
- Import Git Repository
- Select your fork

**3. Configure Environment Variables**

```
# Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_NAME=My Demo App
```

**4. Deploy**

- Vercel auto-deploys on push
- Visit your deployment URL
- Demo banner should be visible
- Try logging in with demo credentials

**Cost:** Free (Hobby tier includes unlimited deployments)

### Netlify

```bash
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_PUBLIC_DEMO_MODE = "true"
```

### Static Export (GitHub Pages)

```bash
# Enable static export
# next.config.js
module.exports = {
  output: 'export',
}

# Build
NEXT_PUBLIC_DEMO_MODE=true npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Troubleshooting

### Demo Mode Not Starting

**Check 1: Environment Variable**

```bash
# Frontend terminal should show:
# NEXT_PUBLIC_DEMO_MODE=true

# If not, check .env.local exists
cat .env.local
```

**Check 2: Browser Console**

```javascript
// Open DevTools Console
// Should see:
// [MSW] Demo Mode Active
// [MSW] All API calls are mocked (no backend required)
// [MSW] Demo credentials: ...

// If not showing, check:
console.log(process.env.NEXT_PUBLIC_DEMO_MODE);
// Should print: "true"
```

**Check 3: Service Worker**

```javascript
// Open DevTools → Application → Service Workers
// Should see: mockServiceWorker.js (activated)
```

### MSW Intercepting During Tests

**Problem:** Tests fail with "Unexpected MSW behavior"

**Solution:** MSW has triple safety checks:

```typescript
// Check these conditions in browser console during tests:
console.log({
  isServer: typeof window === 'undefined', // Should be false
  isTest: process.env.NODE_ENV === 'test', // Should be true
  isPlaywright: window.__PLAYWRIGHT_TEST__, // Should be true (E2E)
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE, // Ignored if above are true
});
```

If MSW still runs during tests:

1. Clear service worker: DevTools → Application → Clear Storage
2. Restart test runner
3. Check for global environment pollution

### Missing Mock Data

**Problem:** API returns 404 in demo mode

**Solution:** Check if endpoint is mocked:

```bash
# Search for your endpoint in handlers
grep -r "your-endpoint" src/mocks/handlers/

# If not found, add to appropriate handler file
```

### Stale Data After Logout

**Problem:** User data persists after logout

**Cause:** In-memory state in demo mode

**Solution:** This is expected behavior. To reset:

- Refresh the page (Cmd/Ctrl + R)
- Or implement state reset in logout handler

## Advanced Usage

### Custom Mock Data

**Add your own users:**

```typescript
// src/mocks/data/users.ts

export const customUser: UserResponse = {
  id: 'custom-user-1',
  email: 'john@company.com',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true,
  is_superuser: false,
  // ... rest of fields
};

// Add to sampleUsers array
export const sampleUsers = [demoUser, demoAdmin, customUser];

// Update validateCredentials to accept your password
```

### Custom Error Scenarios

**Simulate specific errors:**

```typescript
// src/mocks/handlers/auth.ts

http.post('/api/v1/auth/login', async ({ request }) => {
  const body = await request.json();

  // Simulate rate limiting
  if (Math.random() < 0.1) {
    // 10% chance
    return HttpResponse.json({ detail: 'Too many login attempts' }, { status: 429 });
  }

  // Normal flow...
});
```

### Network Delay Simulation

**Adjust response times:**

```typescript
// src/mocks/handlers/auth.ts

const NETWORK_DELAY = 1000; // 1 second (slow network)
// or
const NETWORK_DELAY = 50; // 50ms (fast network)

http.post('/api/v1/auth/login', async ({ request }) => {
  await delay(NETWORK_DELAY);
  // ...
});
```

## FAQ

**Q: Will demo mode affect my production build?**
A: No. If `NEXT_PUBLIC_DEMO_MODE` is not set or is `false`, MSW code is imported but never initialized. The bundle size impact is minimal (~50KB), and tree-shaking removes unused code.

**Q: Can I use demo mode with backend?**
A: Yes! You can run both. MSW will intercept frontend calls, while backend runs separately. Useful for testing frontend in isolation.

**Q: How do I disable the demo banner?**
A: Click the X button, or set `NEXT_PUBLIC_DEMO_MODE=false`.

**Q: Can I use this for E2E testing instead of Playwright mocks?**
A: Not recommended. Playwright's `page.route()` is more reliable for E2E tests and provides better control over timing and responses.

**Q: What happens to data created in demo mode?**
A: It's stored in memory and lost on page reload. This is intentional for demo purposes.

**Q: Can I export demo data?**
A: Not built-in, but you can add a "Download Sample Data" button that exports mock data as JSON.

## Best Practices

### ✅ Do

- Use demo mode for showcasing and prototyping
- Keep mock data realistic and representative
- Test demo mode before deploying
- Display demo banner prominently
- Document demo credentials clearly
- Use for client presentations without infrastructure

### ❌ Don't

- Use demo mode for production with real users
- Store sensitive data in mock files
- Rely on demo mode for critical functionality
- Mix demo and production data
- Use demo mode for performance testing
- Expect data persistence across sessions

## Support & Contributing

**Issues:** If you find bugs or have suggestions, please open an issue.

**Adding Endpoints:** To add mock support for new endpoints:

1. Add mock data to `src/mocks/data/`
2. Create handler in `src/mocks/handlers/`
3. Export handler in `src/mocks/handlers/index.ts`
4. Test in demo mode
5. Document in this file

**Improving Mock Data:** To make demos more realistic:

1. Add more sample users/orgs in `src/mocks/data/`
2. Improve error scenarios in handlers
3. Add more edge cases (pagination, filtering, etc.)
4. Submit PR with improvements

## Related Documentation

- [API Integration](./API_INTEGRATION.md) - How API client works
- [Testing Guide](./TESTING.md) - Unit and E2E testing
- [Design System](./design-system/) - UI component guidelines

---

**Last Updated:** 2025-01-24
**MSW Version:** 2.x
**Maintainer:** Template Contributors
