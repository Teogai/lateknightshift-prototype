# GAME_DESIGN

## Structure
- Roguelite, 3 floors, final boss on floor 3
- Prototype scope: floor 1 only

## Run loop
- Pick character → map node → battle/event → reward → repeat → boss → next floor

## Battle
- 8x8 chess board
- Win condition: king capture (no checkmate rule)
- Standard chess movement + capture rules
- Both sides start with small armies (~5 pieces); grow via summons/rewards

## Player turn
- 3 mana
- Draw 5 cards
- Play multiple cards per turn
- Discard hand at end of turn

## Enemy turn
- Usually 1 move
- Telegraphs special actions via intents

## Cards
- Starter deck ~10 cards: mostly Move + few Summons + 1 Signature
- Move card: move any piece legally; typical cost 1 mana
- 0-cost cards allowed (combo support)
- Summon card: place piece on back rank (pawns: first 2 ranks)
- Summoned piece cannot move same turn

## Characters
- Character = starting pieces + starting deck + starting relic + signature card
- Prototype: The Knight (K + 2P + N + R), The Bishop (K + 2P + 2B)
- See `CHARACTERS.md`

## Floor 1 roster
- Regular: Pawn Pusher, Lone Rook, Knight Rider, Bishop Pair
- Elite: Duelist (has queen)
- Boss: Castellan (uses ability cards)
- See `ENEMIES.md`

## Unresolved
- Cross-battle piece sacrifice cost — decide during prototyping
