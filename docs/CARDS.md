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

| Type | Description | Subtype field | Removed after use? |
|------|-------------|---------------|-------------------|
| `piece` | Summon a piece onto the board | `piece` | **Removed** |
| `move` | Move a friendly piece (or duck) | `moveVariant` | Discard |
| `action` | Apply an effect (status, capture, etc.) | `actionType` | Discard |
| `curse` | Unplayable dead card | — | — |

### Subtype fields

- **piece** cards: `piece: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'duck'`
- **move** cards: `moveVariant: 'knight' | 'bishop' | 'rook' | 'queen' | 'pawn_boost' | 'duck' | 'teleport' | 'blitz' | 'move_together' | 'swap' | 'atomic' | 'push'` (absent = standard move)
- **action** cards: `actionType: 'stun' | 'shield' | 'sacrifice' | 'unblock' | 'snap' | 'knight_power' | 'bishop_power' | 'rook_power' | 'queen_power' | 'king_power'`

## Naming & Description Rules

- **Piece cards**: name = piece name (`Pawn`, `Knight`, `Duck`)
  - Description format: `Summon {piece} [location]`
  - Examples: `Summon {pawn} rank 1-2.`, `Summon {duck} anywhere.`
- **Conciseness over grammar**: sacrifice grammar for brevity
  - `Slide {pawn} forward.` not `Slide {pawn} forward any number of squares.`
  - `Apply {shield}.` not `Apply {shield} to a piece.`
  - `Move any {duck}.` not `Move any {duck} to an empty square.`
- **Keywords**: wrap piece/status names in `{}` for tooltip styling
  - `{pawn}`, `{knight}`, `{stun}`, `{shield}`, `{ghost}`, `{atomic}`, `{push}`
  - Registry in `js/ui.js` `KEYWORD_REGISTRY`
- **Effect keywords on move cards**: append effect keyword to base move description
  - Example: `Move {piece}. {Atomic}` for atomic move, `Move {piece}. {Push}` for push move

## Reward Pool
- Card rewards exclude **starter cards** (character-specific) and **piece cards** (separate piece reward pool)
- **Curse cards are excluded** from card rewards (only obtained via defeat or events)
- Cards with `inRewardPool: false` are excluded from rewards (e.g., pattern move cards)
- Implementation: `js/rewards.js` `pickCardChoices()`

## Transform Rules
- Transform rooms replace a chosen deck card with a random card of the same rarity category
- **Piece cards** transform only into other piece cards (different piece type)
- **Curse cards** transform only into other curse cards (different curse name)
- **All other cards** transform into non-piece, non-curse cards from the reward pool (excludes starter cards)
- Charms are preserved if valid for the new card type; otherwise lost
- Implementation: `js/rewards.js` `pickTransformCard()`, `js/ui.js` `handleRoomEntered()`

## Charm Display
- Cards with charms show charm name as keyword badge appended to description
- Keyword styling from `js/ui.js` `KEYWORD_REGISTRY` (color + tooltip)
- Badge rendered via `makeCardEl()` in `js/ui.js`, styled in `css/cards.css`
- See `docs/CHARMS.md` for full charm system

## Card data
- Definitions: `config/cards.js` (id, name, type, rarity, desc, image, inRewardPool)
- Factories: `js/cards2/move_cards.js`
- Catalog / starter decks: `js/cards2/move_cards.js` (`CARD_CATALOG`, `STARTER_DECKS`)

## Power Cards
- Action cards that grant temporary movement abilities
- `actionType` ends with `_power`: `knight_power`, `bishop_power`, `rook_power`, `queen_power`, `king_power`
- Applied as tags on friendly pieces (e.g., `piece.tags.add('knight_power')`)
- Multiple power tags can stack on one piece
- All power tags removed after the piece makes any move
- Power move destinations highlighted in blue (`.power-dest`)
- Implementation: `js/engine2/movegen.js` (extra move generation), `js/engine2/actions.js` (tag removal), `js/battle_state.js` (`playPowerCard`), `js/ui.js` (blue highlighting)

## How to add a new card

1. `config/cards.js` — add entry to `CARD_DEFS` with id, name, type, subtype, rarity, desc, image
   - Choose `type` from: `piece`, `move`, `action`, `curse`
   - Add subtype: `piece`, `moveVariant`, or `actionType`
   - Set `inRewardPool: false` to exclude from reward pool
2. `js/cards2/move_cards.js` — add factory function, wire in `CARD_FACTORY_KEYS`, add to `CARD_CATALOG` builder if needed
3. `js/battle_state.js` — add `playXxxCard(cardIndex, ...)` method (validate `type` + subtype)
4. `js/ui.js` — add `handleCardClick` hint branch + `handleSquareClick` phase handlers + render highlights
5. `tests/cards2/move_cards.test.js` — test card shape (type + subtype) + catalog entry
6. `tests/battle_state.test.js` — test play method validation and effects
