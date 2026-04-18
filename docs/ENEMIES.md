# ENEMIES

- See `GAME_DESIGN.md` for enemy turn rules
- Format: name | pieces | ai notes | intents

## Floor 1

- Pawn Pusher — K(e8) + 4P(a7,c7,e7,g7) | ai: random move, prefers king capture | implemented
- Lone Rook — TBD
- Knight Rider — TBD
- Bishop Pair — TBD

## Elite

- Duelist (queen) — TBD

## Boss

- Castellan (ability cards) — TBD

## AI rules

- Enemy picks a random pseudo-legal move each turn
- Always takes the white king if it can reach it
