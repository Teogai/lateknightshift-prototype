# ENEMIES

- See `GAME_DESIGN.md` for enemy turn rules
- Format: name | pieces | ai type | personality notes

## Fixed path (FIXED_PATH in js/map.js)

| Floor | Type    | Enemy key       | Name           |
|-------|---------|-----------------|----------------|
| 1     | monster | pawn_pusher     | Pawn Pusher    |
| 2     | monster | knight_rider    | Knight Rider   |
| 3     | event   | —               | Event          |
| 4     | monster | bishop_pair     | Bishop Pair    |
| 5     | shop    | —               | Shop           |
| 6     | elite   | duelist         | Duelist        |
| 7     | upgrade | —               | Upgrade        |
| 8     | monster | phalanx         | Phalanx        |
| 9     | monster | iron_line       | Iron Line      |
| 10    | monster | cavalry_charge  | Cavalry Charge |
| 11    | event   | —               | Event          |
| 12    | elite   | duelist_2       | Duelist II     |
| 13    | monster | high_command    | High Command   |
| 14    | shop    | —               | Shop           |
| 15    | upgrade | —               | Upgrade        |
| 16    | boss    | boss_duelist    | Boss           |

## Normal enemies

- Pawn Pusher — k(e8) + 5p | pawn_advance 2.0, aggression 0.5 | defaultAI depth 2
- Knight Rider — k(e8) + n(b8,g8) + 3p | mobility 2.0, aggression 1.2 | defaultAI depth 2
- Bishop Pair — k(e8) + b(c8,f8) + 3p | material 1.2, mobility 1.5 | defaultAI depth 2
- Phalanx (floor 8) — k(e7) + b(d7) + n(c6,f6) + 4p | king pushed to 7th, flanking knights; mobility 1.5, aggression 1.2 | defaultAI depth 2
- Iron Line (floor 9) — k(e8) + r(a8) + b(f8) + n(c6) + 6p | rook+bishop back rank, advanced knight pawn; material 1.5, aggression 1.5 | defaultAI depth 2
- Cavalry Charge (floor 10) — k(e8) + n(b8,c8,f8,g8) + 8p | 4 knights + full pawn rank; mobility 2.5, aggression 1.5 | defaultAI depth 2
- High Command (floor 13) — k(g8) + b(c8) + r(f8) + n(c6,f6) + 8p | offset king, heavy mixed army; material 1.3, aggression 1.4 | defaultAI depth 2

## Elite enemies

- Duelist (floor 6) — b(c8,f8) + n(d8) + k(e8) + 4p | doubleMoveAI (2 moves/turn)
- Duelist II (floor 12) — r(a8) + q(b8) + b(c8,f8) + n(d8) + k(e8) + 6p | rook+queen added; material 1.5, aggression 1.5 | doubleMoveAI

## Boss

- Boss Duelist (floor 16) — full 16-piece standard chess position | material 1.5, king_safety 1.2, aggression 1.5 | doubleMoveAI

## AI engine

- Minimax + alpha-beta in `js/ai.js` — no hard-coded priorities
- Personality = eval weights (material / pawn_advance / king_safety / mobility / aggression); missing keys default to 0
- Difficulty = search depth (not randomness); base 2, adaptive boost when few pieces remain
- defaultAI: 1 move/turn; doubleMoveAI: 2 moves every other turn (warns next)
- Pawn reaching rank 1 promotes to queen (execution in engine, not search tree)
- All enemies defined in `js/enemies.js`; enemy key stored in FIXED_PATH node and on pendingNode
