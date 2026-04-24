# EXPLORATION

Reusable patterns discovered during tasks. Load this when adding similar features.

## Add a move-variant card (e.g. Knight Move, Pawn Boost)

Pattern: card lets any friendly piece (or a specific piece type) move using a special movement pattern.

Files touched (in order):
1. `js/cards2/move_cards.js` — add factory function, add to `CARD_CATALOG`, add `upgradeCard` branch
2. `js/battle_state.js` — add `xxxDestsFor(sq)` (optional, for non-geometric patterns) + `playXxxCard(cardIndex, fromSq, toSq)`
3. `js/ui.js` — add `handleCardClick` hint branch + `handleSquareClick` `card_selected` branch + new phase handler + render highlight
4. `tests/cards2/move_cards.test.js` — card shape + catalog + upgrade tests
5. `tests/battle_state.test.js` — move validation tests (use `makeStateWithXxx` helper that clears board and sets hand)

### battle_state.js patterns

**Geometric variants** (bishop/rook/queen) reuse `_playPatternMoveCard(cardIndex, variant, pattern, fromSq, toSq)` + `matchesPattern()` + `geometricDestsFor(sq, pattern)`.

**Non-geometric variants** (knight, pawn boost) need dedicated methods:
- `knightMoveCard` → `playKnightMoveCard` + `knightAttacks(sq)` exported helper
- `pawnBoostCard` → `playPawnBoostCard` + `pawnBoostDestsFor(sq)` — player pawns move forward = decreasing row (toward rank 8); slide same file until blocked; stops before any piece (cannot capture)

### ui.js patterns

For new variant, add 4 places:
- `handleCardClick`: hint text branch (`uiState.selectedMoveVariant === 'xxx'`)
- `handleSquareClick` `card_selected` phase: filter piece → compute targets → set `uiState.phase = 'xxx_from_selected'` → `uiState.xxxTargets = ...`
- `handleSquareClick` new phase: cancel on same sq → validate target → call `playFn` → handle promotion / enemy turn
- `resetUiState`: clear `xxxTargets`
- render loop: add `xxxTargets` highlight class (`legal-dest`) + `selected-from` phase check

### Test helper for custom boards

```js
import { makePiece } from '../js/engine2/pieces.js';
import { set } from '../js/engine2/board.js';

function makeStateWithHand(card, placements) {
  const state = new GameState('knight', 'pawn_pusher');
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state._state.board[r][c] = null;
  for (const { sq, type, owner } of placements) set(state._state.board, sq, makePiece(type, owner));
  state._state.hand = [card];
  state._state.deck = [];
  state._state.discard = [];
  return state;
}
```

Note: `battle_state.js` `toDict()` returns `{ board, hand, turn, ... }` where `board[sq]` has `{ type, color: 'white'|'black' }` (not `owner`). Tests should import `makePiece`/`set` from engine2 directly for board manipulation.

## Add a new card (any type)

Pattern: adding a completely new card type (e.g. stun, shield, a new summon).

Rules to know first (see `docs/CARDS.md`):
- No mana / no cost on any card
- Summon cards (type `summon` or `summon_duck`) must disappear after use (removed from game, not discarded)
- All other cards go to discard after use

Files touched (in order):
1. `config/cards.js` — add entry to `CARD_DEFS` with id, name, type, rarity, desc, image
2. `js/cards2/move_cards.js` — add factory function, wire in `CARD_FACTORY_KEYS`, add to `CARD_CATALOG` builder
3. `js/battle_state.js` — add `playXxxCard(cardIndex, ...)` method
4. `js/ui.js` — add `handleCardClick` hint branch + `handleSquareClick` phase handlers + render highlights
5. `tests/cards2/move_cards.test.js` — test card shape + catalog entry
6. `tests/battle_state.test.js` — test play method validation and effects

See `docs/CARDS.md` for the full card type list and rules.

## Incomplete piece type map bugs

Pattern: ad-hoc `{ piece: 'type' }` maps used in UI code for rendering piece images or converting piece names to type codes. Easy to miss `'king'` / `'k'` entries because it's not a reward piece.

Files affected:
- `js/ui.js` — `typeToName` in `renderSquarePickerForPiece` (missing `'k'`) + `typeMap` in event room handler (missing `'king'`)
- `js/rewards.js` — `typeMap` in `renderSquarePicker` (missing `'king'`)

Fix: always include all 6 piece types in any piece-name/type map:
```js
const typeToName = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const typeMap    = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
```

Test: `tests/event_reward_ui.test.js` iterates all 6 piece types through both event room (`handleRoomEntered`) and treasure room (`renderPieceRewardScreen`) flows, verifying no throw and board renders.

## Confirm button pattern for selection screens

Pattern: any screen where user selects one item from a grid/row should use select-then-confirm, not immediate apply.

### Implementation

1. Track `selectedIndex` (or `selectedEl` + `selectedData`) in closure
2. Click item: remove `.selected` from previous, add to clicked, store data
3. Create Confirm button (starts `disabled`)
4. Click Confirm: call callback with selected data

### CSS
- `.selected` class on items: `border-color: #f0e040; background: #3a3a1a;`
- `.confirm-btn`: standard button style, `:disabled { opacity: 0.4; cursor: not-allowed; }`

### Files with confirm buttons
- `js/rewards.js`: `renderCardRewardScreen`, `renderPieceRewardScreen`, `renderSquarePicker`, `renderUpgradeScreen`, `renderTransformScreen`, `renderShopScreen`, `renderCharmRewardScreen`, `renderCharmApplyScreen`, `renderDefeatScreen`
- `js/ui.js`: event room handler, `renderSquarePickerForPiece`

### Test pattern
```js
// Select item
const item = roomContent.querySelector('.card'); // or .piece-reward-btn, etc.
item.click();

// Click confirm
const confirmBtn = roomContent.querySelector('.confirm-btn');
expect(confirmBtn.disabled).toBe(false);
confirmBtn.click();

// Assert callback fired / next screen shown
```

## Multi-step card deselect guard

Pattern: cards with multi-step flows (blitz, move_together) must prevent the player from deselecting the card mid-flow.

**Bug**: `handleCardClick` had the "deselect on same card click" check before the "block multi-step" check, allowing players to reset the UI and play a different card after committing the first move.

**Fix**: Move the `multiStepPhases.includes(uiState.phase)` guard **before** the `uiState.selectedCardIndex === index` deselect check in `js/ui.js:handleCardClick`.

Phases that must block deselect:
- `blitz_first_selected`, `blitz_second_selected`
- `move_together_first_selected`, `move_together_second_piece`, `move_together_second_from_selected`

Test: `tests/multistep_card_deselect.test.js` verifies clicking the same card in any multi-step phase does not call `resetUiState()`.
