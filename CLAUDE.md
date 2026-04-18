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
- `docs/DECISIONS.md`: `[YYYY-MM-DD] <decision> - <reason <10 words>`

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
