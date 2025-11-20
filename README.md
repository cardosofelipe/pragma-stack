# PragmaStack

> **The Pragmatic Full-Stack Template. Production-ready, security-first, and opinionated.**

<!--
  TODO: Replace these static badges with dynamic CI/CD badges when GitHub Actions is set up
  Example: https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/backend-tests.yml/badge.svg
-->

[![Backend Unit Tests](https://img.shields.io/badge/backend_unit_tests-passing-success)](./backend/tests)
[![Backend Coverage](https://img.shields.io/badge/backend_coverage-97%25-brightgreen)](./backend/tests)
[![Frontend Unit Tests](https://img.shields.io/badge/frontend_unit_tests-passing-success)](./frontend/tests)
[![Frontend Coverage](https://img.shields.io/badge/frontend_coverage-97%25-brightgreen)](./frontend/tests)
[![E2E Tests](https://img.shields.io/badge/e2e_tests-passing-success)](./frontend/e2e)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

## 🤖 AI-Friendly Documentation

This project includes comprehensive documentation designed for AI coding assistants:

- **[AGENTS.md](./AGENTS.md)** - Framework-agnostic AI assistant context for PragmaStack
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code-specific guidance

These files provide AI assistants with the **PragmaStack** architecture, patterns, and best practices.

---

## Why PragmaStack?

Building a modern full-stack application often leads to "analysis paralysis" or "boilerplate fatigue". You spend weeks setting up authentication, testing, and linting before writing a single line of business logic.

**PragmaStack cuts through the noise.**

We provide a **pragmatic**, opinionated foundation that prioritizes:
- **Speed**: Ship features, not config files.
- **Robustness**: Security and testing are not optional.
- **Clarity**: Code that is easy to read and maintain.

Whether you're building a SaaS, an internal tool, or a side project, PragmaStack gives you a solid starting point without the bloat.

---

## ✨ Features

### 🔐 **Authentication & Security**
- JWT-based authentication with access + refresh tokens
- Session management with device tracking and revocation
- Password reset flow (email integration ready)
- Secure password hashing (bcrypt)
- CSRF protection, rate limiting, and security headers
- Comprehensive security tests (JWT algorithm attacks, session hijacking, privilege escalation)

### 👥 **Multi-Tenancy & Organizations**
- Full organization system with role-based access control (Owner, Admin, Member)
- Invite/remove members, manage permissions
- Organization-scoped data access
- User can belong to multiple organizations

### 🛠️ **Admin Panel**
- Complete user management (CRUD, activate/deactivate, bulk operations)
- Organization management (create, edit, delete, member management)
- Session monitoring across all users
- Real-time statistics dashboard
- Admin-only routes with proper authorization

### 🎨 **Modern Frontend**
- Next.js 15 with App Router and React 19
- **PragmaStack Design System** built on shadcn/ui + TailwindCSS
- Pre-configured theme with dark mode support (coming soon)
- Responsive, accessible components (WCAG AA compliant)
- Rich marketing landing page with animated components
- Live component showcase and documentation at `/dev`

### 🌍 **Internationalization (i18n)**
- Built-in multi-language support with next-intl v4
- Locale-based routing (`/en/*`, `/it/*`)
- Seamless language switching with LocaleSwitcher component
- SEO-friendly URLs and metadata per locale
- Translation files for English and Italian (easily extensible)
- Type-safe translations throughout the app

### 🎯 **Content & UX Features**
- **Toast notifications** with Sonner for elegant user feedback
- **Smooth animations** powered by Framer Motion
- **Markdown rendering** with syntax highlighting (GitHub Flavored Markdown)
- **Charts and visualizations** ready with Recharts
- **SEO optimization** with dynamic sitemap and robots.txt generation
- **Session tracking UI** with device information and revocation controls

### 🧪 **Comprehensive Testing**
- **Backend Testing**: ~97% unit test coverage
  - Unit, integration, and security tests
  - Async database testing with SQLAlchemy
  - API endpoint testing with fixtures
  - Security vulnerability tests (JWT attacks, session hijacking, privilege escalation)
- **Frontend Unit Tests**: ~97% coverage with Jest
  - Component testing
  - Hook testing
  - Utility function testing
- **End-to-End Tests**: Playwright with zero flaky tests
  - Complete user flows (auth, navigation, settings)
  - Parallel execution for speed
  - Visual regression testing ready

### 📚 **Developer Experience**
- Auto-generated TypeScript API client from OpenAPI spec
- Interactive API documentation (Swagger + ReDoc)
- Database migrations with Alembic helper script
- Hot reload in development for both frontend and backend
- Comprehensive code documentation and design system docs
- Live component playground at `/dev` with code examples
- Docker support for easy deployment
- VSCode workspace settings included

### 📊 **Ready for Production**
- Docker + docker-compose setup
- Environment-based configuration
- Database connection pooling
- Error handling and logging
- Health check endpoints
- Production security headers
- Rate limiting on sensitive endpoints
- SEO optimization with dynamic sitemaps and robots.txt
- Multi-language SEO with locale-specific metadata
- Performance monitoring and bundle analysis

---

## 🚀 Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern async Python web framework
- **[SQLAlchemy 2.0](https://www.sqlalchemy.org/)** - Powerful ORM with async support
- **[PostgreSQL](https://www.postgresql.org/)** - Robust relational database
- **[Alembic](https://alembic.sqlalchemy.org/)** - Database migrations
- **[Pydantic v2](https://docs.pydantic.dev/)** - Data validation with type hints
- **[pytest](https://pytest.org/)** - Testing framework with async support

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible component library
- **[next-intl](https://next-intl.dev/)** - Internationalization (i18n) with type safety
- **[TanStack Query](https://tanstack.com/query)** - Powerful data fetching/caching
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[Framer Motion](https://www.framer.com/motion/)** - Production-ready animation library
- **[Sonner](https://sonner.emilkowal.ski/)** - Beautiful toast notifications
- **[Recharts](https://recharts.org/)** - Composable charting library
- **[React Markdown](https://github.com/remarkjs/react-markdown)** - Markdown rendering with GFM support
- **[Playwright](https://playwright.dev/)** - End-to-end testing

### DevOps
- **[Docker](https://www.docker.com/)** - Containerization
- **[docker-compose](https://docs.docker.com/compose/)** - Multi-container orchestration
- **GitHub Actions** (coming soon) - CI/CD pipelines

---

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended) - [Install Docker](https://docs.docker.com/get-docker/)
- **OR manually:**
  - Python 3.12+
  - Node.js 18+ (Node 20+ recommended)
  - PostgreSQL 15+

---

## 🏃 Quick Start (Docker)

The fastest way to get started is with Docker:

```bash
# Clone the repository
git clone https://github.com/yourusername/fast-next-template.git
cd fast-next-template

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Start all services (backend, frontend, database)
docker-compose up

# In another terminal, run database migrations
docker-compose exec backend alembic upgrade head

# Create first superuser (optional)
docker-compose exec backend python -c "from app.init_db import init_db; import asyncio; asyncio.run(init_db())"
```

**That's it! 🎉**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

Default superuser credentials:
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Change these immediately in production!**

---

## 🛠️ Manual Setup (Development)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Initialize database with first superuser
python -c "from app.init_db import init_db; import asyncio; asyncio.run(init_db())"

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your backend URL

# Generate API client
npm run generate:api

# Start development server
npm run dev
```

Visit http://localhost:3000 to see your app!

---

## 📂 Project Structure

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes and dependencies
│   │   ├── core/           # Core functionality (auth, config, database)
│   │   ├── crud/           # Database operations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── tests/              # Backend tests (97% coverage)
│   ├── alembic/            # Database migrations
│   └── docs/               # Backend documentation
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Libraries and utilities
│   │   │   ├── api/       # API client (auto-generated)
│   │   │   └── stores/    # Zustand stores
│   │   └── hooks/         # Custom React hooks
│   ├── e2e/               # Playwright E2E tests
│   ├── tests/             # Unit tests (Jest)
│   └── docs/              # Frontend documentation
│       └── design-system/ # Comprehensive design system docs
│
├── docker-compose.yml      # Docker orchestration
├── docker-compose.dev.yml  # Development with hot reload
└── README.md              # You are here!
```

---

## 🧪 Testing

This template takes testing seriously with comprehensive coverage across all layers:

### Backend Unit & Integration Tests

**High coverage (~97%)** across all critical paths including security-focused tests.

```bash
cd backend

# Run all tests
IS_TEST=True pytest

# Run with coverage report
IS_TEST=True pytest --cov=app --cov-report=term-missing

# Run specific test file
IS_TEST=True pytest tests/api/test_auth.py -v

# Generate HTML coverage report
IS_TEST=True pytest --cov=app --cov-report=html
open htmlcov/index.html
```

**Test types:**
- **Unit tests**: CRUD operations, utilities, business logic
- **Integration tests**: API endpoints with database
- **Security tests**: JWT algorithm attacks, session hijacking, privilege escalation
- **Error handling tests**: Database failures, validation errors

### Frontend Unit Tests

**High coverage (~97%)** with Jest and React Testing Library.

```bash
cd frontend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test types:**
- Component rendering and interactions
- Custom hooks behavior
- State management
- Utility functions
- API integration mocks

### End-to-End Tests

**Zero flaky tests** with Playwright covering complete user journeys.

```bash
cd frontend

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run specific test file
npx playwright test auth-login.spec.ts

# Generate test report
npx playwright show-report
```

**Test coverage:**
- Complete authentication flows
- Navigation and routing
- Form submissions and validation
- Settings and profile management
- Session management
- Admin panel workflows (in progress)

---

## 🗄️ Database Migrations

The template uses Alembic for database migrations:

```bash
cd backend

# Generate migration from model changes
python migrate.py generate "description of changes"

# Apply migrations
python migrate.py apply

# Or do both in one command
python migrate.py auto "description"

# View migration history
python migrate.py list

# Check current revision
python migrate.py current
```

---

## 📖 Documentation

### AI Assistant Documentation

- **[AGENTS.md](./AGENTS.md)** - Framework-agnostic AI coding assistant context
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code-specific guidance and preferences

### Backend Documentation

- **[ARCHITECTURE.md](./backend/docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[CODING_STANDARDS.md](./backend/docs/CODING_STANDARDS.md)** - Code quality standards
- **[COMMON_PITFALLS.md](./backend/docs/COMMON_PITFALLS.md)** - Common mistakes to avoid
- **[FEATURE_EXAMPLE.md](./backend/docs/FEATURE_EXAMPLE.md)** - Step-by-step feature guide

### Frontend Documentation

- **[PragmaStack Design System](./frontend/docs/design-system/)** - Complete design system guide
  - Quick start, foundations (colors, typography, spacing)
  - Component library guide
  - Layout patterns, spacing philosophy
  - Forms, accessibility, AI guidelines
- **[ARCHITECTURE_FIX_REPORT.md](./frontend/docs/ARCHITECTURE_FIX_REPORT.md)** - Critical dependency injection patterns
- **[E2E Testing Guide](./frontend/e2e/README.md)** - E2E testing setup and best practices

### API Documentation

When the backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

---

## 🚢 Deployment

### Docker Production Deployment

```bash
# Build and start all services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Checklist

- [ ] Change default superuser credentials
- [ ] Set strong `SECRET_KEY` in backend `.env`
- [ ] Configure production database (PostgreSQL)
- [ ] Set `ENVIRONMENT=production` in backend
- [ ] Configure CORS origins for your domain
- [ ] Setup SSL/TLS certificates
- [ ] Configure email service for password resets
- [ ] Setup monitoring and logging
- [ ] Configure backup strategy
- [ ] Review and adjust rate limits
- [ ] Test security headers

---

## 🛣️ Roadmap & Status

### ✅ Completed
- [x] Authentication system (JWT, refresh tokens, session management)
- [x] User management (CRUD, profile, password change)
- [x] Organization system with RBAC (Owner, Admin, Member)
- [x] Admin panel (users, organizations, sessions, statistics)
- [x] **Internationalization (i18n)** with next-intl (English + Italian)
- [x] Backend testing infrastructure (~97% coverage)
- [x] Frontend unit testing infrastructure (~97% coverage)
- [x] Frontend E2E testing (Playwright, zero flaky tests)
- [x] Design system documentation
- [x] **Marketing landing page** with animated components
- [x] **`/dev` documentation portal** with live component examples
- [x] **Toast notifications** system (Sonner)
- [x] **Charts and visualizations** (Recharts)
- [x] **Animation system** (Framer Motion)
- [x] **Markdown rendering** with syntax highlighting
- [x] **SEO optimization** (sitemap, robots.txt, locale-aware metadata)
- [x] Database migrations with helper script
- [x] Docker deployment
- [x] API documentation (OpenAPI/Swagger)

### 🚧 In Progress
- [ ] Email integration (templates ready, SMTP pending)

### 🔮 Planned
- [ ] GitHub Actions CI/CD pipelines
- [ ] Dynamic test coverage badges from CI
- [ ] E2E test coverage reporting
- [ ] Additional languages (Spanish, French, German, etc.)
- [ ] Additional authentication methods (OAuth, SSO)
- [ ] Real-time notifications with WebSockets
- [ ] Webhook system
- [ ] File upload/storage (S3-compatible)
- [ ] Audit logging system
- [ ] API versioning example


---

## 🤝 Contributing

Contributions are welcome! Whether you're fixing bugs, improving documentation, or proposing new features, we'd love your help.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation as needed
4. **Run tests** to ensure everything works
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to your branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- Write tests for new features (aim for >90% coverage)
- Follow the existing architecture patterns
- Update documentation when adding features
- Keep commits atomic and well-described
- Be respectful and constructive in discussions

### Reporting Issues

Found a bug? Have a suggestion? [Open an issue](https://github.com/yourusername/fast-next-template/issues)!

Please include:
- Clear description of the issue/suggestion
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Environment details (OS, Python/Node version, etc.)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

**TL;DR**: You can use this template for any purpose, commercial or non-commercial. Attribution is appreciated but not required!

---

## 🙏 Acknowledgments

This template is built on the shoulders of giants:

- [FastAPI](https://fastapi.tiangolo.com/) by Sebastián Ramírez
- [Next.js](https://nextjs.org/) by Vercel
- [shadcn/ui](https://ui.shadcn.com/) by shadcn
- [TanStack Query](https://tanstack.com/query) by Tanner Linsley
- [Playwright](https://playwright.dev/) by Microsoft
- And countless other open-source projects that make modern development possible

---

## 💬 Questions?

- **Documentation**: Check the `/docs` folders in backend and frontend
- **Issues**: [GitHub Issues](https://github.com/yourusername/fast-next-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/fast-next-template/discussions)

---

## ⭐ Star This Repo

If this template saves you time, consider giving it a star! It helps others discover the project and motivates continued development.

**Happy coding! 🚀**

---

<div align="center">
Made with ❤️ by a developer who got tired of rebuilding the same boilerplate
</div>
