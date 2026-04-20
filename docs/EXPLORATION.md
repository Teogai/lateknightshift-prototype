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
- `pawnBoostCard` → `playPawnBoostCard` + `pawnBoostDestsFor(sq)` — player pawns move forward = decreasing row (toward rank 8); slide same file until blocked; enemy piece on end square = valid capture

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
