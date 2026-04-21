# ARCHITECTURE

## Source files (project root)
- `config/game.js` — MAP_CONFIG, rarity weights, lives, reward counts, hand size, redraw countdown
- `config/enemies.js` — ENEMIES data (pieces, personality, aiType)
- `config/cards.js` — CARD_DEFS, STARTER_DECK_DEFS
- `config/charms.js` — CHARM_DEFS, CHARM_RARITY_WEIGHTS
- `config/characters.js` — CHARACTERS (name, pieces)
- `config/path.js` — FIXED_PATH, ROOM_META
- `js/run.js` — RunState class: deck/pieces/lives/floor/phase lifecycle; re-exports generateNodes
- `js/map.js` — imports FIXED_PATH from config/path.js; exports generateNodes, renderMapScreen
- `js/rewards.js` — pickCardChoices, pickPieceChoices, pickPieceCardChoices, pickCharmChoices, applyCharmToCard, render* screen functions for all room types
- `js/battle_state.js` — BattleState adapter: wraps engine2/GameState with old GameState API for ui.js; handles card play, enemy turn, redraw
- `js/enemies2.js` — imports ENEMIES from config/enemies.js; attaches createAI() factories at load time
- `js/ui.js` — DOM render functions, interaction handlers, uiState, screen flow
- `js/main.js` — entry point, event listener wiring
- `css/base.css` — reset, variables, layout, buttons, status
- `css/board.css` — board squares, pieces, placement board, status badges
- `css/cards.css` — hand, card styling, card grid, keywords, tooltips
- `css/map.css` — map screen, path track, nodes, connectors
- `css/room.css` — room screen, reward buttons, piece choices
- `css/enemy.css` — enemy panel, type badges, abilities
- `css/screens.css` — victory, defeat, complete screens
- `css/modals.css` — promotion modal, pile viewer modal
- `css/responsive.css` — mobile + desktop media queries
- `index.html` — HTML shell only; loads all css/*.css + main.js
- `img/` — chess piece PNG assets

## engine2 (custom chess engine — no chess.js)
- `js/engine2/board.js` — 8×8 array board, get/set, sqToRC/rcToSq, inBounds
- `js/engine2/pieces.js` — PIECE_DEFS, makePiece(type, owner, overrides?)
- `js/engine2/movegen.js` — generateLegalActions(state, owner), applyMove, canCapture, isAttackedBy
- `js/engine2/state.js` — GameState class: play(action)→{ok,log}, undo(), canUndo(), toJSON/fromJSON
- `js/engine2/actions.js` — resolveAction(state, action, log), mutation helpers (_set, _setState, ...)
- `js/engine2/effects.js` — attachEffect(state, scope, effect), runHook(state, hookName, ctx)
- `js/engine2/tiles.js` — TILE_DEFS, makeTile(type)
- `js/engine2/view.js` — getView(state, perspective)
- `js/engine2/constants2.js` — re-exports HAND_SIZE, REDRAW_COUNTDOWN_START, VALID_PROMO from config/game.js and CHARACTER_PIECES, VALID_CHARACTERS from config/characters.js
- `js/engine2/effect_types/shield.js`, `effect_types/explode.js`

## ai2 (engine2 AI)
- `js/ai2/search.js` — selectAction(state, owner, opts?) — minimax+alpha-beta
- `js/ai2/evaluate.js` — material/mobility/king-safety/aggression evaluation
- `js/ai2/order.js` — action ordering for alpha-beta

## cards2 (engine2 card system)
- `js/cards2/move_cards.js` — card factories; builds CARD_CATALOG and STARTER_DECKS at runtime from config/cards.js
- `js/cards2/capture_card.js` — snipeCard (ranged capture)
- `js/cards2/aoe_card.js` — AOE card
- `js/cards2/line_card.js` — line card
- `js/cards2/index.js` — barrel re-export

## charms
- `js/charms.js` — CHARM_CATALOG, getCharmById(), canApplyCharm()

## Tests
- `tests/` — Vitest suite
- `tests/engine2/` — engine2 unit tests
- `tests/cards2/` — cards2 unit tests
- `tests/ai2/` — ai2 unit tests
- `tests/battle_state.test.js` — BattleState adapter tests
- `tests/enemies2.test.js` — enemies2 tests
- Run: `npm test`

## Docs
- `docs/GAME_DESIGN.md` — high-level game design
- `docs/CARDS.md` — card rules, types, how to add new cards
- `docs/CHARMS.md` — charm system, types, effects, how to add new charms
- `docs/CHARACTERS.md` — character system
- `docs/ENEMIES.md` — enemy roster, AI types, personalities
- `docs/TASKS.md` — task log
- `docs/EXPLORATION.md` — reusable patterns for common tasks

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
- Responsive UI: 768px breakpoint, mobile sidebar becomes top bar, board scales with clamp()

## En passant lifecycle
- Set by enemy double-push in `_applyEnemyAction` (battle_state.js:620) when pawn moves 7→5
- Cleared by `_applyEnemyAction` (battle_state.js:613) at start of next enemy turn  
- **NOT cleared by `finishEnemyTurnSequence`** — en passant must persist into player turn so they can capture it
- Player card plays do NOT clear en passant (supports multi-card turns)
- En passant only cleared when enemy turn begins, consuming the opportunity
