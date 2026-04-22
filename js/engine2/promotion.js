/**
 * engine2/promotion.js
 * Centralized pawn promotion detection and resolution.
 *
 * getPawnsNeedingPromotion(board) → [{ sq, owner }, ...]
 *   Scans board for pawns on back ranks.
 *   Player pawns on row 0 (rank 8), enemy pawns on row 7 (rank 1).
 *
 * resolvePromotions(state) → { playerPromos: [...], autoPromoted: [...] }
 *   Auto-promotes enemy pawns to queen.
 *   Returns player pawn squares needing promotion choice.
 */

import { rcToSq } from './board.js';
import { makePiece } from './pieces.js';
import { set } from './board.js';

export function getPawnsNeedingPromotion(board) {
  const needsPromo = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.type !== 'pawn') continue;
      if (piece.owner === 'player' && r === 0) {
        needsPromo.push({ sq: rcToSq(r, c), owner: 'player' });
      }
      if (piece.owner === 'enemy' && r === 7) {
        needsPromo.push({ sq: rcToSq(r, c), owner: 'enemy' });
      }
    }
  }
  return needsPromo;
}

export function resolvePromotions(state) {
  const promoSquares = getPawnsNeedingPromotion(state.board);
  const playerPromos = [];
  const autoPromoted = [];

  for (const p of promoSquares) {
    if (p.owner === 'enemy') {
      set(state.board, p.sq, makePiece('queen', 'enemy'));
      autoPromoted.push(p.sq);
    } else {
      playerPromos.push(p.sq);
    }
  }

  return { playerPromos, autoPromoted };
}
