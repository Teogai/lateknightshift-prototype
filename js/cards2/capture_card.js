// cards2/capture_card.js — snipeCard: ranged capture without moving
// Produces Action {kind:'capture', source, targets:[targetSq]}

import { get, sqToRC, rcToSq, inBounds } from '../engine2/board.js';

function chebyshev(a, b) {
  const [ar, ac] = sqToRC(a);
  const [br, bc] = sqToRC(b);
  return Math.max(Math.abs(ar - br), Math.abs(ac - bc));
}

function* allSquares() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      yield rcToSq(r, c);
    }
  }
}

function passesOwnerFilter(sourceOwner, targetPiece, ownerFilter) {
  if (!targetPiece) return false;
  if (ownerFilter === 'opponent') return targetPiece.owner !== sourceOwner;
  return true;
}

/**
 * snipeCard({range, ownerFilter})
 *   play(state, sourceSq, targetSq) -> Action
 *   targetGenerator(state, sourceSq) -> Iterable<sq>
 */
export function snipeCard({ range = 2, ownerFilter = 'opponent' } = {}) {
  return {
    name: 'Snipe',
    kind: 'snipe',
    range,
    ownerFilter,

    play(state, sourceSq, targetSq) {
      const sourcePiece = get(state.board, sourceSq);
      const sourceOwner = sourcePiece ? sourcePiece.owner : null;
      const targetPiece = get(state.board, targetSq);

      const dist = chebyshev(sourceSq, targetSq);
      if (dist > range || dist === 0) {
        console.log('[cards2] snipe rejected dist=%d range=%d src=%s tgt=%s', dist, range, sourceSq, targetSq);
        return null;
      }
      if (!passesOwnerFilter(sourceOwner, targetPiece, ownerFilter)) {
        console.log('[cards2] snipe rejected owner_filter src_owner=%s tgt_owner=%s filter=%s',
          sourceOwner, targetPiece ? targetPiece.owner : 'empty', ownerFilter);
        return null;
      }

      console.log('[cards2] snipe play src=%s tgt=%s dist=%d', sourceSq, targetSq, dist);
      return { kind: 'capture', source: sourceSq, targets: [targetSq] };
    },

    *targetGenerator(state, sourceSq) {
      const sourcePiece = get(state.board, sourceSq);
      const sourceOwner = sourcePiece ? sourcePiece.owner : null;
      for (const sq of allSquares()) {
        if (sq === sourceSq) continue;
        const dist = chebyshev(sourceSq, sq);
        if (dist > range) continue;
        const piece = get(state.board, sq);
        if (passesOwnerFilter(sourceOwner, piece, ownerFilter)) yield sq;
      }
    },
  };
}
