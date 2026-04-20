# ARCHITECTURE

## Source files (project root)
- `js/config.js` — MAP_CONFIG, CARD_RARITY_WEIGHTS, PIECE_RARITY_WEIGHTS, LIVES constants
- `js/run.js` — RunState class: deck/pieces/lives/floor/phase lifecycle; re-exports generateNodes
- `js/map.js` — generateNodes, getFixedType, rollRoomTypes, renderMapScreen
- `js/rewards.js` — pickCardChoices, pickPieceChoices, render* screen functions for all room types
- `js/battle_state.js` — BattleState adapter: wraps engine2/GameState with old GameState API for ui.js; handles card play, enemy turn, redraw
- `js/enemies2.js` — enemy definitions (engine2): pieces + personality + createAI() → { selectMove(state) }
- `js/ui.js` — DOM render functions, interaction handlers, uiState, screen flow
- `js/main.js` — entry point, event listener wiring
- `style.css` — all styles
- `index.html` — HTML shell only; loads style.css + main.js
- `pieces/` — chess piece PNG assets

## engine2 (custom chess engine — no chess.js)
- `js/engine2/board.js` — 8×8 array board, get/set, sqToRC/rcToSq, inBounds
- `js/engine2/pieces.js` — PIECE_DEFS, makePiece(type, owner, overrides?)
- `js/engine2/movegen.js` — generateLegalActions(state, owner), applyMove, canCapture, isAttackedBy
- `js/engine2/state.js` — GameState class: play(action)→{ok,log}, undo(), canUndo(), toJSON/fromJSON
- `js/engine2/actions.js` — resolveAction(state, action, log), mutation helpers (_set, _setState, ...)
- `js/engine2/effects.js` — attachEffect(state, scope, effect), runHook(state, hookName, ctx)
- `js/engine2/tiles.js` — TILE_DEFS, makeTile(type)
- `js/engine2/view.js` — getView(state, perspective)
- `js/engine2/constants2.js` — HAND_SIZE, REDRAW_COUNTDOWN_START, VALID_PROMO, CHARACTER_PIECES, VALID_CHARACTERS
- `js/engine2/effect_types/shield.js`, `effect_types/explode.js`

## ai2 (engine2 AI)
- `js/ai2/search.js` — selectAction(state, owner, opts?) — minimax+alpha-beta
- `js/ai2/evaluate.js` — material/mobility/king-safety/aggression evaluation
- `js/ai2/order.js` — action ordering for alpha-beta

## cards2 (engine2 card system)
- `js/cards2/move_cards.js` — moveCard, knightMoveCard, bishop/rook/queenMoveCard, summonCard, curseCard, upgradeCard, CARD_CATALOG, STARTER_DECKS, buildStarterDeck, dealHand
- `js/cards2/capture_card.js` — snipeCard (ranged capture)
- `js/cards2/aoe_card.js` — AOE card
- `js/cards2/line_card.js` — line card
- `js/cards2/index.js` — barrel re-export

## Tests
- `tests/` — Vitest suite (246 tests)
- `tests/engine2/` — engine2 unit tests
- `tests/cards2/` — cards2 unit tests
- `tests/ai2/` — ai2 unit tests
- `tests/battle_state.test.js` — BattleState adapter tests
- `tests/enemies2.test.js` — enemies2 tests
- Run: `npm test`

## Docs
- `docs/GAME_DESIGN.md` — rules, mechanics
- `docs/CARDS.md` — card definitions, effects
- `docs/CHARACTERS.md` — characters, starting decks/pieces
- `docs/ENEMIES.md` — enemy configs, AI
- `docs/TASKS.md` — task log

## Stack
- Vite v5 (dev server)
- Vitest v2 (test runner)
- Vanilla JS ES modules — no React, no bundler output, no chess.js in game code
- No backend server, no HTTP

## Key design notes
- engine2 uses owner: 'player'|'enemy'|'neutral' (not chess.js color 'w'|'b')
- King-capture is the win condition (not checkmate); movegen includes pseudo-legal king-capture targets
- battle_state.js is the adapter between ui.js (old API shape) and engine2 internals
- enemy2 AI: defaultAI → single action/turn; doubleMoveAI → alternates warn+double pattern
- board dict in toDict(): { sq: { type: fullName, color: 'white'|'black' } } for UI compatibility
