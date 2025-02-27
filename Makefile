.PHONY: dev prod down clean

VERSION ?= latest
REGISTRY := gitea.pragmazest.com/cardosofelipe/app


dev:
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

push-images:
	docker build -t $(REGISTRY)/backend:$(VERSION) ./backend
	docker build -t $(REGISTRY)/frontend:$(VERSION) ./frontend
	docker push $(REGISTRY)/backend:$(VERSION)
	docker push $(REGISTRY)/frontend:$(VERSION)