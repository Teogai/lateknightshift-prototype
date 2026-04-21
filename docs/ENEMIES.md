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

## Data
- Enemy definitions (pieces, personality, aiType): `config/enemies.js`
- Floor path: `config/path.js` (`FIXED_PATH`)
