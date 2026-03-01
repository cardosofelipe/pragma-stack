.PHONY: help dev dev-full prod down logs logs-dev clean clean-slate drop-db reset-db push-images deploy scan-images

VERSION ?= latest
REGISTRY ?= ghcr.io/cardosofelipe/pragma-stack

# Default target
help:
	@echo "FastAPI + Next.js Full-Stack Template"
	@echo ""
	@echo "Development:"
	@echo "  make dev           - Start backend + db (frontend runs separately)"
	@echo "  make dev-full      - Start all services including frontend"
	@echo "  make down          - Stop all services"
	@echo "  make logs-dev      - Follow dev container logs"
	@echo ""
	@echo "Database:"
	@echo "  make drop-db       - Drop and recreate empty database"
	@echo "  make reset-db      - Drop database and apply all migrations"
	@echo ""
	@echo "Production:"
	@echo "  make prod          - Start production stack"
	@echo "  make deploy        - Pull and deploy latest images"
	@echo "  make push-images   - Build and push images to registry"
	@echo "  make scan-images   - Scan production images for CVEs (requires trivy)"
	@echo "  make logs          - Follow production container logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Stop containers"
	@echo "  make clean-slate   - Stop containers AND delete volumes (DATA LOSS!)"
	@echo ""
	@echo "Subdirectory commands:"
	@echo "  cd backend && make help   - Backend-specific commands"
	@echo "  cd frontend && npm run    - Frontend-specific commands"

# ============================================================================
# Development
# ============================================================================

dev:
	# Bring up all dev services except the frontend
	docker compose -f docker-compose.dev.yml up --build -d --scale frontend=0
	@echo ""
	@echo "Frontend is not started by 'make dev'."
	@echo "To run the frontend locally, open a new terminal and run:"
	@echo "    cd frontend && npm run dev"

dev-full:
	# Bring up all dev services including the frontend (full stack)
	docker compose -f docker-compose.dev.yml up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-dev:
	docker compose -f docker-compose.dev.yml logs -f

# ============================================================================
# Database Management
# ============================================================================

drop-db:
	@echo "Dropping local database..."
	@docker compose -f docker-compose.dev.yml exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS app WITH (FORCE);" 2>/dev/null || \
		docker compose -f docker-compose.dev.yml exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS app;"
	@docker compose -f docker-compose.dev.yml exec -T db psql -U postgres -c "CREATE DATABASE app;"
	@echo "Database dropped and recreated (empty)"

reset-db: drop-db
	@echo "Applying migrations..."
	@cd backend && uv run python migrate.py --local apply
	@echo "Database reset complete!"

# ============================================================================
# Production / Deployment
# ============================================================================

prod:
	docker compose up --build -d

deploy:
	docker compose -f docker-compose.deploy.yml pull
	docker compose -f docker-compose.deploy.yml up -d

push-images:
	docker build -t $(REGISTRY)/backend:$(VERSION) ./backend
	docker build -t $(REGISTRY)/frontend:$(VERSION) ./frontend
	docker push $(REGISTRY)/backend:$(VERSION)
	docker push $(REGISTRY)/frontend:$(VERSION)

scan-images:
	@docker info > /dev/null 2>&1 || (echo "❌ Docker is not running!"; exit 1)
	@echo "🐳 Building and scanning production images for CVEs..."
	docker build -t $(REGISTRY)/backend:scan --target production ./backend
	docker build -t $(REGISTRY)/frontend:scan --target runner ./frontend
	@echo ""
	@echo "=== Backend Image Scan ==="
	@if command -v trivy > /dev/null 2>&1; then \
		trivy image --severity HIGH,CRITICAL --exit-code 1 $(REGISTRY)/backend:scan; \
	else \
		echo "ℹ️  Trivy not found locally, using Docker to run Trivy..."; \
		docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --exit-code 1 $(REGISTRY)/backend:scan; \
	fi
	@echo ""
	@echo "=== Frontend Image Scan ==="
	@if command -v trivy > /dev/null 2>&1; then \
		trivy image --severity HIGH,CRITICAL --exit-code 1 $(REGISTRY)/frontend:scan; \
	else \
		docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --exit-code 1 $(REGISTRY)/frontend:scan; \
	fi
	@echo "✅ No HIGH/CRITICAL CVEs found in production images!"

# ============================================================================
# Cleanup
# ============================================================================

clean:
	docker compose down

# WARNING! THIS REMOVES CONTAINERS AND VOLUMES AS WELL - DO NOT USE THIS UNLESS YOU WANT TO START OVER WITH DATA AND ALL
clean-slate:
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
