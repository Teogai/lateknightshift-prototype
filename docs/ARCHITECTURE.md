# ARCHITECTURE

## Source files (project root)
- `js/config.js` — MAP_CONFIG, CARD_RARITY_WEIGHTS, PIECE_RARITY_WEIGHTS, LIVES constants
- `js/cards.js` — card factories, STARTER_DECKS, CARD_CATALOG, upgradeCard, buildStarterDeck, dealHand
- `js/run.js` — RunState class: deck/pieces/lives/floor/phase lifecycle; re-exports generateNodes
- `js/map.js` — generateNodes, getFixedType, rollRoomTypes, renderMapScreen
- `js/rewards.js` — pickCardChoices, pickPieceChoices, render* screen functions for all room types
- `js/engine.js` — GameState class + barrel re-exports; import from here for public API
- `js/engine/constants.js` — game constants (STARTING_MANA, HAND_SIZE, VALID_PROMO, CHARACTER_PIECES, VALID_CHARACTERS)
- `js/engine/board.js` — standalone board helpers: boardToDict, knightAttacks, makeBoard, move generation, attack geometry, pseudoLegal/geometric move enumeration
- `js/enemies.js` — enemy definitions: pieces + personality + createAI() per enemy (ENEMIES, VALID_ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, BOSS_ENEMY)
- `js/ai.js` — minimax+alpha-beta enemy engine: generateMoves, makeMove/unmakeMove, evaluate, selectMove
- `js/ui.js` — DOM render functions, interaction handlers, uiState, screen flow
- `js/main.js` — entry point, event listener wiring
- `style.css` — all styles
- `index.html` — HTML shell only; loads style.css + main.js
- `pieces/` — chess piece PNG assets

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
