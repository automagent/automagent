#!/usr/bin/env bash
set -euo pipefail

echo "=== Automagent Smoke Test ==="

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CLI="$(pwd)/node_modules/.bin/automagent"

echo "1. Testing init --quick..."
(cd "$TMPDIR" && NO_COLOR=1 "$CLI" init --quick)
test -f "$TMPDIR/agent.yaml" || { echo "FAIL: agent.yaml not created"; exit 1; }
echo "   PASS"

echo "2. Testing validate..."
(cd "$TMPDIR" && NO_COLOR=1 "$CLI" validate)
echo "   PASS"

echo "3. Testing validate with bad file..."
echo "bad: yaml: content" > "$TMPDIR/bad.yaml"
if (cd "$TMPDIR" && NO_COLOR=1 "$CLI" validate bad.yaml 2>&1); then
  echo "FAIL: should have rejected bad.yaml"
  exit 1
fi
echo "   PASS (correctly rejected)"

echo "4. Testing import (CrewAI)..."
cat > "$TMPDIR/crew.yaml" << 'CREW'
role: Data Analyst
goal: Analyze data
backstory: Expert analyst
llm: gpt-4
CREW
(cd "$TMPDIR" && NO_COLOR=1 "$CLI" import crew.yaml --output imported.yaml --force)
test -f "$TMPDIR/imported.yaml" || { echo "FAIL: imported.yaml not created"; exit 1; }
echo "   PASS"

echo ""
echo "=== All smoke tests passed ==="
