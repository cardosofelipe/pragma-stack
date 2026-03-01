# CLAUDE.md

Claude Code context for FastAPI + Next.js Full-Stack Template.

**See [AGENTS.md](./AGENTS.md) for project context, architecture, and development commands.**

## Claude Code-Specific Guidance

### Critical User Preferences

#### File Operations - NEVER Use Heredoc/Cat Append
**ALWAYS use Read/Write/Edit tools instead of `cat >> file << EOF` commands.**

This triggers manual approval dialogs and disrupts workflow.

```bash
# WRONG ❌
cat >> file.txt << EOF
content
EOF

# CORRECT ✅ - Use Read, then Write tools
```

#### Work Style
- User prefers autonomous operation without frequent interruptions
- Ask for batch permissions upfront for long work sessions
- Work independently, document decisions clearly
- Only use emojis if the user explicitly requests it

### When Working with This Stack

**Dependency Management:**
- Backend uses **uv** (modern Python package manager), not pip
- Always use `uv run` prefix: `IS_TEST=True uv run pytest`
- Or use Makefile commands: `make test`, `make install-dev`
- Add dependencies: `uv add <package>` or `uv add --dev <package>`

**Database Migrations:**
- Use the `migrate.py` helper script, not Alembic directly
- Generate + apply: `python migrate.py auto "message"`
- Never commit migrations without testing them first
- Check current state: `python migrate.py current`

**Frontend API Client Generation:**
- Run `npm run generate:api` after backend schema changes
- Client is auto-generated from OpenAPI spec
- Located in `frontend/src/lib/api/generated/`
- NEVER manually edit generated files

**Testing Commands:**
- Backend unit/integration: `IS_TEST=True uv run pytest` (always prefix with `IS_TEST=True`)
- Backend E2E (requires Docker): `make test-e2e`
- Frontend unit: `npm test`
- Frontend E2E: `npm run test:e2e`
- Use `make test` or `make test-cov` in backend for convenience

**Security & Quality Commands (Backend):**
- `make validate` — lint + format + type checks
- `make audit` — dependency vulnerabilities + license compliance
- `make validate-all` — quality + security checks
- `make check` — **full pipeline**: quality + security + tests

**Backend E2E Testing (requires Docker):**
- Install deps: `make install-e2e`
- Run all E2E tests: `make test-e2e`
- Run schema tests only: `make test-e2e-schema`
- Run all tests: `make test-all` (unit + E2E)
- Uses Testcontainers (real PostgreSQL) + Schemathesis (OpenAPI contract testing)
- Markers: `@pytest.mark.e2e`, `@pytest.mark.postgres`, `@pytest.mark.schemathesis`
- See: `backend/docs/E2E_TESTING.md` for complete guide

### 🔴 CRITICAL: Auth Store Dependency Injection Pattern

**ALWAYS use `useAuth()` from `AuthContext`, NEVER import `useAuthStore` directly!**

```typescript
// ❌ WRONG - Bypasses dependency injection
import { useAuthStore } from '@/lib/stores/authStore';
const { user, isAuthenticated } = useAuthStore();

// ✅ CORRECT - Uses dependency injection
import { useAuth } from '@/lib/auth/AuthContext';
const { user, isAuthenticated } = useAuth();
```

**Why This Matters:**
- E2E tests inject mock stores via `window.__TEST_AUTH_STORE__`
- Unit tests inject via `<AuthProvider store={mockStore}>`
- Direct `useAuthStore` imports bypass this injection → **tests fail**
- ESLint will catch violations (added Nov 2025)

**Exceptions:**
1. `AuthContext.tsx` - DI boundary, legitimately needs real store
2. `client.ts` - Non-React context, uses dynamic import + `__TEST_AUTH_STORE__` check

### E2E Test Best Practices

When writing or fixing Playwright tests:

**Navigation Pattern:**
```typescript
// ✅ CORRECT - Use Promise.all for Next.js Link clicks
await Promise.all([
  page.waitForURL('/target', { timeout: 10000 }),
  link.click()
]);
```

**Selectors:**
- Use ID-based selectors for validation errors: `#email-error`
- Error IDs use dashes not underscores: `#new-password-error`
- Target `.border-destructive[role="alert"]` to avoid Next.js route announcer conflicts
- Avoid generic `[role="alert"]` which matches multiple elements

**URL Assertions:**
```typescript
// ✅ Use regex to handle query params
await expect(page).toHaveURL(/\/auth\/login/);

// ❌ Don't use exact strings (fails with query params)
await expect(page).toHaveURL('/auth/login');
```

**Configuration:**
- Uses 12 workers in non-CI mode (`playwright.config.ts`)
- Reduces to 2 workers in CI for stability
- Tests are designed to be non-flaky with proper waits

### Important Implementation Details

**Authentication Testing:**
- Backend fixtures in `tests/conftest.py`:
  - `async_test_db`: Fresh SQLite per test
  - `async_test_user` / `async_test_superuser`: Pre-created users
  - `user_token` / `superuser_token`: Access tokens for API calls
- Always use `@pytest.mark.asyncio` for async tests
- Use `@pytest_asyncio.fixture` for async fixtures

**Database Testing:**
```python
# Mock database exceptions correctly
from unittest.mock import patch, AsyncMock

async def mock_commit():
    raise OperationalError("Connection lost", {}, Exception())

with patch.object(session, 'commit', side_effect=mock_commit):
    with patch.object(session, 'rollback', new_callable=AsyncMock) as mock_rollback:
        with pytest.raises(OperationalError):
            await crud_method(session, obj_in=data)
        mock_rollback.assert_called_once()
```

**Frontend Component Development:**
- Follow design system docs in `frontend/docs/design-system/`
- Read `08-ai-guidelines.md` for AI code generation rules
- Use parent-controlled spacing (see `04-spacing-philosophy.md`)
- WCAG AA compliance required (see `07-accessibility.md`)

**Security Considerations:**
- Backend has comprehensive security tests (JWT attacks, session hijacking)
- Never skip security headers in production
- Rate limiting is configured in route decorators: `@limiter.limit("10/minute")`
- Session revocation is database-backed, not just JWT expiry
- Run `make audit` to check for dependency vulnerabilities and license compliance
- Run `make check` for the full pipeline: quality + security + tests
- Pre-commit hooks enforce Ruff lint/format and detect-secrets on every commit
- Setup hooks: `cd backend && uv run pre-commit install`

### Common Workflows Guidance

**When Adding a New Feature:**
1. Start with backend schema and CRUD
2. Implement API route with proper authorization
3. Write backend tests (aim for >90% coverage)
4. Generate frontend API client: `npm run generate:api`
5. Implement frontend components
6. Write frontend unit tests
7. Add E2E tests for critical flows
8. Update relevant documentation

**When Fixing Tests:**
- Backend: Check test database isolation and async fixture usage
- Frontend unit: Verify mocking of `useAuth()` not `useAuthStore`
- E2E: Use `Promise.all()` pattern and regex URL assertions

**When Debugging:**
- Backend: Check `IS_TEST=True` environment variable is set
- Frontend: Run `npm run type-check` first
- E2E: Use `npm run test:e2e:debug` for step-by-step debugging
- Check logs: Backend has detailed error logging

**Demo Mode (Frontend-Only Showcase):**
- Enable: `echo "NEXT_PUBLIC_DEMO_MODE=true" > frontend/.env.local`
- Uses MSW (Mock Service Worker) to intercept API calls in browser
- Zero backend required - perfect for Vercel deployments
- **Fully Automated**: MSW handlers auto-generated from OpenAPI spec
  - Run `npm run generate:api` → updates both API client AND MSW handlers
  - No manual synchronization needed!
- Demo credentials (any password ≥8 chars works):
  - User: `demo@example.com` / `DemoPass123`
  - Admin: `admin@example.com` / `AdminPass123`
- **Safe**: MSW never runs during tests (Jest or Playwright)
- **Coverage**: Mock files excluded from linting and coverage
- **Documentation**: `frontend/docs/DEMO_MODE.md` for complete guide

### Tool Usage Preferences

**Prefer specialized tools over bash:**
- Use Read/Write/Edit tools for file operations
- Never use `cat`, `echo >`, or heredoc for file manipulation
- Use Task tool with `subagent_type=Explore` for codebase exploration
- Use Grep tool for code search, not bash `grep`

**When to use parallel tool calls:**
- Independent git commands: `git status`, `git diff`, `git log`
- Reading multiple unrelated files
- Running multiple test suites simultaneously
- Independent validation steps

## Custom Skills

No Claude Code Skills installed yet. To create one, invoke the built-in "skill-creator" skill.

**Potential skill ideas for this project:**
- API endpoint generator workflow (schema → CRUD → route → tests → frontend client)
- Component generator with design system compliance
- Database migration troubleshooting helper
- Test coverage analyzer and improvement suggester
- E2E test generator for new features

## Additional Resources

**Comprehensive Documentation:**
- [AGENTS.md](./AGENTS.md) - Framework-agnostic AI assistant context
- [README.md](./README.md) - User-facing project overview
- `backend/docs/` - Backend architecture, coding standards, common pitfalls
- `frontend/docs/design-system/` - Complete design system guide

**API Documentation (when running):**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json

**Testing Documentation:**
- Backend tests: `backend/tests/` (97% coverage)
- Frontend E2E: `frontend/e2e/README.md`
- Design system: `frontend/docs/design-system/08-ai-guidelines.md`

---

**For project architecture, development commands, and general context, see [AGENTS.md](./AGENTS.md).**
