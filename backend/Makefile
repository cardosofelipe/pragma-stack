.PHONY: help lint lint-fix format format-check type-check test test-cov validate clean install-dev

# Virtual environment binaries
VENV_BIN = .venv/bin
PYTHON = $(VENV_BIN)/python
PIP = $(VENV_BIN)/pip
PYTEST = $(VENV_BIN)/pytest
RUFF = $(VENV_BIN)/ruff
MYPY = $(VENV_BIN)/mypy

# Default target
help:
	@echo "🚀 FastAPI Backend - Development Commands"
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
	@echo "Setup:"
	@echo "  make install-dev   - Install all development dependencies"
	@echo "  make clean         - Remove cache and build artifacts"

# ============================================================================
# Code Quality
# ============================================================================

lint:
	@echo "🔍 Running Ruff linter..."
	@$(RUFF) check app/ tests/

lint-fix:
	@echo "🔧 Running Ruff linter with auto-fix..."
	@$(RUFF) check --fix app/ tests/

format:
	@echo "✨ Formatting code with Ruff..."
	@$(RUFF) format app/ tests/

format-check:
	@echo "📋 Checking code formatting..."
	@$(RUFF) format --check app/ tests/

type-check:
	@echo "🔎 Running mypy type checking..."
	@$(MYPY) app/

validate: lint format-check type-check
	@echo "✅ All quality checks passed!"

# ============================================================================
# Testing
# ============================================================================

test:
	@echo "🧪 Running tests..."
	@IS_TEST=True PYTHONPATH=. $(PYTEST)

test-cov:
	@echo "🧪 Running tests with coverage..."
	@IS_TEST=True PYTHONPATH=. $(PYTEST) --cov=app --cov-report=term-missing --cov-report=html -n 0
	@echo "📊 Coverage report generated in htmlcov/index.html"

# ============================================================================
# Setup & Cleanup
# ============================================================================

install-dev:
	@echo "📦 Installing development dependencies..."
	@$(PIP) install -r requirements.txt
	@echo "✅ Development environment ready!"

clean:
	@echo "🧹 Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name ".coverage" -delete 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete!"
