# ENEMIES

- See `GAME_DESIGN.md` for enemy turn rules
- Format: name | pieces | ai notes | intents

## Floor 1

- Pawn Pusher — K(e8) + 4P(a7,c7,e7,g7) | ai: PAWN_PUSHER personality, depth 2 | implemented
- Lone Rook — K(e8) + R(a8) | ai: LONE_ROOK personality (material 1.5, mobility 1.2, king_safety 1.0), depth 2 | implemented
- Knight Rider — K(e8) + N(b8,g8) | ai: KNIGHT_RIDER personality (mobility 2.0, material 1.0, king_safety 0.6, pawn_advance 0.2), depth 2 | implemented
- Bishop Pair — K(e8) + B(c8,f8) | ai: BISHOP_PAIR personality (material 1.2, mobility 1.5, king_safety 0.9), depth 2 | implemented

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
- Personalities: PAWN_PUSHER, LONE_ROOK, KNIGHT_RIDER, BISHOP_PAIR implemented in `js/ai.js`; DUELIST / CASTELLAN documented as comments
