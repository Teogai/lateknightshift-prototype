# TASKS

- [2026-04-18] done: init project scaffold + hello-world test
- [2026-04-18] done: engine board state + /game/new (knight/bishop characters, pawn_pusher enemy)
- [2026-04-18] done: cards module — starter decks, deal_hand
- [2026-04-18] done: /game/play/move — move card, mana cost, illegal move rejection, summon restriction
- [2026-04-18] done: /game/play/summon — place piece, rank validation, summon-can't-move rule
- [2026-04-18] done: /game/end-turn — enemy AI (prefers king capture), mana reset, new hand
- [2026-04-18] done: win condition — king capture ends game (player_won / enemy_won)
- [2026-04-19] done: minimax enemy AI — Pawn Pusher personality, depth 2, reacts to threats
- [2026-04-19] done: more enemy types (Lone Rook, Knight Rider, Bishop Pair) — personalities + piece layouts + GameState enemy param
- [2026-04-19] done: rewards + map node flow — 16-floor run loop, 6 room types, lives system, Duelist/Boss, new cards
- [2026-04-19] done: en passant for player and enemy (track enPassantTarget, fix FEN, fix execution)
- [2026-04-19] done: modularize engine.js — split into engine/constants.js + engine/board.js; add module-size rule to CLAUDE.md
- [2026-04-19] done: AI auto-promotes pawns in search (makeMove) + queen credited in pawnAdvanceScore; direct king capture preempts tiebreak so AI can't pick a deferred forced mate
- [2026-04-20] done: Wildfrost battle rework — 1 card/turn auto-ends turn, hand persists, no mana, redraw countdown (4→0→free), hand size 6
- [2026-04-20] done: fixed 16-floor path — replace random room choices with authored FIXED_PATH; horizontal path track UI; 5 new enemies (Phalanx, Iron Line, Cavalry Charge, High Command, Duelist II); remove Lone Rook
