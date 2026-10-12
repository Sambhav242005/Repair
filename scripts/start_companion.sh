#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -x backend/.venv/bin/python ]]; then
  exec backend/.venv/bin/python -m companion.server "$@"
fi
exec python3 -m companion.server "$@"
