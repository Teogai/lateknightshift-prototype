// cards2/aoe_card.js — aoeCard: pick a center square, trigger explode effect on it.
// Produces Action {kind:'move', source, targets:[centerSq], payload:{explode:true}}
// The explodeEffect (global) captures all in-bounds neighbors via cascade.
//
// targetGenerator yields every non-empty square as a potential center.

import { get, sqToRC, rcToSq, inBounds } from '../engine2/board.js';

/**
 * aoeCard({radius})
 *   play(state, sourceSq, centerSq) -> Action | null
 *   targetGenerator(state, sourceSq)  -> Iterable<sq>
 *
 * radius is informational for future use; the actual explosion radius is
 * controlled by explodeEffect (which uses Chebyshev-1 neighbors).
 */
export function aoeCard({ radius = 1 } = {}) {
  return {
    name: 'AOE',
    kind: 'aoe',
    radius,

    play(state, sourceSq, centerSq) {
      if (!centerSq) {
        console.log('[cards2/aoe] rejected — no center src=%s', sourceSq);
        return null;
      }
      console.log('[cards2/aoe] play src=%s center=%s radius=%d', sourceSq, centerSq, radius);
      return {
        kind: 'move',
        source: sourceSq,
        targets: [centerSq],
        payload: { explode: true },
      };
    },

    *targetGenerator(state, sourceSq) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (state.board[r][c] !== null) {
            yield rcToSq(r, c);
          }
        }
      }
    },
  };
}

console.log('[cards2/aoe_card] loaded');
