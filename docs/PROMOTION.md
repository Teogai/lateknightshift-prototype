# Promotion System

## Files
- `js/engine2/promotion.js` — centralized promotion detection and resolution
- `js/battle_state.js` — card play methods use `resolvePromotions()` after moves

## API

### `getPawnsNeedingPromotion(board)`
Scans board for pawns on back ranks:
- Player (white) pawns on row 0 (rank 8)
- Enemy (black) pawns on row 7 (rank 1)

Returns: `[{ sq, owner }, ...]`

### `resolvePromotions(state)`
Auto-promotes enemy pawns to queen.
Returns player pawn squares needing promotion choice.

Returns: `{ playerPromos: [...], autoPromoted: [...] }`

## Behavior
- **Player pawns**: return `needs_promotion` to trigger promotion modal
- **Enemy pawns**: auto-promote to queen immediately
- Called after all card plays and enemy turn sequences

## Integration Points
- `playMoveCard()` — after engine action resolution
- `playTeleportCard()` — after raw board manipulation
- `playKnightMoveCard()` — after raw board manipulation
- `_playPatternMoveCard()` — after raw board manipulation (bishop/rook/queen)
- `playPawnBoostCard()` — after raw board manipulation
- `finishEnemyTurn()` — after all enemy actions applied
- `executeNextEnemyMove()` — after individual enemy action

## No Manual Checks
Old manual `piece.type === 'pawn' && toSq[1] === '8'` checks removed.
All promotion detection goes through centralized checker.
