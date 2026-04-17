# ARCHITECTURE

## Backend
- `backend/server.py` — FastAPI app, HTTP routes, entry point
- `backend/engine.py` — board state, turn resolution, python-chess wrapper
- `backend/cards.py` — card definitions, effect resolution
- `backend/encounters.py` — enemy configs, AI, encounter flow
- `backend/tests/` — pytest suite
- `backend/requirements.txt` — Python deps
- `backend/run.sh` — uvicorn dev server launcher

## Frontend
- `frontend/index.html` — single-page UI, 8x8 grid, hand/mana UI, fetches backend
- No bundler, no build step

## Docs
- `docs/GAME_DESIGN.md` — rules, mechanics
- `docs/CARDS.md` — card definitions, effects
- `docs/CHARACTERS.md` — characters, starting decks/pieces
- `docs/ENEMIES.md` — enemy configs, AI
- `docs/TASKS.md` — task log
- `docs/DECISIONS.md` — design decisions log

## Stack
- Python 3.11+
- FastAPI, uvicorn
- python-chess (move validation, board)
- pytest, httpx (tests)
- Vanilla JS / HTML / CSS grid

## Transport
- HTTP first; WebSocket later if needed
