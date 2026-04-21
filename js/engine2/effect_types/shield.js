/**
 * engine2/effect_types/shield.js
 * Shield effect: piece tag `shielded` blocks the first inbound capture.
 *
 * makeShieldEffect(pieceId) → Effect
 *   - Returns an effect object to attach as { piece: pieceId }.
 *   - onBeforeAction: if the action targets this piece and is a capture,
 *     set ctx.cancel = true and remove the `shielded` tag (via _setTag so
 *     the removal is undo-logged).
 *
 * Cancellation protocol (P5 spec):
 *   - onBeforeAction sets ctx.cancel = true.
 *   - resolveAction checks ctx.cancel after onBeforeAction; if set, skips all
 *     board mutations and logs a no-op inverse.
 */

import { _setTag } from '../actions.js';
import { sqToRC } from '../board.js';

/**
 * Return true if the action is a capture aimed at the shielded piece.
 * Works for kind='move' (piece at dest is about to be overwritten) and
 * kind='capture' (pure cascade capture).
 *
 * @param {object} state
 * @param {object} action
 * @param {string} pieceId   id of the shielded piece
 * @returns {boolean}
 */
function _isInboundCapture(state, action, pieceId) {
  const { kind, source, targets } = action;
  const dest = targets?.[0];
  if (!dest) return false;

  // The destination must currently hold the shielded piece.
  const [dr, dc] = sqToRC(dest);
  const occupant = state.board[dr][dc];
  if (!occupant || occupant.id !== pieceId) return false;

  // Must be an enemy (different owner) moving into the square.
  if (kind === 'move') {
    const [sr, sc] = sqToRC(source);
    const mover = state.board[sr][sc];
    if (!mover) return false;
    return mover.owner !== occupant.owner;
  }

  if (kind === 'capture') {
    // Pure cascade capture — always counts as a capture attempt.
    return true;
  }

  return false;
}

/**
 * Create a shield effect for the piece with `pieceId`.
 *
 * @param {string} pieceId
 * @returns {{ id: string, hooks: object }}
 */
export function makeShieldEffect(pieceId) {
  return {
    id: `shield:${pieceId}`,
    hooks: {
      /**
       * Fires before any board mutation.
       * If this is an inbound capture on the shielded piece:
       *   1. Remove the 'shielded' tag (undo-logged so undo restores it).
       *   2. Set ctx.cancel = true so resolveAction skips the mutation.
       */
      onBeforeAction(ctx) {
        const { action, log } = ctx;
        if (!_isInboundCapture(ctx._state, action, pieceId)) return;

        const dest = action.targets[0];
        const [dr, dc] = sqToRC(dest);
        const piece = ctx._state.board[dr][dc];

        if (!piece || !piece.tags.has('shielded')) return;

        console.log('[engine2/shield] cancel capture pieceId=%s sq=%s', pieceId, dest);

        // Remove the tag — logged so undo restores it.
        _setTag(piece, 'shielded', 'delete', log);

        // Signal cancellation.
        ctx.cancel = true;
      },
    },
  };
}

console.log('[engine2/effect_types/shield] loaded');
