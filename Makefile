# MangaTech - Makefile for development workflow

.PHONY: help install dev build test lint format clean dist pack

# Default target
help:
	@echo "MangaTech Development Commands:"
	@echo ""
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Start development server (renderer + main)"
	@echo "  make build       - Build the application"
	@echo "  make test        - Run tests"
	@echo "  make test-watch  - Run tests in watch mode"
	@echo "  make lint        - Run linter"
	@echo "  make lint-fix    - Run linter with auto-fix"
	@echo "  make format      - Format code with prettier"
	@echo "  make format-check- Check code formatting"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make dist        - Build and create distribution package"
	@echo "  make pack        - Create electron package"
	@echo ""

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Build the application
build:
	npm run build

# Run tests
test:
	npm run test

# Run tests in watch mode
test-watch:
	npm run test:watch

# Run linter
lint:
	npm run lint

# Run linter with auto-fix
lint-fix:
	npm run lint:fix

# Format code
format:
	npm run format

# Check code formatting
format-check:
	npm run format:check

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf release/
	rm -rf node_modules/.cache/

# Create distribution package
dist:
	npm run dist

# Create electron package
pack:
	npm run pack

# Quick start (install + dev)
start: install dev

# Full workflow (install + lint + test + build)
ci: install lint test build

# Development setup
setup: install
	@echo "Development environment ready!"
	@echo "Run 'make dev' to start the development server"