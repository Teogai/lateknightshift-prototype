# CLAUDE.md

## Read first
- `docs/ARCHITECTURE.md` — file-purpose map, locate code
- Load only docs relevant to current task; don't read all
- Never dump full context into every doc

## TDD loop
1. Write failing test in `tests/`
2. Run test, confirm fails
3. Write minimal code to pass
4. Run test, confirm passes
5. Refactor if needed, tests still green
6. Update affected `docs/*.md` (bullets only)
7. Commit

## Commits
- Lowercase imperative, <50 chars
- One commit per passing feature, not per file
- Run `npm test` before every commit
- Update relevant md before commit
- **Commit all changed files after every completed task**

## Log formats
- `docs/TASKS.md`: `[YYYY-MM-DD] done: <x>` / `[YYYY-MM-DD] todo: <x>`

## Decisions
- single-file vanilla frontend - no bundler, fast iteration
- modular docs by concern - read only what task needs
- pseudo_legal_moves for enemy AI - enables king-capture win condition
- enemy always prefers king capture - consistent with no-checkmate rule
- migrate to frontend-only JS - single language, lower token cost per task
- chess.js over python-chess - browser-compatible, same semantics
- Vitest over pytest - same test coverage, no server overhead
- manual put/remove for AI moves - avoids FEN validation on custom boards
- piece-map save/restore in _getMovesForSq - FEN invalid when king missing
- minimax+alpha-beta AI - personality via eval weights, difficulty via depth
- r^2 pawn_advance scoring - breaks ties toward most-advanced pawn
- immediate-eval tie-break in selectMove - prefer sooner win over detour
- ~300 line module limit, barrel re-exports - Claude Code loads only relevant files per task
- createAI() factory per enemy - stateful double-move AI without polluting GameState
- piece reward placement in room screen (square picker) - avoids switching to game board mid-reward
- geometric move cards validate destination by pattern not piece type - any piece can use bishop/rook/queen movement
- TDD order enforced: write failing test before production code - avoids stashing changes to verify pre-existing failures

## Modules
- One clear responsibility per file
- Soft limit: ~300 lines per module
- When a file approaches that limit, split by concern before adding more code
- Name new files so Claude Code can load only what's relevant to the task
- Use barrel re-exports in the parent file to keep public API unchanged after splits

## Doc rules
- Flat bullets, no prose, <200 lines per file
- Split by concern; link between docs instead of duplicating

## Comms
- Terse. No filler. Skip "Let me...", "I'll now...", "Great!"
- One-line question when blocked
- Report done per task, one line

## Stack
- Frontend-only: vanilla JS ES modules, chess.js, Vite (dev server), Vitest (tests)
- No backend server, no HTTP, no bundler
- Direct function calls — no fetch, no API

## Run
- Install deps: `npm install`
- Tests: `npm test`
- Dev server: `npm run dev` → http://localhost:5173

## Frontend testing
- Use `preview_eval` with JS selectors to inspect state — not `preview_screenshot`
- e.g. `document.getElementById('deck-info').textContent` or `gameState.toDict()`
- Screenshots are slow and unreliable; JS queries are fast and exact
- Before starting dev server for tests: check if already running (`netstat -ano | grep :5173`)
  - If running: ask user whether to kill it or skip testing
- **ALWAYS call `preview_stop` after every test session — no exceptions, do not skip**
- **Only use preview for things that cannot be tested in code** (visual layout, click interactions, screen transitions)
- **Never run `npm run dev` or start a preview unless visual testing is genuinely required** — it burns tokens; logic tests (AI, engine, rules, cards) must use Vitest only
- Game logic changes (AI, engine, rules) must be tested via Vitest unit tests, not preview

## AI testing
- Test AI behavior at multiple depths (2, 3, 4) — shallow depth hides bugs
- For aggression/king-hunt tests: verify the AI actually selects king-capture moves when available, not just advances toward the king
- A good AI test: set up a position where king capture is reachable in N moves, confirm `selectMove` finds it at depth ≥ N
