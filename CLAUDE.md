# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical User Preferences

### File Operations - NEVER Use Heredoc/Cat Append
**ALWAYS use Read/Write/Edit tools instead of `cat >> file << EOF` commands.**

This triggers manual approval dialogs and disrupts workflow.

```bash
# WRONG ❌
cat >> file.txt << EOF
content
EOF

# CORRECT ✅ - Use Read, then Write tools
```

### Work Style
- User prefers autonomous operation without frequent interruptions
- Ask for batch permissions upfront for long work sessions
- Work independently, document decisions clearly

## Project Architecture

This is a **FastAPI + Next.js full-stack application** with the following structure:

### Backend (FastAPI)
```
backend/app/
├── api/            # API routes organized by version
│   ├── routes/     # Endpoint implementations (auth, users, sessions, admin, organizations)
│   └── dependencies/ # FastAPI dependencies (auth, permissions)
├── core/           # Core functionality
│   ├── config.py   # Settings (Pydantic BaseSettings)
│   ├── database.py # SQLAlchemy async engine setup
│   ├── auth.py     # JWT token generation/validation
│   └── exceptions.py # Custom exception classes and handlers
├── crud/           # Database CRUD operations (base, user, session, organization)
├── models/         # SQLAlchemy ORM models
├── schemas/        # Pydantic request/response schemas
├── services/       # Business logic layer (auth_service)
└── utils/          # Utilities (security, device detection, test helpers)
```

### Frontend (Next.js 15)
```
frontend/src/
├── app/            # Next.js App Router pages
├── components/     # React components (auth/, ui/)
├── lib/
│   ├── api/        # API client (auto-generated from OpenAPI)
│   ├── stores/     # Zustand state management
│   └── utils/      # Utility functions
└── hooks/          # Custom React hooks
```

## Development Commands

### Backend

#### Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

#### Database Migrations
```bash
# Using the migration helper (preferred)
python migrate.py generate "migration message"  # Generate migration
python migrate.py apply                         # Apply migrations
python migrate.py auto "message"                # Generate and apply in one step
python migrate.py list                          # List all migrations
python migrate.py current                       # Show current revision
python migrate.py check                         # Check DB connection

# Or using Alembic directly
alembic revision --autogenerate -m "message"
alembic upgrade head
```

#### Testing

**CRITICAL: Coverage Tracking Issue**
- Pytest-cov has coverage recording issues with FastAPI routes when using xdist parallel execution
- Tests pass successfully but coverage data isn't collected for some route files
- See `backend/docs/COVERAGE_REPORT.md` for detailed analysis

```bash
# Run all tests (uses pytest-xdist for parallel execution)
IS_TEST=True pytest

# Run with coverage (use -n 0 for accurate coverage)
IS_TEST=True pytest --cov=app --cov-report=term-missing -n 0

# Run specific test file
IS_TEST=True pytest tests/api/test_auth.py -v

# Run single test
IS_TEST=True pytest tests/api/test_auth.py::TestLogin::test_login_success -v

# Run with HTML coverage report
IS_TEST=True pytest --cov=app --cov-report=html -n 0
open htmlcov/index.html

# Coverage target: 90%+ (currently 79%)
```

#### Running Locally
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

#### Setup
```bash
cd frontend
npm install
```

#### Development
```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking
```

#### Testing
```bash
# Unit tests (Jest)
npm test                    # Run all unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage

# E2E tests (Playwright)
npm run test:e2e            # Run all E2E tests
npm run test:e2e:ui         # Open Playwright UI
npm run test:e2e:debug      # Debug mode
npx playwright test auth-login.spec.ts  # Run specific file
```

**E2E Test Best Practices:**
- Use `Promise.all()` pattern for Next.js Link navigation:
  ```typescript
  await Promise.all([
    page.waitForURL('/target', { timeout: 10000 }),
    link.click()
  ]);
  ```
- Use ID-based selectors for validation errors (e.g., `#email-error`)
- Error IDs use dashes not underscores (`#new-password-error`)
- Target `.border-destructive[role="alert"]` to avoid Next.js route announcer conflicts
- Use 4 workers max to prevent test interference (`workers: 4` in `playwright.config.ts`)
- URL assertions should use regex to handle query params: `/\/auth\/login/`

### Docker

```bash
# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d

# Rebuild specific service
docker-compose build backend
docker-compose build frontend
```

## Key Architectural Patterns

### Authentication Flow
1. **Login**: `POST /api/v1/auth/login` returns access + refresh tokens
   - Access token: 1 day expiry (JWT)
   - Refresh token: 60 days expiry (JWT with JTI stored in DB)
   - Session tracking with device info (IP, user agent, device ID)

2. **Token Refresh**: `POST /api/v1/auth/refresh` validates refresh token JTI
   - Checks session is active in database
   - Issues new access token (refresh token remains valid)
   - Updates session `last_used_at`

3. **Authorization**: FastAPI dependencies in `api/dependencies/auth.py`
   - `get_current_user`: Validates access token, returns User or None
   - `require_auth`: Requires valid access token
   - `optional_auth`: Accepts both authenticated and anonymous users
   - `require_superuser`: Requires superuser flag

### Database Pattern: Async SQLAlchemy
- **Engine**: Created in `core/database.py` with connection pooling
- **Sessions**: AsyncSession from `async_sessionmaker`
- **CRUD**: Base class in `crud/base.py` with common operations
  - Inherits: `CRUDUser`, `CRUDSession`, `CRUDOrganization`
  - Pattern: `async def get(db: AsyncSession, id: str) -> Model | None`

### Frontend State Management
- **Zustand stores**: `lib/stores/` (authStore, etc.)
- **TanStack Query**: API data fetching/caching
- **Auto-generated client**: `lib/api/generated/` from OpenAPI spec
  - Generate with: `npm run generate-api` (runs `scripts/generate-api-client.sh`)

### Session Management Architecture
**Database-backed session tracking** (not just JWT):
- Each refresh token has a corresponding `UserSession` record
- Tracks: device info, IP, location, last used timestamp
- Supports session revocation (logout from specific devices)
- Cleanup job removes expired sessions

### Permission System
Three-tier organization roles:
- **Owner**: Full control (delete org, manage all members)
- **Admin**: Can add/remove members, assign admin role (not owner)
- **Member**: Read-only organization access

Dependencies in `api/dependencies/permissions.py`:
- `require_organization_owner`
- `require_organization_admin`
- `require_organization_member`
- `can_manage_organization_member` (owner or admin, but not self-demotion)

## Testing Infrastructure

### Backend Test Patterns

**Fixtures** (in `tests/conftest.py`):
- `async_test_db`: Fresh SQLite in-memory database per test
- `client`: AsyncClient with test database override
- `async_test_user`: Pre-created regular user
- `async_test_superuser`: Pre-created superuser
- `user_token` / `superuser_token`: Access tokens for API calls

**Database Mocking for Exception Testing**:
```python
from unittest.mock import patch, AsyncMock

# Mock database commit to raise exception
async def mock_commit():
    raise OperationalError("Connection lost", {}, Exception())

with patch.object(session, 'commit', side_effect=mock_commit):
    with patch.object(session, 'rollback', new_callable=AsyncMock) as mock_rollback:
        with pytest.raises(OperationalError):
            await crud_method(session, obj_in=data)
        mock_rollback.assert_called_once()
```

**Testing Routes**:
```python
@pytest.mark.asyncio
async def test_endpoint(client, user_token):
    response = await client.get(
        "/api/v1/endpoint",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
```

**IMPORTANT**: Use `@pytest_asyncio.fixture` for async fixtures, not `@pytest.fixture`

### Frontend Test Patterns

**Unit Tests (Jest)**:
```typescript
// SSR-safe mocking
jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: jest.fn()
}));

beforeEach(() => {
  (useAuthStore as jest.Mock).mockReturnValue({
    user: mockUser,
    login: mockLogin
  });
});
```

**E2E Tests (Playwright)**:
```typescript
test('navigation', async ({ page }) => {
  await page.goto('/');

  const link = page.getByRole('link', { name: 'Login' });
  await Promise.all([
    page.waitForURL(/\/auth\/login/, { timeout: 10000 }),
    link.click()
  ]);

  await expect(page).toHaveURL(/\/auth\/login/);
});
```

## Configuration

### Environment Variables

**Backend** (`.env`):
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=app

# Security
SECRET_KEY=your-secret-key-min-32-chars
ENVIRONMENT=development|production
CSP_MODE=relaxed|strict|disabled

# First Superuser (auto-created on init)
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=admin123

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Database Connection Pooling
Configured in `core/config.py`:
- `db_pool_size`: 20 (default connections)
- `db_max_overflow`: 50 (max overflow)
- `db_pool_timeout`: 30 seconds
- `db_pool_recycle`: 3600 seconds (recycle after 1 hour)

### Security Headers
Automatically applied via middleware in `main.py`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (production only)
- Content-Security-Policy (configurable via `CSP_MODE`)

### Rate Limiting
- Implemented with `slowapi`
- Default: 60 requests/minute per IP
- Applied to auth endpoints (login, register, password reset)
- Override in route decorators: `@limiter.limit("10/minute")`

## Common Workflows

### Adding a New API Endpoint

1. **Create schema** (`backend/app/schemas/`):
   ```python
   class ItemCreate(BaseModel):
       name: str
       description: Optional[str] = None

   class ItemResponse(BaseModel):
       id: UUID
       name: str
       created_at: datetime
   ```

2. **Create CRUD operations** (`backend/app/crud/`):
   ```python
   class CRUDItem(CRUDBase[Item, ItemCreate, ItemUpdate]):
       async def get_by_name(self, db: AsyncSession, name: str) -> Item | None:
           result = await db.execute(select(Item).where(Item.name == name))
           return result.scalar_one_or_none()

   item = CRUDItem(Item)
   ```

3. **Create route** (`backend/app/api/routes/items.py`):
   ```python
   from app.api.dependencies.auth import get_current_user

   @router.post("/", response_model=ItemResponse)
   async def create_item(
       item_in: ItemCreate,
       current_user: User = Depends(get_current_user),
       db: AsyncSession = Depends(get_db)
   ):
       item = await item_crud.create(db, obj_in=item_in)
       return item
   ```

4. **Register router** (`backend/app/api/main.py`):
   ```python
   from app.api.routes import items
   api_router.include_router(items.router, prefix="/items", tags=["Items"])
   ```

5. **Write tests** (`backend/tests/api/test_items.py`):
   ```python
   @pytest.mark.asyncio
   async def test_create_item(client, user_token):
       response = await client.post(
           "/api/v1/items",
           headers={"Authorization": f"Bearer {user_token}"},
           json={"name": "Test Item"}
       )
       assert response.status_code == 201
   ```

6. **Generate frontend client**:
   ```bash
   cd frontend
   npm run generate-api
   ```

### Adding a New React Component

1. **Create component** (`frontend/src/components/`):
   ```typescript
   export function MyComponent() {
     const { user } = useAuthStore();
     return <div>Hello {user?.firstName}</div>;
   }
   ```

2. **Add tests** (`frontend/src/components/__tests__/`):
   ```typescript
   import { render, screen } from '@testing-library/react';

   test('renders component', () => {
     render(<MyComponent />);
     expect(screen.getByText(/Hello/)).toBeInTheDocument();
   });
   ```

3. **Add to page** (`frontend/src/app/page.tsx`):
   ```typescript
   import { MyComponent } from '@/components/MyComponent';

   export default function Page() {
     return <MyComponent />;
   }
   ```

## Current Project Status (Nov 2025)

### Completed Features
- ✅ Authentication system (JWT with refresh tokens)
- ✅ Session management (device tracking, revocation)
- ✅ User management (CRUD, password change)
- ✅ Organization system (multi-tenant with roles)
- ✅ Admin panel (user/org management, bulk operations)
- ✅ E2E test suite (86 tests, 100% pass rate, zero flaky tests)

### Test Coverage
- **Backend**: 79% overall (target: 90%+)
  - User CRUD: 90%
  - Session CRUD: 100% ✅
  - Auth routes: 79%
  - Admin routes: 46% (coverage tracking issue)
  - See `backend/docs/COVERAGE_REPORT.md` for details

- **Frontend E2E**: 86 tests across 4 files
  - auth-login.spec.ts
  - auth-register.spec.ts
  - auth-password-reset.spec.ts
  - navigation.spec.ts

### Known Issues

1. **Pytest-cov coverage tracking issue**:
   - Tests pass but coverage not recorded for some route files
   - Suspected: xdist parallel execution interferes with coverage collection
   - Workaround: Run with `-n 0` for accurate coverage
   - Investigation needed: HTML coverage report, source vs trace mode

2. **Dead code in users.py** (lines 150-154, 270-275):
   - Checks for `is_superuser` in `UserUpdate` schema
   - Field doesn't exist in schema, so code is unreachable
   - Marked with `# pragma: no cover`
   - Consider: Remove code or add field to schema

## API Documentation

Once backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## Troubleshooting

### Tests failing with "Module was never imported"
Run with single process: `pytest -n 0`

### Coverage not improving despite new tests
- Verify tests actually execute endpoints (check response.status_code)
- Generate HTML coverage: `pytest --cov=app --cov-report=html -n 0`
- Check for dependency override issues in test fixtures

### Frontend type errors
```bash
npm run type-check          # Check all types
npx tsc --noEmit           # Same but shorter
```

### E2E tests flaking
- Check worker count (should be 4, not 16+)
- Use `Promise.all()` for navigation
- Use regex for URL assertions
- Target specific selectors (avoid generic `[role="alert"]`)

### Database migration conflicts
```bash
python migrate.py list      # Check migration history
alembic downgrade -1        # Downgrade one revision
alembic upgrade head        # Re-apply
```

## Additional Documentation

- `backend/docs/COVERAGE_REPORT.md`: Detailed coverage analysis and roadmap to 95%
- `backend/docs/ASYNC_MIGRATION_GUIDE.md`: Guide for async SQLAlchemy patterns
- `frontend/e2e/README.md`: E2E testing setup and guidelines
