#!/usr/bin/env bash
set -euo pipefail

echo "=== Automagent E2E Test (CLI + Hub) ==="
echo "Requires: docker compose up -d db + hub running on :3000"
echo ""

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CLI="$(pwd)/node_modules/.bin/automagent"
HUB_URL="http://localhost:3000"

echo "1. Health check..."
curl -sf "$HUB_URL/health" > /dev/null
echo "   PASS"

echo "2. Init agent..."
(cd "$TMPDIR" && NO_COLOR=1 $CLI init --quick --name e2e-test-agent)
echo "   PASS"

echo "3. Validate agent..."
(cd "$TMPDIR" && NO_COLOR=1 $CLI validate)
echo "   PASS"

echo "4. Push agent..."
(cd "$TMPDIR" && NO_COLOR=1 $CLI push --hub-url "$HUB_URL" --scope @test)
echo "   PASS"

echo "5. Pull agent to new file..."
(cd "$TMPDIR" && NO_COLOR=1 $CLI pull @test/e2e-test-agent -o pulled.yaml --hub-url "$HUB_URL")
test -f "$TMPDIR/pulled.yaml"
echo "   PASS"

echo "6. Validate pulled agent..."
(cd "$TMPDIR" && NO_COLOR=1 $CLI validate pulled.yaml)
echo "   PASS"

echo "7. Search for agent..."
SEARCH_OUTPUT=$(NO_COLOR=1 $CLI search e2e-test --hub-url "$HUB_URL" 2>&1)
echo "$SEARCH_OUTPUT" | grep -q "e2e-test-agent"
echo "   PASS"

echo ""
echo "=== All E2E tests passed ==="
