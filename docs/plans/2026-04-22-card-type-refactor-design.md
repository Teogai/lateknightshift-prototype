# Card Type Refactor Design

## Approved: 2026-04-22

## Types

| Type | Cards | After-use behavior |
|------|-------|-------------------|
| `piece` | piece_pawn, piece_knight, piece_bishop, piece_rook, piece_queen, summon_duck | **Removed** from game |
| `move` | move, knight_move, bishop_move, rook_move, queen_move, pawn_boost, move_duck | Discarded |
| `action` | stun, shield, sacrifice, unblock | Discarded |
| `curse` | curse, curse_sloth | Unplayable |

## Subtype fields

- **piece** cards: `piece: 'pawn'|'knight'|'bishop'|'rook'|'queen'|'duck'`
- **move** cards: `moveVariant: 'knight'|'bishop'|'rook'|'queen'|'pawn_boost'|'duck'` (absent = standard move)
- **action** cards: `actionType: 'stun'|'shield'|'sacrifice'|'unblock'`

## Files to change

- `config/cards.js` — update types, add subtypes
- `js/cards2/move_cards.js` — update factories
- `js/ui.js` — replace type checks with subtype checks
- `js/battle_state.js` — update play method validation
- `js/rewards.js` — no changes needed (piece/curse logic stays same)
- `tests/` — update expectations
- `docs/CARDS.md` — update type table
