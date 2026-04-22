# Promotion System

## Architecture

**Centralized post-action promotion check.** No card method handles promotion directly.

### Flow
1. Card play method executes move → returns `{ ok: true }`
2. UI calls `handlePostAction()` after any successful card play
3. `handlePostAction()` calls `gameState.checkPromotions()`
4. If player pawns on back rank → shows promotion modal
5. If enemy pawns on back rank → auto-promotes to queen
6. After all promotions resolved → proceeds to enemy turn

## Files
- `js/engine2/promotion.js` — `getPawnsNeedingPromotion()`, `resolvePromotions()`
- `js/battle_state.js` — `checkPromotions()` method
- `js/ui.js` — `handlePostAction()` helper, used by all card handlers

## API

### `getPawnsNeedingPromotion(board)`
Scans board for pawns on back ranks:
- Player pawns on row 0 (rank 8)
- Enemy pawns on row 7 (rank 1)

Returns: `[{ sq, owner }, ...]`

### `resolvePromotions(state)`
Auto-promotes enemy pawns to queen.
Returns player pawn squares needing promotion choice.

Returns: `{ playerPromos: [...], autoPromoted: [...] }`

### `BattleState.checkPromotions()`
Wrapper around `resolvePromotions()`.

Returns: `{ playerPromos: [...], autoPromoted: [...] }`

### `handlePostAction()` (ui.js)
Called after every successful card play.
- Calls `gameState.checkPromotions()`
- If `playerPromos.length > 0`: shows promotion modal
- Else: resets UI and starts enemy turn

## Behavior
- **Player pawns**: promotion modal shown, player chooses piece
- **Enemy pawns**: auto-promote to queen immediately
- **No card method returns `needs_promotion`** — all promotion detection is centralized

## Integration Points
Card handlers in `js/ui.js` that call `handlePostAction()`:
- `from_selected` (regular move)
- `knight_from_selected`
- `geometric_from_selected` (bishop/rook/queen)
- `pawn_boost_from_selected`
- `teleport_from_selected`
- `snap_from_selected`
- `blitz_second_selected`
- `move_together_second_from_selected`
- `swap_move_target_selected`
- `move_duck_from_selected`
- `stun_selected`
- `shield_selected`
- `sacrifice_target_selected`
- `unblock_selected`
- `summon_duck_selected`
- `piece` card placement

Enemy turn auto-promotion:
- `finishEnemyTurn()` — after all enemy actions
- `executeNextEnemyMove()` — after each enemy action

## Removed
Old per-card promotion checks (`result.needs_promotion`) removed from:
- `playMoveCard()`
- `playKnightMoveCard()`
- `_playPatternMoveCard()`
- `playPawnBoostCard()`
- `playTeleportCard()`
