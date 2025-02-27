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
