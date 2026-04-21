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

## Floor 1 roster

### Regular
- Pawn Pusher — 6 pawns + king; advances pawns aggressively
- Knight Rider — 2 knights + 3 pawns + king; flanks with knights
- Bishop Pair — 2 bishops + 3 pawns + king; diagonal control
- Phalanx — fortified king + knights + pawns; wall formation
- Iron Line — rook + bishop + heavy pawns; defensive line
- Cavalry Charge — 4 knights + 8 pawns + king + ducks; sweeping rush
- High Command — mixed heavy army; siege tactics

### Elite
- Duelist — bishops + knights + pawns; double-move every other turn
- Duelist II — rook + queen + bishops + knights + pawns; upgraded double-move

### Boss
- Boss Duelist — full chess army; relentless double moves

## Data
- Enemy definitions (pieces, personality, aiType): `config/enemies.js`
- Floor path: `config/path.js` (`FIXED_PATH`)
