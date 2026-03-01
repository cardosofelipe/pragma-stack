# Common Pitfalls & How to Avoid Them

> **Purpose**: This document catalogs common mistakes encountered during implementation and provides explicit rules to prevent them. **Read this before writing any code.**

## Table of Contents

- [SQLAlchemy & Database](#sqlalchemy--database)
- [Pydantic & Validation](#pydantic--validation)
- [FastAPI & API Design](#fastapi--api-design)
- [Security & Authentication](#security--authentication)
- [Python Language Gotchas](#python-language-gotchas)

---

## SQLAlchemy & Database

### ❌ PITFALL #1: Using Mutable Defaults in Columns

**Issue**: Using `default={}` or `default=[]` creates shared state across all instances.

```python
# ❌ WRONG - All instances share the same dict!
class User(Base):
    metadata = Column(JSON, default={})  # DANGER: Mutable default!
    tags = Column(JSON, default=[])     # DANGER: Shared list!
```

```python
# ✅ CORRECT - Use callable factory
class User(Base):
    metadata = Column(JSON, default=dict)  # New dict per instance
    tags = Column(JSON, default=list)      # New list per instance
```

**Rule**: Always use `default=dict` or `default=list` (without parentheses), never `default={}` or `default=[]`.

---

### ❌ PITFALL #2: Forgetting to Index Foreign Keys

**Issue**: Foreign key columns without indexes cause slow JOIN operations.

```python
# ❌ WRONG - No index on foreign key
class UserSession(Base):
    user_id = Column(UUID, ForeignKey('users.id'), nullable=False)
```

```python
# ✅ CORRECT - Always index foreign keys
class UserSession(Base):
    user_id = Column(UUID, ForeignKey('users.id'), nullable=False, index=True)
```

**Rule**: ALWAYS add `index=True` to foreign key columns. SQLAlchemy doesn't do this automatically.

---

### ❌ PITFALL #3: Missing Composite Indexes

**Issue**: Queries filtering by multiple columns cannot use single-column indexes efficiently.

```python
# ❌ MISSING - Slow query on (user_id, is_active)
class UserSession(Base):
    user_id = Column(UUID, ForeignKey('users.id'), index=True)
    is_active = Column(Boolean, default=True, index=True)
    # Query: WHERE user_id=X AND is_active=TRUE uses only one index!
```

```python
# ✅ CORRECT - Composite index for common query pattern
class UserSession(Base):
    user_id = Column(UUID, ForeignKey('users.id'), index=True)
    is_active = Column(Boolean, default=True, index=True)

    __table_args__ = (
        Index('ix_user_sessions_user_active', 'user_id', 'is_active'),
    )
```

**Rule**: Add composite indexes for commonly used multi-column filters. Review query patterns and create indexes accordingly.

**Performance Impact**: Can reduce query time from seconds to milliseconds for large tables.

---

### ❌ PITFALL #4: Not Using Soft Deletes

**Issue**: Hard deletes destroy data and audit trails permanently.

```python
# ❌ RISKY - Permanent data loss
def delete_user(user_id: UUID):
    user = db.query(User).filter(User.id == user_id).first()
    db.delete(user)  # Data gone forever!
    db.commit()
```

```python
# ✅ CORRECT - Soft delete with audit trail
class User(Base):
    deleted_at = Column(DateTime(timezone=True), nullable=True)

def soft_delete_user(user_id: UUID):
    user = db.query(User).filter(User.id == user_id).first()
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()
```

**Rule**: For user data, ALWAYS use soft deletes. Add `deleted_at` column and filter queries with `.filter(deleted_at.is_(None))`.

---

### ❌ PITFALL #5: Missing Query Ordering

**Issue**: Queries without `ORDER BY` return unpredictable results, breaking pagination.

```python
# ❌ WRONG - Random order, pagination broken
def get_users(skip: int, limit: int):
    return db.query(User).offset(skip).limit(limit).all()
```

```python
# ✅ CORRECT - Stable ordering for consistent pagination
def get_users(skip: int, limit: int):
    return (
        db.query(User)
        .filter(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())  # Consistent order
        .offset(skip)
        .limit(limit)
        .all()
    )
```

**Rule**: ALWAYS add `.order_by()` to paginated queries. Default to `created_at.desc()` for newest-first.

---

## Pydantic & Validation

### ❌ PITFALL #6: Missing Size Validation on JSON Fields

**Issue**: Unbounded JSON fields enable DoS attacks through deeply nested objects.

```python
# ❌ WRONG - No size limit (JSON bomb vulnerability)
class UserCreate(BaseModel):
    metadata: dict[str, Any]  # No limit!
```

```python
# ✅ CORRECT - Validate serialized size
import json
from pydantic import field_validator

class UserCreate(BaseModel):
    metadata: dict[str, Any]

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        metadata_json = json.dumps(v, separators=(",", ":"))
        max_size = 10_000  # 10KB limit

        if len(metadata_json) > max_size:
            raise ValueError(f"Metadata exceeds {max_size} bytes")

        return v
```

**Rule**: ALWAYS validate the serialized size of dict/JSON fields. Typical limits:
- User metadata: 10KB
- Configuration: 100KB
- Never exceed 1MB

**Security Impact**: Prevents DoS attacks via deeply nested JSON objects.

---

### ❌ PITFALL #7: Missing max_length on String Fields

**Issue**: Unbounded text fields enable memory exhaustion attacks and database errors.

```python
# ❌ WRONG - No length limit
class UserCreate(BaseModel):
    email: str
    name: str
    bio: str | None = None
```

```python
# ✅ CORRECT - Explicit length limits matching database
class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    name: str = Field(..., min_length=1, max_length=100)
    bio: str | None = Field(None, max_length=500)
```

**Rule**: Add `max_length` to ALL string fields. Limits should match database column definitions:
- Emails: 255 characters
- Names/titles: 100-255 characters
- Descriptions/bios: 500-1000 characters
- Error messages: 5000 characters

---

### ❌ PITFALL #8: Inconsistent Validation Between Create and Update

**Issue**: Adding validators to Create schema but not Update schema.

```python
# ❌ INCOMPLETE - Only validates on create
class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v.lower()

class UserUpdate(BaseModel):
    email: str | None = None  # No validator!
```

```python
# ✅ CORRECT - Same validation on both schemas
class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v.lower()

class UserUpdate(BaseModel):
    email: str | None = Field(None, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v.lower()
```

**Rule**: Apply the SAME validators to both Create and Update schemas. Handle `None` values in Update validators.

---

### ❌ PITFALL #9: Not Using Field Descriptions

**Issue**: Missing descriptions make API documentation unclear.

```python
# ❌ WRONG - No descriptions
class UserCreate(BaseModel):
    email: str
    password: str
    is_superuser: bool = False
```

```python
# ✅ CORRECT - Clear descriptions
class UserCreate(BaseModel):
    email: str = Field(
        ...,
        description="User's email address (must be unique)",
        examples=["user@example.com"]
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Password (minimum 8 characters)",
        examples=["SecurePass123!"]
    )
    is_superuser: bool = Field(
        default=False,
        description="Whether user has superuser privileges"
    )
```

**Rule**: Add `description` and `examples` to all fields for automatic OpenAPI documentation.

---

## FastAPI & API Design

### ❌ PITFALL #10: Missing Rate Limiting

**Issue**: No rate limiting allows abuse and DoS attacks.

```python
# ❌ WRONG - No rate limits
@router.post("/auth/login")
def login(credentials: OAuth2PasswordRequestForm):
    # Anyone can try unlimited passwords!
    ...
```

```python
# ✅ CORRECT - Rate limit sensitive endpoints
from slowapi import Limiter

limiter = Limiter(key_func=lambda request: request.client.host)

@router.post("/auth/login")
@limiter.limit("5/minute")  # Only 5 attempts per minute
def login(request: Request, credentials: OAuth2PasswordRequestForm):
    ...
```

**Rule**: Apply rate limits to ALL endpoints:
- Authentication: 5/minute
- Write operations: 10-20/minute
- Read operations: 30-60/minute

---

### ❌ PITFALL #11: Returning Sensitive Data in Responses

**Issue**: Exposing internal fields like passwords, tokens, or internal IDs.

```python
# ❌ WRONG - Returns password hash!
@router.get("/users/{user_id}")
def get_user(user_id: UUID, db: Session = Depends(get_db)) -> User:
    return user_crud.get(db, id=user_id)  # Returns ORM model with ALL fields!
```

```python
# ✅ CORRECT - Use response schema
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    user = user_crud.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user  # Pydantic filters to only UserResponse fields

class UserResponse(BaseModel):
    """Public user data - NO sensitive fields."""
    id: UUID
    email: str
    is_active: bool
    created_at: datetime
    # NO: password, hashed_password, tokens, etc.

    model_config = ConfigDict(from_attributes=True)
```

**Rule**: ALWAYS use dedicated response schemas. Never return ORM models directly.

---

### ❌ PITFALL #12: Missing Error Response Standardization

**Issue**: Inconsistent error formats confuse API consumers.

```python
# ❌ WRONG - Different error formats
@router.get("/users/{user_id}")
def get_user(user_id: UUID):
    if not user:
        raise HTTPException(404, "Not found")  # Format 1

    if not user.is_active:
        return {"error": "User inactive"}  # Format 2

    try:
        ...
    except Exception as e:
        return {"message": str(e)}  # Format 3
```

```python
# ✅ CORRECT - Consistent error format
class ErrorResponse(BaseModel):
    success: bool = False
    errors: list[ErrorDetail]

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None

@router.get("/users/{user_id}")
def get_user(user_id: UUID):
    if not user:
        raise NotFoundError(
            message="User not found",
            error_code="USER_001"
        )

# Global exception handler ensures consistent format
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "errors": [
                {
                    "code": exc.error_code,
                    "message": exc.message,
                    "field": exc.field
                }
            ]
        }
    )
```

**Rule**: Use custom exceptions and global handlers for consistent error responses across all endpoints.

---

## Security & Authentication

### ❌ PITFALL #13: Logging Sensitive Information

**Issue**: Passwords, tokens, and secrets in logs create security vulnerabilities.

```python
# ❌ WRONG - Logs credentials
logger.info(f"User {email} logged in with password: {password}")  # NEVER!
logger.debug(f"JWT token: {access_token}")  # NEVER!
logger.info(f"Database URL: {settings.database_url}")  # Contains password!
```

```python
# ✅ CORRECT - Never log sensitive data
logger.info(f"User {email} logged in successfully")
logger.debug("Access token generated")
logger.info(f"Database connected: {settings.database_url.split('@')[1]}")  # Only host
```

**Rule**: NEVER log:
- Passwords (plain or hashed)
- Tokens (access, refresh, API keys)
- Full database URLs
- Credit card numbers
- Personal data (SSN, passport, etc.)

**Use Pydantic's `SecretStr`** for sensitive config values.

---

### ❌ PITFALL #14: Weak Password Requirements

**Issue**: No password strength requirements allow weak passwords.

```python
# ❌ WRONG - No validation
class UserCreate(BaseModel):
    password: str
```

```python
# ✅ CORRECT - Enforce minimum standards
class UserCreate(BaseModel):
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")

        # For admin/superuser, enforce stronger requirements
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)

        if not (has_upper and has_lower and has_digit):
            raise ValueError(
                "Password must contain uppercase, lowercase, and number"
            )

        return v
```

**Rule**: Enforce password requirements:
- Minimum 8 characters
- Mix of upper/lower case and numbers for sensitive accounts
- Use bcrypt with appropriate cost factor (12+)

---

### ❌ PITFALL #15: Not Validating Token Ownership

**Issue**: Users can access other users' resources using valid tokens.

```python
# ❌ WRONG - No ownership check
@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = session_crud.get(db, id=session_id)
    session_crud.deactivate(db, session_id=session_id)
    # BUG: User can revoke ANYONE'S session!
    return {"message": "Session revoked"}
```

```python
# ✅ CORRECT - Verify ownership
@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = session_crud.get(db, id=session_id)

    if not session:
        raise NotFoundError("Session not found")

    # CRITICAL: Check ownership
    if session.user_id != current_user.id:
        raise AuthorizationError("You can only revoke your own sessions")

    session_crud.deactivate(db, session_id=session_id)
    return {"message": "Session revoked"}
```

**Rule**: ALWAYS verify resource ownership before allowing operations. Check `resource.user_id == current_user.id`.

---

## Python Language Gotchas

### ❌ PITFALL #16: Using is for Value Comparison

**Issue**: `is` checks identity, not equality.

```python
# ❌ WRONG - Compares object identity
if user.role is "admin":  # May fail due to string interning
    grant_access()

if count is 0:  # Never works for integers outside -5 to 256
    return empty_response
```

```python
# ✅ CORRECT - Use == for value comparison
if user.role == "admin":
    grant_access()

if count == 0:
    return empty_response
```

**Rule**: Use `==` for value comparison. Only use `is` for:
- `is None` (checking for None)
- `is True` / `is False` (checking for exact boolean objects)

---

### ❌ PITFALL #17: Mutable Default Arguments

**Issue**: Default mutable arguments are shared across all function calls.

```python
# ❌ WRONG - list is shared!
def add_tag(user: User, tags: list = []):
    tags.append("default")
    user.tags.extend(tags)
    # Second call will have ["default", "default"]!
```

```python
# ✅ CORRECT - Use None and create new list
def add_tag(user: User, tags: list | None = None):
    if tags is None:
        tags = []
    tags.append("default")
    user.tags.extend(tags)
```

**Rule**: Never use mutable defaults (`[]`, `{}`). Use `None` and create inside function.

---

### ❌ PITFALL #18: Not Using Type Hints

**Issue**: Missing type hints prevent catching bugs at development time.

```python
# ❌ WRONG - No type hints
def create_user(email, password, is_active=True):
    user = User(email=email, password=password, is_active=is_active)
    db.add(user)
    return user
```

```python
# ✅ CORRECT - Full type hints
def create_user(
    email: str,
    password: str,
    is_active: bool = True
) -> User:
    user = User(email=email, password=password, is_active=is_active)
    db.add(user)
    return user
```

**Rule**: Add type hints to ALL functions. Use `pyright` to enforce type checking (`make type-check`).

---

---

### ❌ PITFALL #19: Importing Repositories Directly in Routes

**Issue**: Routes should never call repositories directly. The layered architecture requires all business operations to go through the service layer.

```python
# ❌ WRONG - Route bypasses service layer
from app.repositories.session import session_repo

@router.get("/sessions/me")
async def list_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await session_repo.get_user_sessions(db, user_id=current_user.id)
```

```python
# ✅ CORRECT - Route calls service injected via dependency
from app.api.dependencies.services import get_session_service
from app.services.session_service import SessionService

@router.get("/sessions/me")
async def list_sessions(
    current_user: User = Depends(get_current_active_user),
    session_service: SessionService = Depends(get_session_service),
    db: AsyncSession = Depends(get_db),
):
    return await session_service.get_user_sessions(db, user_id=current_user.id)
```

**Rule**: Routes import from `app.api.dependencies.services`, never from `app.repositories.*`. Services are the only callers of repositories.

---

## Checklist Before Committing

Use this checklist to catch issues before code review:

### Database
- [ ] No mutable defaults (`default=dict`, not `default={}`)
- [ ] All foreign keys have `index=True`
- [ ] Composite indexes for multi-column queries
- [ ] Soft deletes with `deleted_at` column
- [ ] All queries have `.order_by()` for pagination

### Validation
- [ ] All dict/JSON fields have size validators
- [ ] All string fields have `max_length`
- [ ] Validators applied to BOTH Create and Update schemas
- [ ] All fields have descriptions

### API Design
- [ ] Rate limits on all endpoints
- [ ] Response schemas (never return ORM models)
- [ ] Consistent error format with global handlers
- [ ] OpenAPI docs are clear and complete

### Security
- [ ] No passwords, tokens, or secrets in logs
- [ ] Password strength validation
- [ ] Resource ownership verification
- [ ] CORS configured (no wildcards in production)

### Architecture
- [ ] Routes never import repositories directly (only services)
- [ ] Services call repositories; repositories call database only
- [ ] New service registered in `app/api/dependencies/services.py`

### Python
- [ ] Use `==` not `is` for value comparison
- [ ] No mutable default arguments
- [ ] Type hints on all functions
- [ ] No unused imports or variables

---

## Prevention Tools

### Pre-commit Checks

Add these to your development workflow (or use `make validate`):

```bash
# Format + lint (Ruff replaces Black, isort, flake8)
uv run ruff format app tests
uv run ruff check app tests

# Type checking
uv run pyright app

# Run tests
IS_TEST=True uv run pytest --cov=app --cov-report=term-missing

# Check coverage (should be 80%+)
coverage report --fail-under=80
```

---

## When to Update This Document

Add new entries when:
1. A bug makes it to production
2. Multiple review cycles catch the same issue
3. An issue takes >30 minutes to debug
4. Security vulnerability discovered

---

**Last Updated**: 2026-02-28
**Issues Cataloged**: 19 common pitfalls
**Remember**: This document exists because these issues HAVE occurred. Don't skip it.
