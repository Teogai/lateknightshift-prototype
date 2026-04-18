# ENEMIES

- See `GAME_DESIGN.md` for enemy turn rules
- Format: name | pieces | ai notes | intents

## Floor 1

- Pawn Pusher — K(e8) + 4P(a7,c7,e7,g7) | ai: pattern-based (see AI rules) | implemented
- Lone Rook — TBD
- Knight Rider — TBD
- Bishop Pair — TBD

## Elite

- Duelist (queen) — TBD

## Boss

- Castellan (ability cards) — TBD

## AI rules

- Priority order: king capture > any capture > advance most-forward pawn > random
- "Most forward pawn" = pawn on lowest rank (closest to rank 1)
- Pawn reaching rank 1 promotes to queen
