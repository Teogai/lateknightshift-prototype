#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
python -m uvicorn backend.server:app --reload
