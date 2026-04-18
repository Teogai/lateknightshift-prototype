# CLAUDE.md

## Read first
- `docs/ARCHITECTURE.md` — file-purpose map, locate code
- Load only docs relevant to current task; don't read all
- Never dump full context into every doc

## TDD loop
1. Write failing test in `backend/tests/`
2. Run test, confirm fails
3. Write minimal code to pass
4. Run test, confirm passes
5. Refactor if needed, tests still green
6. Update affected `docs/*.md` (bullets only)
7. Commit

## Commits
- Lowercase imperative, <50 chars
- One commit per passing feature, not per file
- Run `pytest` before every commit
- Update relevant md before commit

## Log formats
- `docs/TASKS.md`: `[YYYY-MM-DD] done: <x>` / `[YYYY-MM-DD] todo: <x>`
- `docs/DECISIONS.md`: `[YYYY-MM-DD] <decision> - <reason <10 words>`

## Doc rules
- Flat bullets, no prose, <200 lines per file
- Split by concern; link between docs instead of duplicating

## Comms
- Terse. No filler. Skip "Let me...", "I'll now...", "Great!"
- One-line question when blocked
- Report done per task, one line

## Stack
- Python 3.11+, FastAPI, python-chess, pytest, httpx
- Frontend: single `frontend/index.html`, vanilla JS, CSS grid
- No build tools, no bundler
- HTTP first, WebSocket later

## Run (local)
- Activate venv first: `source .venv/bin/activate` (Linux/Mac) or `.venv\Scripts\activate` (Windows)
- Tests: `.venv/Scripts/python -m pytest backend/tests/ -v`
- Server: `bash backend/run.sh` or `.venv/Scripts/python -m uvicorn backend.server:app --reload`
- Windows PowerShell: `.venv\Scripts\python.exe -m pytest backend/tests/ -v`

## Frontend testing
- Use `preview_eval` with JS selectors to inspect state — not `preview_screenshot`
- e.g. `document.getElementById('deck-info').textContent` or `gameState.discard_size`
- Screenshots are slow and unreliable; JS queries are fast and exact
- Before starting backend for tests: check if it's already running (e.g. `netstat -ano | grep :8000`)
  - If running: ask user whether to kill it or skip testing
- After tests complete: always stop the backend (`preview_stop`)

## Run (devcontainer)
- No venv needed inside container
- Tests: `python -m pytest backend/tests/ -v`
- Server: `bash backend/run.sh`
