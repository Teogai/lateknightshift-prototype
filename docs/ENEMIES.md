# ENEMIES

## Rules
- Enemy = starting pieces + personality weights + AI type + special ability
- Win condition: capture the enemy king (no checkmate rule)

## AI types
- `default` — 1 move per turn
- `doubleMove` — every other turn: warns, then takes 2 moves next turn

## Personality weights
Used by minimax evaluation. Higher = AI values that factor more.
- `material` — piece value
- `king_safety` — keep king away from threats
- `mobility` — number of legal moves
- `pawn_advance` — push pawns toward promotion
- `aggression` — hunt the player king

## Turn schedule (minimax)
The AI search uses a configurable turn schedule instead of hardcoded alternating turns.
- `schedule: ['enemy', 'player']` — normal alternating (default)
- `schedule: ['enemy', 'enemy', 'player']` — double-move turn; AI sees both enemy moves before player responds
- Schedule is passed to `selectAction(state, owner, { schedule })` in `js/ai2/search.js`

## Phase tracking
- BattleState tracks `enemyPhase` externally (`'normal' | 'warn' | 'double'`)
- DoubleMove enemies: phase alternates `'warn' → 'double' → 'warn'`
- Phase is passed to AI via `selectMove(state, phase)`
- This enables save/load and makes AI deterministic (no closure state)

## Data
- Enemy definitions (pieces, personality, aiType): `config/enemies.js`
- AI factories + phase handling: `js/enemies2.js`
- Schedule-based minimax: `js/ai2/search.js`
- External phase tracking: `js/battle_state.js` (constructor + `startEnemyTurn`)
- Floor path: `config/path.js` (`FIXED_PATH`)
