# AGENTS.md

AI coding assistant context for FastAPI + Next.js Full-Stack Template.

## Quick Start

```bash
# Backend (Python with uv)
cd backend
make install-dev              # Install dependencies
make test                     # Run tests
uv run uvicorn app.main:app --reload  # Start dev server

# Frontend (Node.js)
cd frontend
npm install                   # Install dependencies
npm run dev                   # Start dev server
npm run generate:api          # Generate API client from OpenAPI
npm run test:e2e              # Run E2E tests
```

**Access points:**
- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**

Default superuser (change in production):
- Email: `admin@example.com`
- Password: `admin123`

## Project Architecture

**Full-stack TypeScript/Python application:**

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes (auth, users, organizations, admin)
│   │   ├── core/           # Core functionality (auth, config, database)
│   │   ├── crud/           # Database CRUD operations
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic layer
│   │   └── utils/          # Utilities (security, device detection)
│   ├── tests/              # 96% coverage, 987 tests
│   └── alembic/            # Database migrations
│
└── frontend/               # Next.js 16 frontend
    ├── src/
    │   ├── app/           # App Router pages (Next.js 16)
    │   ├── components/    # React components
    │   ├── lib/
    │   │   ├── api/       # Auto-generated API client
    │   │   └── stores/    # Zustand state management
    │   └── hooks/         # Custom React hooks
    └── e2e/               # Playwright E2E tests (56 passing)
```

## Critical Implementation Notes

### Authentication Flow
- **JWT-based**: Access tokens (15 min) + refresh tokens (7 days)
- **OAuth/Social Login**: Google and GitHub with PKCE support
- **Session tracking**: Database-backed with device info, IP, user agent
- **Token refresh**: Validates JTI in database, not just JWT signature
- **Authorization**: FastAPI dependencies in `api/dependencies/auth.py`
  - `get_current_user`: Requires valid access token
  - `get_current_active_user`: Requires active account
  - `get_optional_current_user`: Accepts authenticated or anonymous
  - `get_current_superuser`: Requires superuser flag

### OAuth Provider Mode (MCP Integration)
Full OAuth 2.0 Authorization Server for MCP (Model Context Protocol) clients:
- **Authorization Code Flow with PKCE**: RFC 7636 compliant
- **JWT access tokens**: Self-contained, no DB lookup required
- **Opaque refresh tokens**: Stored hashed in database, supports rotation
- **Token introspection**: RFC 7662 compliant endpoint
- **Token revocation**: RFC 7009 compliant endpoint
- **Server metadata**: RFC 8414 compliant discovery endpoint
- **Consent management**: User can review and revoke app permissions

**API endpoints:**
- `GET /.well-known/oauth-authorization-server` - Server metadata
- `GET /oauth/provider/authorize` - Authorization endpoint
- `POST /oauth/provider/authorize/consent` - Consent submission
- `POST /oauth/provider/token` - Token endpoint
- `POST /oauth/provider/revoke` - Token revocation
- `POST /oauth/provider/introspect` - Token introspection
- Client management endpoints (admin only)

**Scopes supported:** `openid`, `profile`, `email`, `read:users`, `write:users`, `admin`

**OAuth Configuration (backend `.env`):**
```bash
# OAuth Social Login (as OAuth Consumer)
OAUTH_ENABLED=true                           # Enable OAuth social login
OAUTH_AUTO_LINK_BY_EMAIL=true                # Auto-link accounts by email
OAUTH_STATE_EXPIRE_MINUTES=10                # CSRF state expiration

# Google OAuth
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
OAUTH_GITHUB_CLIENT_ID=your-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-github-client-secret

# OAuth Provider Mode (as Authorization Server for MCP)
OAUTH_PROVIDER_ENABLED=true                  # Enable OAuth provider mode
OAUTH_ISSUER=https://api.yourdomain.com      # JWT issuer URL (must be HTTPS in production)
```

### Database Pattern
- **Async SQLAlchemy 2.0** with PostgreSQL
- **Connection pooling**: 20 base connections, 50 max overflow
- **CRUD base class**: `crud/base.py` with common operations
- **Migrations**: Alembic with helper script `migrate.py`
  - `python migrate.py auto "message"` - Generate and apply
  - `python migrate.py list` - View history

### Frontend State Management
- **Zustand stores**: Lightweight state management
- **TanStack Query**: API data fetching/caching
- **Auto-generated client**: From OpenAPI spec via `npm run generate:api`
- **Dependency Injection**: ALWAYS use `useAuth()` from `AuthContext`, NEVER import `useAuthStore` directly

### Internationalization (i18n)
- **next-intl v4**: Type-safe internationalization library
- **Locale routing**: `/en/*`, `/it/*` (English and Italian supported)
- **Translation files**: `frontend/messages/en.json`, `frontend/messages/it.json`
- **LocaleSwitcher**: Component for seamless language switching
- **SEO-friendly**: Locale-aware metadata, sitemaps, and robots.txt
- **Type safety**: Full TypeScript support for translations
- **Utilities**: `frontend/src/lib/i18n/` (metadata, routing, utils)

### Organization System
Three-tier RBAC:
- **Owner**: Full control (delete org, manage all members)
- **Admin**: Add/remove members, assign admin role (not owner)
- **Member**: Read-only organization access

Permission dependencies in `api/dependencies/permissions.py`:
- `require_organization_owner`
- `require_organization_admin`
- `require_organization_member`
- `can_manage_organization_member`

### Testing Infrastructure

**Backend Unit/Integration (pytest + SQLite):**
- 96% coverage, 987 tests
- Security-focused: JWT attacks, session hijacking, privilege escalation
- Async fixtures in `tests/conftest.py`
- Run: `IS_TEST=True uv run pytest` or `make test`
- Coverage: `make test-cov`

**Backend E2E (pytest + Testcontainers + Schemathesis):**
- Real PostgreSQL via Docker containers
- OpenAPI contract testing with Schemathesis
- Install: `make install-e2e`
- Run: `make test-e2e`
- Schema tests: `make test-e2e-schema`
- Docs: `backend/docs/E2E_TESTING.md`

**Frontend Unit Tests (Jest):**
- 97% coverage
- Component, hook, and utility testing
- Run: `npm test`
- Coverage: `npm run test:coverage`

**Frontend E2E Tests (Playwright):**
- 56 passing, 1 skipped (zero flaky tests)
- Complete user flows (auth, navigation, settings)
- Run: `npm run test:e2e`
- UI mode: `npm run test:e2e:ui`

### Development Tooling

**Backend:**
- **uv**: Modern Python package manager (10-100x faster than pip)
- **Ruff**: All-in-one linting/formatting (replaces Black, Flake8, isort)
- **mypy**: Type checking with Pydantic plugin
- **Makefile**: `make help` for all commands

**Frontend:**
- **Next.js 16**: App Router with React 19
- **TypeScript**: Full type safety
- **TailwindCSS + shadcn/ui**: Design system
- **ESLint + Prettier**: Code quality

### Environment Configuration

**Backend** (`.env`):
```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=app

SECRET_KEY=your-secret-key-min-32-chars
ENVIRONMENT=development|production
CSP_MODE=relaxed|strict|disabled

FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=admin123

BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Common Development Workflows

### Adding a New API Endpoint

1. **Define schema** in `backend/app/schemas/`
2. **Create CRUD operations** in `backend/app/crud/`
3. **Implement route** in `backend/app/api/routes/`
4. **Register router** in `backend/app/api/main.py`
5. **Write tests** in `backend/tests/api/`
6. **Generate frontend client**: `npm run generate:api`

### Database Migrations

```bash
cd backend
python migrate.py generate "description"  # Create migration
python migrate.py apply                   # Apply migrations
python migrate.py auto "description"      # Generate + apply
```

### Frontend Component Development

1. **Create component** in `frontend/src/components/`
2. **Follow design system** (see `frontend/docs/design-system/`)
3. **Use dependency injection** for auth (`useAuth()` not `useAuthStore`)
4. **Write tests** in `frontend/tests/` or `__tests__/`
5. **Run type check**: `npm run type-check`

## Security Features

- **Password hashing**: bcrypt with salt rounds
- **Rate limiting**: 60 req/min default, 10 req/min on auth endpoints
- **Security headers**: CSP, X-Frame-Options, HSTS, etc.
- **CSRF protection**: Built into FastAPI
- **Session revocation**: Database-backed session tracking
- **Comprehensive security tests**: JWT algorithm attacks, session hijacking, privilege escalation

## Docker Deployment

```bash
# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Create first superuser
docker-compose exec backend python -c "from app.init_db import init_db; import asyncio; asyncio.run(init_db())"
```

## Documentation

**For comprehensive documentation, see:**
- **[README.md](./README.md)** - User-facing project overview
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code-specific guidance
- **Backend docs**: `backend/docs/` (Architecture, Coding Standards, Common Pitfalls, Feature Examples)
- **Frontend docs**: `frontend/docs/` (Design System, Architecture, E2E Testing)
- **API docs**: http://localhost:8000/docs (Swagger UI when running)

## Current Status (Nov 2025)

### Completed Features ✅
- Authentication system (JWT with refresh tokens, OAuth/social login)
- **OAuth Provider Mode (MCP-ready)**: Full OAuth 2.0 Authorization Server
- Session management (device tracking, revocation)
- User management (CRUD, password change)
- Organization system (multi-tenant with RBAC)
- Admin panel (user/org management, bulk operations)
- **Internationalization (i18n)** with English and Italian
- Comprehensive test coverage (96% backend, 97% frontend unit, 56 E2E tests)
- Design system documentation
- **Marketing landing page** with animations
- **`/dev` documentation portal** with live examples
- **Toast notifications**, charts, markdown rendering
- **SEO optimization** (sitemap, robots.txt, locale metadata)
- Docker deployment

### In Progress 🚧
- Frontend admin pages (70% complete)
- Email integration (templates ready, SMTP pending)

### Planned 🔮
- GitHub Actions CI/CD
- Additional languages (Spanish, French, German, etc.)
- SSO/SAML authentication
- Real-time notifications (WebSockets)
- Webhook system
- Background job processing
- File upload/storage
