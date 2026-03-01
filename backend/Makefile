.PHONY: help lint lint-fix format format-check type-check test test-cov validate clean install-dev sync check-docker install-e2e test-e2e test-e2e-schema test-all dep-audit license-check audit validate-all check

# Prevent a stale VIRTUAL_ENV in the caller's shell from confusing uv
unexport VIRTUAL_ENV

# Default target
help:
	@echo "🚀 FastAPI Backend - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install-dev   - Install all dependencies with uv (includes dev)"
	@echo "  make install-e2e   - Install E2E test dependencies (requires Docker)"
	@echo "  make sync          - Sync dependencies from uv.lock"
	@echo ""
	@echo "Quality Checks:"
	@echo "  make lint          - Run Ruff linter (check only)"
	@echo "  make lint-fix      - Run Ruff linter with auto-fix"
	@echo "  make format        - Format code with Ruff"
	@echo "  make format-check  - Check if code is formatted"
	@echo "  make type-check    - Run pyright type checking"
	@echo "  make validate      - Run all checks (lint + format + types)"
	@echo ""
	@echo "Security & Audit:"
	@echo "  make dep-audit     - Scan dependencies for known vulnerabilities"
	@echo "  make license-check - Check dependency license compliance"
	@echo "  make audit         - Run all security audits (deps + licenses)"
	@echo "  make validate-all  - Run all quality + security checks"
	@echo "  make check         - Full pipeline: quality + security + tests"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run pytest (unit/integration, SQLite)"
	@echo "  make test-cov      - Run pytest with coverage report"
	@echo "  make test-e2e      - Run E2E tests (PostgreSQL, requires Docker)"
	@echo "  make test-e2e-schema - Run Schemathesis API schema tests"
	@echo "  make test-all      - Run all tests (unit + E2E)"
	@echo "  make check-docker  - Check if Docker is available"
	@echo "  make check         - Full pipeline: quality + security + tests"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove cache and build artifacts"

# ============================================================================
# Setup & Cleanup
# ============================================================================

install-dev:
	@echo "📦 Installing all dependencies with uv (includes dev)..."
	@uv sync --extra dev
	@echo "✅ Development environment ready!"

sync:
	@echo "🔄 Syncing dependencies from uv.lock..."
	@uv sync --extra dev
	@echo "✅ Dependencies synced!"

# ============================================================================
# Code Quality
# ============================================================================

lint:
	@echo "🔍 Running Ruff linter..."
	@uv run ruff check app/ tests/

lint-fix:
	@echo "🔧 Running Ruff linter with auto-fix..."
	@uv run ruff check --fix app/ tests/

format:
	@echo "✨ Formatting code with Ruff..."
	@uv run ruff format app/ tests/

format-check:
	@echo "📋 Checking code formatting..."
	@uv run ruff format --check app/ tests/

type-check:
	@echo "🔎 Running pyright type checking..."
	@uv run pyright app/

validate: lint format-check type-check
	@echo "✅ All quality checks passed!"

# ============================================================================
# Security & Audit
# ============================================================================

dep-audit:
	@echo "🔒 Scanning dependencies for known vulnerabilities..."
	@# CVE-2024-23342: ecdsa timing attack via python-jose (transitive). No fix available.
	@# We only use HS256 (not ECDSA signing), so this is not exploitable. Track python-jose replacement separately.
	@uv run pip-audit --desc --skip-editable --ignore-vuln CVE-2024-23342
	@echo "✅ No known vulnerabilities found!"

license-check:
	@echo "📜 Checking dependency license compliance..."
	@uv run pip-licenses --fail-on="GPL-3.0-or-later;AGPL-3.0-or-later" --format=plain
	@echo "✅ All dependency licenses are compliant!"

audit: dep-audit license-check
	@echo "✅ All security audits passed!"

validate-all: validate audit
	@echo "✅ All quality + security checks passed!"

check: validate-all test
	@echo "✅ Full validation pipeline complete!"

# ============================================================================
# Testing
# ============================================================================

test:
	@echo "🧪 Running tests..."
	@IS_TEST=True PYTHONPATH=. uv run pytest

test-cov:
	@echo "🧪 Running tests with coverage..."
	@IS_TEST=True PYTHONPATH=. uv run pytest --cov=app --cov-report=term-missing --cov-report=html -n 16
	@echo "📊 Coverage report generated in htmlcov/index.html"

# ============================================================================
# E2E Testing (requires Docker)
# ============================================================================

check-docker:
	@docker info > /dev/null 2>&1 || (echo ""; \
		echo "Docker is not running!"; \
		echo ""; \
		echo "E2E tests require Docker to be running."; \
		echo "Please start Docker Desktop or Docker Engine and try again."; \
		echo ""; \
		echo "Quick start:"; \
		echo "  macOS/Windows: Open Docker Desktop"; \
		echo "  Linux: sudo systemctl start docker"; \
		echo ""; \
		exit 1)
	@echo "Docker is available"

install-e2e:
	@echo "📦 Installing E2E test dependencies..."
	@uv sync --extra dev --extra e2e
	@echo "✅ E2E dependencies installed!"

test-e2e: check-docker
	@echo "🧪 Running E2E tests with PostgreSQL..."
	@IS_TEST=True PYTHONPATH=. uv run pytest tests/e2e/ -v --tb=short -n 0
	@echo "✅ E2E tests complete!"

test-e2e-schema: check-docker
	@echo "🧪 Running Schemathesis API schema tests..."
	@IS_TEST=True PYTHONPATH=. uv run pytest tests/e2e/ -v -m "schemathesis" --tb=short -n 0

test-all:
	@echo "🧪 Running ALL tests (unit + E2E)..."
	@$(MAKE) test
	@$(MAKE) test-e2e

# ============================================================================
# Cleanup
# ============================================================================

clean:
	@echo "🧹 Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pyright" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".uv_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name ".coverage" -delete 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete!"
