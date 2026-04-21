# CARDS

## Rules
- No mana; all cards are free to play
- Playing a card auto-ends the player turn (enemy moves immediately)
- Hand persists between turns (unused cards stay; no auto-discard)
- Player cannot pass; must play a card or use Redraw
- Summon cards disappear after use (removed from game, not discarded)
- Other cards go to discard after use
- Hand size and redraw countdown: see `config/game.js`

## Card types

| Type | Description | Removed after use? |
|------|-------------|-------------------|
| `move` | Move any friendly piece to a legal square | Discard |
| `move` (variant) | Knight / Bishop / Rook / Queen / Pawn Boost geometric moves | Discard |
| `piece` | Place a piece (pawn/knight/bishop/rook/queen) on rank 1-2 | **Removed** |
| `summon_duck` | Place a duck on any empty square | **Removed** |
| `move_duck` | Move any duck to any empty square | Discard |
| `stun` | Apply `stunned` tag to any piece for 2 turns | Discard |
| `shield` | Apply `shielded` tag to any piece | Discard |
| `sacrifice` | Destroy a friendly piece and a weaker enemy piece | Discard |
| `unblock` | Apply `ghost` tag for 5 turns | Discard |
| `curse` | Unplayable dead card | — |

## Transform Rules
- Transform rooms replace a chosen deck card with a random card of the same rarity category
- **Piece cards** transform only into other piece cards (different piece type)
- **Curse cards** transform only into other curse cards (different curse name)
- **All other cards** transform into non-piece, non-curse cards from the reward pool (excludes starter cards)
- Charms are preserved if valid for the new card type; otherwise lost
- Implementation: `js/rewards.js` `pickTransformCard()`, `js/ui.js` `handleRoomEntered()`

## Card data
- Definitions: `config/cards.js` (id, name, type, rarity, desc, image)
- Factories: `js/cards2/move_cards.js`
- Catalog / starter decks: `js/cards2/move_cards.js` (`CARD_CATALOG`, `STARTER_DECKS`)

## How to add a new card

1. `config/cards.js` — add entry to `CARD_DEFS` with id, name, type, rarity, desc, image
2. `js/cards2/move_cards.js` — add factory function, wire in `CARD_FACTORY_KEYS`, add to `CARD_CATALOG` builder if needed
3. `js/battle_state.js` — add `playXxxCard(cardIndex, ...)` method
4. `js/ui.js` — add `handleCardClick` hint branch + `handleSquareClick` phase handlers + render highlights
5. `tests/cards2/move_cards.test.js` — test card shape + catalog entry
6. `tests/battle_state.test.js` — test play method validation and effects
