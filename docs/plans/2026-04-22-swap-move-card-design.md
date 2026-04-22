# Design: Swap Card as Move Card

## Goal
Change the Swap card from `type: 'action'` to `type: 'move'` while preserving its two-click "swap two friendly pieces" gameplay.

## Background
Currently Swap is an action card (`actionType: 'swap'`). The user wants it categorized as a move card for consistency with the card type system and reward/transform rules. The interaction (select friendly piece A, select friendly piece B, swap positions) remains unchanged.

## Approach
Align naming conventions across the codebase (Approach 2 from brainstorming).

## Files Changed

| File | Change |
|------|--------|
| `config/cards.js` | `swap`: `type: 'action'` → `'move'`, remove `actionType`, add `moveVariant: 'swap'` |
| `js/cards2/move_cards.js` | `swapCard()` returns `{ type: 'move', moveVariant: 'swap' }` |
| `js/battle_state.js` | Rename `playSwapCard` → `playSwapMoveCard`, update type validation |
| `js/ui.js` | Rename phases `swap_selected` → `swap_move_selected`, `swap_target_selected` → `swap_move_target_selected`; update handlers |
| `tests/cards2/move_cards.test.js` | Assert `type: 'move'` and `moveVariant: 'swap'` |
| `tests/battle_state.test.js` | Test `playSwapMoveCard` with updated validation |
| `docs/CARDS.md` | Move `swap` from action subtypes to move subtypes |

## UI Phase Flow (unchanged logic, new names)
```
swap_move_selected → pick first friendly piece
swap_move_target_selected → pick second friendly piece → execute swap
```

## Gameplay Behavior
- Card is discarded after use (unchanged)

## Test Plan
1. Factory test: `swapCard()` returns correct shape
2. Battle state test: `playSwapMoveCard` validates type/subtype, swaps positions, discards card
3. Run full test suite to ensure no regressions in action/move card handling
