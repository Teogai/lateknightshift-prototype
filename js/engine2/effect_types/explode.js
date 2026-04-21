/**
 * engine2/effect_types/explode.js
 * Reference effect: on `onAction` of a move with `payload.explode`,
 * enqueue {kind:'capture', targets:[sq]} for each in-bounds neighbor.
 *
 * Attach as a global effect via:
 *   attachEffect(state, 'global', explodeEffect)
 *
 * The cascade queue in resolveAction drains all enqueued captures.
 */

import { sqToRC, rcToSq, inBounds } from '../board.js';

// ─── neighbor helper ──────────────────────────────────────────────────────────

/**
 * Return algebraic squares of all in-bounds king-move neighbors of sq.
 * @param {string} sq  algebraic square
 * @returns {string[]}
 */
function neighbors(sq) {
  const [r, c] = sqToRC(sq);
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (inBounds(r + dr, c + dc)) {
        result.push(rcToSq(r + dr, c + dc));
      }
    }
  }
  return result;
}

// ─── effect ───────────────────────────────────────────────────────────────────

/**
 * explodeEffect — global effect that triggers an explosion cascade.
 *
 * When an action has `payload.explode === true`, enqueues a 'capture' action
 * for each in-bounds neighbor of targets[0].
 *
 * Capture actions emitted here use kind='capture' with a single target square.
 * resolveAction handles 'capture' by clearing board[target] (null).
 */
export const explodeEffect = {
  id: 'explode',
  hooks: {
    onAction: (ctx) => {
      const { action } = ctx;
      if (!action.payload?.explode) return;
      const center = action.targets[0];
      if (!center) return;

      const nbrs = neighbors(center);
      console.log('[engine2/explode] explosion center=%s neighbors=%d', center, nbrs.length);

      for (const sq of nbrs) {
        ctx.enqueue({
          kind: 'capture',
          source: center,
          targets: [sq],
          payload: null,
        });
      }
    },
  },
};

console.log('[engine2/effect_types/explode] loaded');
