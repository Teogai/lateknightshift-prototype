# ENEMIES

- See `GAME_DESIGN.md` for enemy turn rules
- Format: name | pieces | ai notes | intents

## Floor 1

- Pawn Pusher — K(e8) + 4P(a7,c7,e7,g7) | ai: PAWN_PUSHER personality, depth 2 | implemented
- Lone Rook — TBD
- Knight Rider — TBD
- Bishop Pair — TBD

## Elite

- Duelist (queen) — TBD

## Boss

- Castellan (ability cards) — TBD

## AI engine

- Minimax + alpha-beta in `js/ai.js` — no hard-coded priorities
- Personality = eval weights (material / pawn_advance / king_safety / mobility / aggression / castle_urgency); missing keys default to 0
- Difficulty = search depth (not randomness); base 2, adaptive boost when few pieces remain
- Tie-break: equal minimax scores resolved by higher immediate eval (achieve goals sooner)
- Pawn reaching rank 1 promotes to queen (execution in `engine.endTurn`, not in search tree)
- Personalities: PAWN_PUSHER implemented; LONE_ROOK / KNIGHT_RIDER / BISHOP_PAIR / DUELIST / CASTELLAN documented in `js/ai.js`
