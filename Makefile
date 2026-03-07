.PHONY: build test test-report test-coverage lint clean help

# Default target
help:
	@echo "automagent-core test & build targets"
	@echo ""
	@echo "  make build          Build schema then CLI"
	@echo "  make test           Run all tests (schema + CLI)"
	@echo "  make test-report    Run all tests and generate a summary report"
	@echo "  make test-coverage  Run all tests with coverage analysis"
	@echo "  make lint           Type-check all packages"
	@echo "  make clean          Remove build artifacts and reports"
	@echo ""

# Build schema first (CLI depends on it), then CLI
build:
	@echo "=== Building schema ==="
	npm run build -w packages/schema
	@echo "=== Building CLI ==="
	npm run build -w packages/cli

# Run all tests (fast, no coverage)
test: build
	npx vitest run

# Run all tests and print a summary report
test-report: build
	@echo ""
	@echo "========================================"
	@echo " Automagent Test Report"
	@echo "========================================"
	@echo ""
	@npx vitest run --reporter=verbose 2>&1; \
	EXIT_CODE=$$?; \
	echo ""; \
	echo "========================================"; \
	echo " Report saved: test-report.json"; \
	echo "========================================"; \
	exit $$EXIT_CODE

# Run all tests with line/branch/function coverage
test-coverage: build
	@echo ""
	@echo "========================================"
	@echo " Automagent Test + Coverage Report"
	@echo "========================================"
	@echo ""
	npx vitest run --coverage
	@echo ""
	@echo "========================================"
	@echo " HTML coverage report: coverage/index.html"
	@echo " JSON summary:         coverage/coverage-summary.json"
	@echo "========================================"

# Type-check all packages
lint:
	npm run lint

# Remove build outputs and reports
clean:
	npm run clean
	rm -rf coverage test-report.json
