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

## Player turn (Wildfrost-style)
- No mana; all cards are free
- 1 card per turn — playing a card auto-ends the player turn (enemy moves immediately)
- Hand persists between turns (unused cards stay; no auto-discard)
- Hand size: 6 cards
- Redraw button: discard all cards, draw 6 new ones
  - Costs a turn (enemy moves) if `redraw_countdown > 0`
  - Free (no turn cost) if `redraw_countdown === 0`; resets countdown to 4
- `redraw_countdown`: starts at 4, decrements each time player turn ends
- Player cannot pass; must play a card or use Redraw

## Enemy turn
- Pattern-based AI (see ENEMIES.md)
- Pawn Pusher: relentlessly advances most-forward pawn; pawns promote to queen on reaching rank 1

## Cards
- Starter deck 10 cards: mostly Move + Summons + 1 Signature
- Move card: move any piece legally; costs no mana; auto-ends turn
- Summon card: place piece on back rank (pawns: first 2 ranks); auto-ends turn
- Signature card: character-unique ability; auto-ends turn
- See `CARDS.md`

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
