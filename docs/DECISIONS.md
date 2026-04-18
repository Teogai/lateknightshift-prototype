# DECISIONS

- [2026-04-18] single-file vanilla frontend - no bundler, fast iteration
- [2026-04-18] modular docs by concern - read only what task needs
- [2026-04-18] pseudo_legal_moves for enemy AI - enables king-capture win condition
- [2026-04-18] enemy always prefers king capture - consistent with no-checkmate rule
- [2026-04-18] migrate to frontend-only JS - single language, lower token cost per task
- [2026-04-18] chess.js over python-chess - browser-compatible, same semantics
- [2026-04-18] Vitest over pytest - same test coverage, no server overhead
- [2026-04-18] manual put/remove for AI moves - avoids FEN validation on custom boards
- [2026-04-18] piece-map save/restore in _getMovesForSq - FEN invalid when king missing
- [2026-04-19] minimax+alpha-beta AI - personality via eval weights, difficulty via depth
- [2026-04-19] r^2 pawn_advance scoring - breaks ties toward most-advanced pawn
- [2026-04-19] immediate-eval tie-break in selectMove - prefer sooner win over detour
- [2026-04-19] ~300 line module limit, barrel re-exports - Claude Code loads only relevant files per task
