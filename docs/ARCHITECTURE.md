# ARCHITECTURE

## Frontend JS modules
- `frontend/js/cards.js` — card factories, STARTER_DECKS, buildStarterDeck, dealHand
- `frontend/js/engine.js` — GameState class, board logic, chess.js wrapper, all card-play methods, endTurn AI
- `frontend/js/ui.js` — DOM render functions, interaction handlers, uiState
- `frontend/js/main.js` — entry point, event listener wiring
- `frontend/style.css` — all styles (extracted from old index.html)
- `frontend/index.html` — HTML shell only; loads style.css + main.js

## Tests
- `tests/` — Vitest suite (58 tests, 1-1 port of former pytest suite)
- Run: `npm test`

## Docs
- `docs/GAME_DESIGN.md` — rules, mechanics
- `docs/CARDS.md` — card definitions, effects
- `docs/CHARACTERS.md` — characters, starting decks/pieces
- `docs/ENEMIES.md` — enemy configs, AI
- `docs/TASKS.md` — task log
- `docs/DECISIONS.md` — design decisions log

## Stack
- chess.js v1 (move validation, board, attack detection)
- Vite v5 (dev server, serves frontend/)
- Vitest v2 (test runner)
- Vanilla JS ES modules — no React, no bundler output
- No backend server, no HTTP

## Key design notes
- `chess.js get()` returns `false` (not `null`) for empty squares — use truthiness checks
- King-capture is the win condition (not checkmate); chess.js never generates king-capture moves so they are handled manually via `remove()`+`put()`
- FEN trick in `_getMovesForSq`: temporarily loads FEN with altered turn to get moves for either color; save/restore via piece map (not FEN) to handle positions missing a king
- AI move execution uses manual `remove()`+`put()` to avoid FEN validation issues
- `pseudoLegalMovesFor(color)` also finds king-capture moves using `isAttacked()` + direct geometry (`_pieceAttacks`)

## Former backend (removed)
- Was: Python/FastAPI + python-chess + pytest + httpx
- Removed in favour of frontend-only architecture (no multi-user need, simpler context for Claude Code)
