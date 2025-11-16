.PHONY: dev dev-full prod down clean clean-slate

VERSION ?= latest
REGISTRY := gitea.pragmazest.com/cardosofelipe/app


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

prod:
	docker compose up --build -d

down:
	docker compose down

deploy:
	docker compose -f docker-compose.deploy.yml pull
	docker compose -f docker-compose.deploy.yml up -d

clean:
	docker compose down -

# WARNING! THIS REMOVES CONTAINERS AND VOLUMES AS WELL - DO NOT USE THIS UNLESS YOU WANT TO START OVER WITH DATA AND ALL
clean-slate:
	docker compose down -v

push-images:
	docker build -t $(REGISTRY)/backend:$(VERSION) ./backend
	docker build -t $(REGISTRY)/frontend:$(VERSION) ./frontend
	docker push $(REGISTRY)/backend:$(VERSION)
	docker push $(REGISTRY)/frontend:$(VERSION)