# CARDS

- See `GAME_DESIGN.md` for card rules
- Format per card: `- <name> | cost <n> | type <move/summon/signature> | effect: <one-liner>`

## Implemented

- Move | cost 1 | type move | effect: move any friendly piece to a legal square (each piece once per turn)
- Summon Pawn | cost 2 | type summon | effect: place pawn on ranks 1–2 (cannot move same turn)
- Summon Knight | cost 3 | type summon | effect: place knight on ranks 1–2 (cannot move same turn)
- Summon Bishop | cost 3 | type summon | effect: place bishop on ranks 1–2 (cannot move same turn)
- Summon Rook | cost 3 | type summon | effect: place rook on ranks 1–2 (cannot move same turn)
- Summon Queen | cost 3 | type summon | effect: place queen on ranks 1–2 (cannot move same turn)
- Knight Move | cost 2 | type signature | effect: move any friendly piece to any knight-jump square (ignores blockers)
- Pawn Boost | cost 1 | type move | effect: move a pawn forward any number of squares (sliding, can capture)

## Starter decks (10 cards each)

### The Knight
- 7x Move(1), 2x Summon Pawn(1), 1x Knight Move(2)
