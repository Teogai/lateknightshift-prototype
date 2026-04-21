/**
 * ai2/order.js
 * Move ordering for alpha-beta pruning efficiency.
 *
 * Order:
 *   1. King captures first (immediate win)
 *   2. Captures by MVV-LVA: (victim value - attacker value); high-value victims first
 *   3. Explode actions (high potential; no direct piece value but cascades)
 *   4. Quiet moves last
 *
 * No chess.js dependency.
 */

import { PIECE_VALUES, pieceValue } from './evaluate.js';

// ─── ordering score ───────────────────────────────────────────────────────────

/**
 * Assign a sort score (higher = try first).
 * @param {object} action  - { kind, source, targets, piece, capture? }
 * @param {Array[]} board  - 8×8 board
 * @returns {number}
 */
function actionScore(action, board) {
  const { kind, source, targets, piece, capture } = action;
  const dest = targets?.[0];

  // Explode: high priority (removes multiple pieces)
  if (kind === 'explode') return 8000;

  // King capture: highest priority — immediate win
  if (dest && board) {
    const [dr, dc] = destRC(dest);
    const target = board[dr]?.[dc];
    if (target?.type === 'king' && target.owner !== piece?.owner) {
      return 10000;
    }
  }

  // Standard capture: MVV-LVA (most valuable victim, least valuable attacker)
  if (capture || (dest && board && isCapture(action, board))) {
    let victimVal = 0;
    if (capture) {
      victimVal = pieceValue(capture);
    } else if (dest && board) {
      const [dr, dc] = destRC(dest);
      const target = board[dr]?.[dc];
      if (target) victimVal = pieceValue(target);
    }
    const attackerVal = piece ? (PIECE_VALUES[piece.type] ?? 0) : 0;
    // MVV-LVA: high victim value + low attacker value → try first
    return 5000 + victimVal * 10 - attackerVal;
  }

  // Quiet move: 0 (try last)
  return 0;
}

function destRC(sq) {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1]);
  return [row, col];
}

function isCapture(action, board) {
  const dest = action.targets?.[0];
  if (!dest) return false;
  const [r, c] = destRC(dest);
  const target = board[r]?.[c];
  return target !== null && target !== undefined && target.owner !== action.piece?.owner;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Sort actions for better alpha-beta cutoffs.
 * Returns a new array sorted by priority (highest first).
 *
 * @param {object[]} actions
 * @param {Array[]}  board
 * @returns {object[]}
 */
export function orderActions(actions, board) {
  const scored = actions.map(a => ({ action: a, score: actionScore(a, board) }));
  scored.sort((a, b) => b.score - a.score);
  console.log('[ai2/order] actions=%d top=%s score=%d',
    actions.length,
    scored[0]?.action.kind ?? 'none',
    scored[0]?.score ?? 0
  );
  return scored.map(s => s.action);
}
