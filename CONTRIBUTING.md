# Contributing to FastAPI + Next.js Template

First off, thank you for considering contributing to this project! 🎉

This template aims to be a rock-solid foundation for full-stack applications, and your contributions help make that possible.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

This project is committed to providing a welcoming and inclusive environment. We expect all contributors to:

- Be respectful and considerate
- Welcome newcomers and help them learn
- Focus on constructive criticism
- Accept feedback gracefully
- Prioritize the community's well-being

Unacceptable behavior includes harassment, trolling, insulting comments, and personal attacks.

---

## How Can I Contribute?

### Reporting Bugs

Found a bug? Help us fix it!

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details (OS, Python/Node version, etc.)
   - Screenshots/logs if applicable

### Suggesting Features

Have an idea for improvement?

1. **Check existing issues/discussions** first
2. **Open a discussion** to gauge interest
3. **Explain the use case** and benefits
4. **Consider implementation complexity**

Remember: This is a *template*, not a full application. Features should be:
- Broadly useful
- Well-documented
- Thoroughly tested
- Maintainable long-term

### Improving Documentation

Documentation improvements are always welcome!

- Fix typos or unclear explanations
- Add examples or diagrams
- Expand on complex topics
- Update outdated information
- Translate documentation (future)

### Contributing Code

Ready to write some code? Awesome!

1. **Pick an issue** (or create one)
2. **Comment** that you're working on it
3. **Fork and branch** from `main`
4. **Write code** following our standards
5. **Add tests** (required for features)
6. **Update docs** if needed
7. **Submit a PR** with clear description

---

## Development Setup

### Backend Development

```bash
cd backend

# Install dependencies (uv manages virtual environment automatically)
uv sync

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
python migrate.py apply

# Run tests
IS_TEST=True uv run pytest

# Start dev server
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local

# Generate API client
npm run generate:api

# Run tests
npm test
npm run test:e2e:ui

# Start dev server
npm run dev
```

---

## Coding Standards

### Backend (Python)

- **Style**: Follow PEP 8
- **Type hints**: Use type annotations
- **Async**: Use async/await for I/O operations
- **Documentation**: Docstrings for all public functions/classes
- **Error handling**: Use custom exceptions appropriately
- **Security**: Never trust user input, validate everything

Example:
```python
async def get_user_by_email(
    db: AsyncSession,
    *,
    email: str
) -> Optional[User]:
    """
    Get user by email address.

    Args:
        db: Database session
        email: User's email address

    Returns:
        User if found, None otherwise
    """
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()
```

### Frontend (TypeScript/React)

- **Style**: Use Prettier (configured)
- **TypeScript**: Strict mode, no `any` types
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **Imports**: Use absolute imports with `@/` alias
- **Dependencies**: Use provided auth context (never import stores directly)

Example:
```typescript
interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <LoadingSpinner />;

  return <div>...</div>;
}
```

### Key Patterns

- **Backend**: Use CRUD pattern, keep routes thin, business logic in services
- **Frontend**: Use React Query for server state, Zustand for client state
- **Both**: Handle errors gracefully, log appropriately, write tests

---

## Testing Guidelines

### Backend Tests

- **Coverage target**: >90% for new code
- **Test types**: Unit, integration, and security tests
- **Fixtures**: Use pytest fixtures from `conftest.py`
- **Database**: Use `async_test_db` fixture for isolation
- **Assertions**: Be specific about what you're testing

```python
@pytest.mark.asyncio
async def test_create_user(client, async_test_superuser, superuser_token):
    """Test creating a new user."""
    response = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {superuser_token}"},
        json={
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "first_name": "New",
            "last_name": "User"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "password" not in data  # Never expose passwords
```

### Frontend E2E Tests

- **Use Playwright**: For end-to-end user flows
- **Be specific**: Use accessible selectors (roles, labels)
- **Be reliable**: Avoid flaky tests with proper waits
- **Be fast**: Group related tests, use parallel execution

```typescript
test('user can login and view profile', async ({ page }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // Should see user name
  await expect(page.getByText('Welcome, John')).toBeVisible();
});
```

### Unit Tests (Frontend)

- **Test behavior**: Not implementation details
- **Mock dependencies**: Use Jest mocks appropriately
- **Test accessibility**: Include a11y checks when relevant

---

## Commit Messages

Write clear, descriptive commit messages:

### Format

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

**Good:**
```
feat: add password reset flow

Implements complete password reset with email tokens.
Tokens expire after 1 hour for security.

Closes #123
```

**Also good (simple change):**
```
fix: correct pagination offset calculation
```

**Not great:**
```
Fixed stuff
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated if needed
- [ ] No merge conflicts with `main`
- [ ] Commits are logical and well-described

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
How was this tested?

## Screenshots (if applicable)

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Follows coding standards
```

### Review Process

1. **Submit PR** with clear description
2. **CI checks** must pass (when implemented)
3. **Code review** by maintainers
4. **Address feedback** if requested
5. **Approval** from at least one maintainer
6. **Merge** by maintainer

### After Merge

- Your contribution will be in the next release
- You'll be added to contributors list
- Feel awesome! 🎉

---

## Questions?

- **Documentation issues?** Ask in your PR or issue
- **Unsure about implementation?** Open a discussion first
- **Need help?** Tag maintainers in your issue/PR

---

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- README acknowledgments (for major features)

---

Thank you for contributing! Every contribution, no matter how small, makes this template better for everyone. 🚀
