# GAME_DESIGN

## Structure
- Roguelite, 3 floors, final boss on floor 3
- Prototype scope: floor 1 only, 16-floor path

## Run loop
- Pick character → map node → battle/event → reward → repeat → boss → next floor
- Lives system: lose a life on defeat; game over at 0 lives

## Battle
- 8×8 chess board
- Win condition: king capture (no checkmate rule)
- Standard chess movement + capture rules
- Both sides start with small armies (~5-6 pieces); grow via summons/rewards
- Target combat length: 5–8 turns

## Player turn (Wildfrost-style)
- 1 card per turn — playing a card auto-ends the player turn
- Hand persists between turns (unused cards stay; no auto-discard)
- Player cannot pass; must play a card or use Redraw
- Card rules: see `docs/CARDS.md`

## Enemy turn
- Pattern-based AI; see `docs/ENEMIES.md` for enemy roster and AI types

## Characters
- Character = starting pieces + starting deck + signature card
- See `docs/CHARACTERS.md` for details

## Unresolved
- Cross-battle piece sacrifice cost — decide during prototyping
