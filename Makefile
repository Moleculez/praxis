.PHONY: dev dev-down test-py test-js test lint typecheck migrate format

dev:
	docker compose up -d

dev-down:
	docker compose down

test-py:
	cd services/backend && python -m pytest -q

test-js:
	cd apps/web && pnpm test

test: test-py test-js

lint:
	ruff check services/
	cd apps/web && pnpm lint

typecheck:
	mypy --strict services/
	cd apps/web && pnpm typecheck

migrate:
	alembic upgrade head

format:
	ruff format services/
	cd apps/web && pnpm format
