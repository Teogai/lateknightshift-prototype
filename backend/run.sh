#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
python3 -m uvicorn backend.server:app --reload 2>/dev/null || python -m uvicorn backend.server:app --reload
