# GAME_DESIGN

## Structure
- Roguelite, 3 floors, final boss on floor 3
- Prototype scope: floor 1 only, single combat vs Pawn Pusher

## Run loop
- Pick character → map node → battle/event → reward → repeat → boss → next floor

## Battle
- 8x8 chess board
- Win condition: king capture (no checkmate rule)
- Standard chess movement + capture rules
- Both sides start with small armies (~5 pieces); grow via summons/rewards
- Target combat length: 5–8 turns

## Player turn
- 3 mana
- Draw 5 cards
- Play multiple cards per turn
- Each piece may only be moved once per turn (no repeat moves on same piece)
- Discard hand at end of turn

## Enemy turn
- Pattern-based AI (see ENEMIES.md)
- Pawn Pusher: relentlessly advances most-forward pawn; pawns promote to queen on reaching rank 1

## Cards
- Starter deck 10 cards: mostly Move + Summons + 1 Signature
- Move card: move any piece legally; cost 1 mana; each piece once per turn
- Summon card: place piece on back rank (pawns: first 2 ranks); summoned piece cannot move same turn
- Signature card: character-unique ability; cost 2+ mana

## Characters
- Character = starting pieces + starting deck + signature card
- Prototype: The Knight (K + 2P + N + R)
- See `CHARACTERS.md`

## Floor 1 roster
- Regular: Pawn Pusher, Lone Rook, Knight Rider, Bishop Pair
- Elite: Duelist (has queen)
- Boss: Castellan (uses ability cards)
- See `ENEMIES.md`

## Unresolved
- Cross-battle piece sacrifice cost — decide during prototyping
