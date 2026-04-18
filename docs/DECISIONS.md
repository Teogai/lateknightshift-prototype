# DECISIONS

- [2026-04-18] FastAPI + python-chess + pytest - standard, lean stack
- [2026-04-18] single-file vanilla frontend - no bundler, fast iteration
- [2026-04-18] HTTP first, WS later - simpler prototype
- [2026-04-18] modular docs by concern - read only what task needs
- [2026-04-18] local .venv in repo root - isolated, reproducible
- [2026-04-18] pseudo_legal_moves for enemy AI - enables king-capture win condition
- [2026-04-18] enemy always prefers king capture - consistent with no-checkmate rule
- [2026-04-18] single in-memory game dict - no auth needed for prototype
- [2026-04-18] migrate to frontend-only JS - single language, lower token cost per task
- [2026-04-18] chess.js over python-chess - browser-compatible, same semantics
- [2026-04-18] Vitest over pytest - same test coverage, no server overhead
- [2026-04-18] manual put/remove for AI moves - avoids FEN validation on custom boards
- [2026-04-18] piece-map save/restore in _getMovesForSq - FEN invalid when king missing
