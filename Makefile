# MDJ Practice Manager - Development Makefile
# Provides convenient commands for local development on macOS

.PHONY: help install dev build test clean db-up db-down db-reset docker-up docker-down

# Default target
help:
	@echo "MDJ Practice Manager - Available Commands:"
	@echo ""
	@echo "  install     - Install all dependencies"
	@echo "  dev         - Start development servers (API + Web)"
	@echo "  build       - Build all applications"
	@echo "  test        - Run all tests"
	@echo "  clean       - Clean build artifacts and node_modules"
	@echo ""
	@echo "  db-up       - Start PostgreSQL database"
	@echo "  db-down     - Stop database"
	@echo "  db-reset    - Reset database (WARNING: destroys data)"
	@echo ""
	@echo "  docker-up   - Start all Docker services"
	@echo "  docker-down - Stop all Docker services"

# Installation
install:
	@echo "Installing dependencies..."
	npm install
	cd apps/api && npm install
	cd apps/web && npm install

# Development
dev:
	@echo "Starting development servers..."
	npm run dev

dev-api:
	@echo "Starting API development server..."
	npm run dev:api

dev-web:
	@echo "Starting Web development server..."
	npm run dev:web

# Build
build:
	@echo "Building applications..."
	npm run build

# Testing
test:
	@echo "Running tests..."
	npm run test

# Clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf apps/*/dist
	rm -rf apps/*/.next

# Database management
db-up:
	@echo "Starting PostgreSQL database..."
	docker-compose up -d postgres
	@echo "Waiting for database to be ready..."
	@sleep 5
	@docker-compose exec postgres pg_isready -U mdj -d mdj || echo "Database starting..."

db-down:
	@echo "Stopping database..."
	docker-compose stop postgres

db-reset:
	@echo "WARNING: This will destroy all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down -v
	docker-compose up -d postgres

# Docker management
docker-up:
	@echo "Starting all Docker services..."
	docker-compose up -d

docker-down:
	@echo "Stopping all Docker services..."
	docker-compose down

# Database connection
db-connect:
	@echo "Connecting to database..."
	docker-compose exec postgres psql -U mdj -d mdj

# Logs
logs:
	docker-compose logs -f

logs-api:
	cd apps/api && npm run start:dev

logs-web:
	cd apps/web && npm run dev