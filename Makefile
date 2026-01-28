# MangaTech - Makefile for development workflow

.PHONY: help install dev build test lint format clean dist dist-win dist-linux dist-all pack

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
	@echo "  make dist        - Build and create distribution package (host platform)"
	@echo "  make dist-win    - Build and create distribution package for Windows"
	@echo "  make dist-linux  - Build and create distribution package for Linux"
	@echo "  make dist-all    - Build and create distribution package for both Win/Linux"
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
	npm run clean

# Create distribution package (host platform)
dist:
	npm run dist

# Create distribution package for Windows
dist-win:
	npm run dist:win

# Create distribution package for Linux
dist-linux:
	npm run dist:linux

# Create distribution package for both platforms
dist-all:
	npm run dist:all

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