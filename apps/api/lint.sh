#!/usr/bin/env bash
# Run before every commit — mirrors what CI runs exactly.
# Usage:  ./lint.sh           (from apps/api/)
set -e
.venv/bin/ruff check app/ tests/ scripts/ migrations/ --fix
.venv/bin/ruff format app/ tests/ scripts/ migrations/
echo "✓ ruff clean"
