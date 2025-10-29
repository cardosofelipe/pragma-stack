# FastNext Stack

A modern, Docker-ready full-stack template combining FastAPI, Next.js, and PostgreSQL. Built for developers who need a robust starting point for web applications with TypeScript frontend and Python backend.

## Features

- 🐍 **FastAPI Backend**
    - Python 3.12 with modern async support
    - SQLAlchemy ORM with async capabilities
    - Alembic migrations
    - JWT authentication ready
    - Pydantic data validation
    - Comprehensive testing setup

- ⚛️ **Next.js Frontend**
    - React 19 with TypeScript
    - Tailwind CSS for styling
    - Modern app router architecture
    - Built-in API route support
    - SEO-friendly by default

- 🛠️ **Development Experience**
    - Docker-based development environment
    - Hot-reloading for both frontend and backend
    - Unified development workflow
    - Comprehensive testing setup
    - Type safety across the stack

- 🚀 **Production Ready**
    - Multi-stage Docker builds
    - Production-optimized configurations
    - Environment-based settings
    - Health checks and container orchestration
    - CORS security configured

## Quick Start

1. Clone the template:
```bash
git clone https://github.com/yourusername/fastnext-stack myproject
cd myproject
```

2. Create environment files:
```bash
cp .env.template .env
```

3. Start development environment:
```bash
make dev
```

4. Access the applications:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
fast-next-template/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── alembic/        # Database migrations
│   │   ├── api/            # API routes and dependencies
│   │   ├── core/           # Core functionality (auth, config, db)
│   │   ├── crud/           # Database CRUD operations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   ├── init_db.py      # Database initialization script
│   │   └── main.py         # FastAPI application entry
│   ├── tests/              # Comprehensive test suite
│   ├── migrate.py          # Migration helper CLI
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Multi-stage container build
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   └── components/    # React components
│   ├── public/            # Static assets
│   └── Dockerfile         # Next.js container build
├── docker-compose.yml      # Production compose configuration
├── docker-compose.dev.yml  # Development compose configuration
├── docker-compose.deploy.yml # Deployment with pre-built images
└── .env.template          # Environment variables template
```

## Backend Features

### Authentication System
- **JWT-based authentication** with access and refresh tokens
- **User management** with email/password authentication
- **Password hashing** using bcrypt
- **Token expiration** handling (access: 1 day, refresh: 60 days)
- **Optional authentication** support for public/private endpoints
- **Superuser** authorization support

### Database Management
- **PostgreSQL** with optimized connection pooling
- **Alembic migrations** with auto-generation support
- **Migration CLI helper** (`migrate.py`) for easy database management:
  ```bash
  python migrate.py generate "add users table"  # Generate migration
  python migrate.py apply                        # Apply migrations
  python migrate.py list                         # List all migrations
  python migrate.py current                      # Show current revision
  python migrate.py check                        # Check DB connection
  python migrate.py auto "message"               # Generate and apply
  ```
- **Automatic database initialization** with first superuser creation

### Testing Infrastructure
- **92 comprehensive tests** covering all core functionality
- **SQLite in-memory** database for fast test execution
- **Auth test utilities** for easy endpoint testing
- **Mocking support** for external dependencies
- **Test fixtures** for common scenarios

### Security Utilities
- **Upload token system** for secure file operations
- **HMAC-based signing** for token validation
- **Time-limited tokens** with expiration
- **Nonce support** to prevent token reuse

## Development

### Running Tests

```bash
# Backend tests
cd backend
source .venv/bin/activate
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Database Migrations

```bash
# Using the migration helper
python migrate.py generate "your migration message"
python migrate.py apply

# Or using alembic directly
alembic revision --autogenerate -m "your message"
alembic upgrade head
```

### First Superuser

The backend automatically creates a superuser on initialization. Configure via environment variables:

```bash
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=admin123
```

If not configured, defaults to `admin@example.com` / `admin123`.

## Deployment

### Option 1: Build and Deploy Locally

For production with local builds:

```bash
docker-compose up -d
```

### Option 2: Deploy with Pre-built Images

For deployment using images from a container registry:

1. Build and push your images:
```bash
# Build images
docker-compose build

# Tag for your registry
docker tag fast-next-template-backend:latest your-registry/your-project-backend:latest
docker tag fast-next-template-frontend:latest your-registry/your-project-frontend:latest

# Push to registry
docker push your-registry/your-project-backend:latest
docker push your-registry/your-project-frontend:latest
```

2. Update `docker-compose.deploy.yml` with your image references:
```yaml
services:
  backend:
    image: your-registry/your-project-backend:latest
  frontend:
    image: your-registry/your-project-frontend:latest
```

3. Deploy:
```bash
docker-compose -f docker-compose.deploy.yml up -d
```

### Environment Variables

Create a `.env` file based on `.env.template`:

```bash
# Project
PROJECT_NAME=MyApp
VERSION=1.0.0

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=app
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=8000
SECRET_KEY=your-secret-key-change-this-in-production
ENVIRONMENT=production
DEBUG=false
BACKEND_CORS_ORIGINS=["http://localhost:3000"]

# First Superuser
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=admin123

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Available Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login (JSON)
- `POST /api/v1/auth/login/oauth` - OAuth2-compatible login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/change-password` - Change password
- `GET /api/v1/auth/me` - Get current user info

## Contributing

This is a template project. Feel free to fork and customize for your needs.

## License

MIT License - feel free to use this template for your projects.
