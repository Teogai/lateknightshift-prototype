# TASKS

- [2026-04-18] done: init project scaffold + hello-world test
- [2026-04-18] done: engine board state + /game/new (knight/bishop characters, pawn_pusher enemy)
- [2026-04-18] done: cards module — starter decks, deal_hand
- [2026-04-18] done: /game/play/move — move card, mana cost, illegal move rejection, summon restriction
- [2026-04-18] done: /game/play/summon — place piece, rank validation, summon-can't-move rule
- [2026-04-18] done: /game/end-turn — enemy AI (prefers king capture), mana reset, new hand
- [2026-04-18] done: win condition — king capture ends game (player_won / enemy_won)
- [2026-04-18] todo: frontend wired to backend API
- [2026-04-18] todo: /game/state GET endpoint polish + game ID support
- [2026-04-19] done: minimax enemy AI — Pawn Pusher personality, depth 2, reacts to threats
- [2026-04-18] todo: more enemy types (Lone Rook, Knight Rider, Bishop Pair)
- [2026-04-18] todo: rewards + map node flow
- [2026-04-19] done: en passant for player and enemy (track enPassantTarget, fix FEN, fix execution)
