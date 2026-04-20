# Piece Types

## Overview
Pieces are the core game units. Each piece has a **type** (pawn, knight, etc.), **owner** (player, enemy, neutral), and optional **tags** (uncapturable, etc.).

| Type | Owner | Capturable | Description |
|------|-------|-----------|-------------|
| **King** | player/enemy | Yes | Owns and controls player/enemy side. King capture = instant win. Moves 1 sq any direction. |
| **Queen** | player/enemy | Yes | Moves any distance diagonally or orthogonally (like bishop + rook). |
| **Rook** | player/enemy | Yes | Moves any distance orthogonally (up/down/left/right). |
| **Bishop** | player/enemy | Yes | Moves any distance diagonally. |
| **Knight** | player/enemy | Yes | Jumps in L-shape: 2 squares in one direction + 1 perpendicular. |
| **Pawn** | player/enemy | Yes | Moves 1 sq forward (2 if first move). Captures 1 sq diagonally forward. Promotes to queen on rank 8 or 1. |
| **Duck** | neutral | **No** | Uncapturable neutral piece (blocks movement). Generates no moves. Cannot be captured. |

## Owner Types

**Player**: White pieces on ranks 1–2, controlled by the player (e.g., king starts on e1).

**Enemy**: Black pieces on ranks 7–8, controlled by AI opponent (e.g., king starts on e8).

**Neutral**: Uncapturable pieces placed by special rules. Currently only duck. Owned by neither side, cannot be moved or captured, acts as terrain.

## Movement & Capture

- **Sliding pieces** (rook, bishop, queen): Can move any distance along their lines until blocked.
- **Jumpers** (knight, king, pawn): Have fixed move patterns; not blocked by other pieces (except pawns cannot move through occupied squares).
- **Capture**: Must be an uncapturable piece to resist capture (duck). All other pieces can be captured.
- **King capture = win**: Capturing the opponent's king ends the game immediately (player_won or enemy_won).

## Tagging System

Pieces can have tags (stored in `piece.tags` Set) for special behavior:

- **`uncapturable`**: Cannot be captured by any piece (duck). Movegen filters these from capture targets.
- Future tags: `immune_to_X`, `double_move`, etc.

## Pawn Promotion

When a player pawn reaches rank 8 or an enemy pawn reaches rank 1:
- Promotion modal appears (in game screen)
- Player chooses queen, rook, bishop, or knight
- Pawn is replaced with chosen piece

AI auto-promotes pawns to queen in `makeMove()`.

## Piece Images

All piece images are 60×60 PNG files stored in `pieces/`:

**White (player):**
- King: `Chess_klt60.png`
- Queen: `Chess_qlt60.png`
- Rook: `Chess_rlt60.png`
- Bishop: `Chess_blt60.png`
- Knight: `Chess_nlt60.png`
- Pawn: `Chess_plt60.png`

**Black (enemy):**
- King: `Chess_kdt60.png`
- Queen: `Chess_qdt60.png`
- Rook: `Chess_rdt60.png`
- Bishop: `Chess_bdt60.png`
- Knight: `Chess_ndt60.png`
- Pawn: `Chess_pdt60.png`

**Neutral:**
- Duck: `duck.png`

Image paths are referenced in:
- `js/ui.js` → `PIECES` object (rendering board)
- `js/rewards.js` → `WHITE_PIECES` object (reward picking)

## Creation & Internals

Pieces are created via `makePiece(type, owner, overrides)` from `js/engine2/pieces.js`:

```javascript
const duck = makePiece('duck', 'neutral');
const pawn = makePiece('pawn', 'player', { sq: 'a2' });
const king = makePiece('king', 'enemy', { sq: 'e8' });
```

Move generation is defined in `PIECE_DEFS` (also in `pieces.js`):
- Pawn: Forward 1 (or 2 if unmoved); diag capture
- Knight: L-hops (no blocking)
- Bishop/Rook/Queen: Sliding in their respective directions
- King: 1 sq in any direction
- Duck: No moves (always an empty list)

## Tilelist Example

When defining enemies or placing pieces on the board:

```javascript
{ type: 'king',   owner: 'enemy', sq: 'e8' },
{ type: 'pawn',   owner: 'player', sq: 'a2' },
{ type: 'duck',   owner: 'neutral', sq: 'd4' },
```

Owner must be exactly `'player'`, `'enemy'`, or `'neutral'`.
