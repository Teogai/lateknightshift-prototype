/**
 * engine2/pieces.js
 * Piece factory and PIECE_DEFS move generators.
 * No chess.js dependency.
 */

import { sqToRC, rcToSq, inBounds, get } from './board.js';

// ─── ID counter ───────────────────────────────────────────────────────────────

let _nextId = 1;
function nextId() { return _nextId++; }

// ─── factory ──────────────────────────────────────────────────────────────────

/**
 * Create a new Piece.
 * @param {string} type  - 'pawn'|'knight'|'bishop'|'rook'|'queen'|'king'|'duck'
 * @param {string} owner - 'player'|'enemy'|'neutral'
 * @param {object} overrides - optional extra fields merged into piece
 */
export function makePiece(type, owner, overrides = {}) {
  const def = PIECE_DEFS[type];
  const defaultTags = def?.defaultTags ? new Set(def.defaultTags) : new Set();
  return {
    type,
    owner,
    tags: defaultTags,
    data: {},
    id: nextId(),
    ...overrides,
  };
}

// ─── direction tables ─────────────────────────────────────────────────────────

const DIAG_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const QUEEN_DIRS = [...DIAG_DIRS, ...ROOK_DIRS];
const KNIGHT_HOPS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_DIRS  = QUEEN_DIRS;

// ─── sliding helper ───────────────────────────────────────────────────────────

/**
 * Yield all squares reachable by sliding in one direction until blocked.
 * Returns array of {sq, capture?} objects.
 */
function slideMoves(board, fromR, fromC, dr, dc, owner) {
  const moves = [];
  let r = fromR + dr, c = fromC + dc;
  while (inBounds(r, c)) {
    const sq = rcToSq(r, c);
    const occupant = board[r][c];
    if (occupant) {
      // Uncapturable pieces block but cannot be taken
      if (occupant.owner !== owner && !occupant.tags?.has('uncapturable')) {
        moves.push({ sq, capture: occupant }); // capture
      }
      break; // blocked regardless
    }
    moves.push({ sq });
    r += dr; c += dc;
  }
  return moves;
}

// ─── PIECE_DEFS ───────────────────────────────────────────────────────────────

/**
 * generateMoves(board, sq, piece, ctx) → [{sq, capture?, promotion?}, ...]
 * ctx: { enPassant, castling, owner } (owner for orientation / rights lookup)
 *
 * Returns pseudo-legal destinations only (no self-check filtering here).
 * Promotion: returns one entry per promotion piece when reaching back rank.
 * En passant: returns {sq, enPassantCapture: capturedSq} when applicable.
 * Castling: handled in movegen.js (needs king-safety checks).
 */
export const PIECE_DEFS = {
  pawn: {
    generateMoves(board, sq, piece, ctx) {
      const [fromR, fromC] = sqToRC(sq);
      const dir = piece.owner === 'player' ? -1 : 1; // player moves up (decreasing row), enemy down
      const startRank = piece.owner === 'player' ? 6 : 1;
      const promoRank = piece.owner === 'player' ? 0 : 7;
      const moves = [];

      // One-square push
      const r1 = fromR + dir;
      if (inBounds(r1, fromC) && !board[r1][fromC]) {
        const toSq = rcToSq(r1, fromC);
        if (r1 === promoRank) {
          for (const promo of ['queen', 'rook', 'bishop', 'knight']) {
            moves.push({ sq: toSq, promotion: promo });
          }
        } else {
          moves.push({ sq: toSq });
        }
        // Two-square push from starting rank
        if (fromR === startRank) {
          const r2 = fromR + 2 * dir;
          if (inBounds(r2, fromC) && !board[r2][fromC]) {
            moves.push({ sq: rcToSq(r2, fromC) });
          }
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const rc = fromC + dc;
        if (!inBounds(r1, rc)) continue;
        const target = board[r1][rc];
        const toSq = rcToSq(r1, rc);
        if (target && target.owner !== piece.owner && !target.tags?.has('uncapturable')) {
          if (r1 === promoRank) {
            for (const promo of ['queen', 'rook', 'bishop', 'knight']) {
              moves.push({ sq: toSq, capture: target, promotion: promo });
            }
          } else {
            moves.push({ sq: toSq, capture: target });
          }
        }
        // En passant
        if (ctx?.enPassant === toSq) {
          const capturedR = fromR; // same rank as moving pawn
          const capturedSq = rcToSq(capturedR, rc);
          const capturedPawn = board[capturedR][rc];
          if (capturedPawn && capturedPawn.owner !== piece.owner && capturedPawn.type === 'pawn') {
            moves.push({ sq: toSq, enPassantCapture: capturedSq });
          }
        }
      }

      return moves;
    },
  },

  knight: {
    generateMoves(board, sq, piece) {
      const [fromR, fromC] = sqToRC(sq);
      const moves = [];
      for (const [dr, dc] of KNIGHT_HOPS) {
        const r = fromR + dr, c = fromC + dc;
        if (!inBounds(r, c)) continue;
        const occupant = board[r][c];
        if (occupant && occupant.owner === piece.owner) continue;
        // Skip uncapturable occupants (cannot move onto them)
        if (occupant && occupant.tags?.has('uncapturable')) continue;
        moves.push({ sq: rcToSq(r, c), ...(occupant ? { capture: occupant } : {}) });
      }
      return moves;
    },
  },

  bishop: {
    generateMoves(board, sq, piece) {
      const [fromR, fromC] = sqToRC(sq);
      const moves = [];
      for (const [dr, dc] of DIAG_DIRS) {
        moves.push(...slideMoves(board, fromR, fromC, dr, dc, piece.owner));
      }
      return moves;
    },
  },

  rook: {
    generateMoves(board, sq, piece) {
      const [fromR, fromC] = sqToRC(sq);
      const moves = [];
      for (const [dr, dc] of ROOK_DIRS) {
        moves.push(...slideMoves(board, fromR, fromC, dr, dc, piece.owner));
      }
      return moves;
    },
  },

  queen: {
    generateMoves(board, sq, piece) {
      const [fromR, fromC] = sqToRC(sq);
      const moves = [];
      for (const [dr, dc] of QUEEN_DIRS) {
        moves.push(...slideMoves(board, fromR, fromC, dr, dc, piece.owner));
      }
      return moves;
    },
  },

  king: {
    generateMoves(board, sq, piece) {
      const [fromR, fromC] = sqToRC(sq);
      const moves = [];
      for (const [dr, dc] of KING_DIRS) {
        const r = fromR + dr, c = fromC + dc;
        if (!inBounds(r, c)) continue;
        const occupant = board[r][c];
        if (occupant && occupant.owner === piece.owner) continue;
        // Skip uncapturable occupants (cannot move onto them)
        if (occupant && occupant.tags?.has('uncapturable')) continue;
        moves.push({ sq: rcToSq(r, c), ...(occupant ? { capture: occupant } : {}) });
      }
      // Castling is generated in movegen.js (needs king-safety checks)
      return moves;
    },
  },

  duck: {
    defaultTags: ['uncapturable'],
    generateMoves(_board, _sq, _piece, _ctx) {
      // Duck never moves on its own turn
      return [];
    },
  },
};

console.log('[engine2/pieces] loaded types=%s', Object.keys(PIECE_DEFS).join(','));
