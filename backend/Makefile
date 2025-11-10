.PHONY: help lint lint-fix format format-check type-check test test-cov validate clean install-dev sync

# Default target
help:
	@echo "🚀 FastAPI Backend - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install-dev   - Install all dependencies with uv (includes dev)"
	@echo "  make sync          - Sync dependencies from uv.lock"
	@echo ""
	@echo "Quality Checks:"
	@echo "  make lint          - Run Ruff linter (check only)"
	@echo "  make lint-fix      - Run Ruff linter with auto-fix"
	@echo "  make format        - Format code with Ruff"
	@echo "  make format-check  - Check if code is formatted"
	@echo "  make type-check    - Run mypy type checking"
	@echo "  make validate      - Run all checks (lint + format + types)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run pytest"
	@echo "  make test-cov      - Run pytest with coverage report"
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
	@echo "🔎 Running mypy type checking..."
	@uv run mypy app/

validate: lint format-check type-check
	@echo "✅ All quality checks passed!"

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
# Cleanup
# ============================================================================

clean:
	@echo "🧹 Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".uv_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name ".coverage" -delete 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete!"
