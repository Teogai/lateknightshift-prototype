/**
 * ai2/search.js
 * Minimax + alpha-beta search for engine2 AI.
 * Uses state.play / state.undo (mutation log path) — no board cloning.
 * No chess.js dependency.
 *
 * Public API:
 *   selectAction(state, owner, opts?) → Action
 *   opts: { depth?, timeMs?, personality?, overrideActions? }
 */

import { generateLegalActions } from '../engine2/movegen.js';
import { evaluate } from './evaluate.js';
import { orderActions } from './order.js';
import { sqToRC } from '../engine2/board.js';

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_DEPTH  = 3;
const DEFAULT_TIME_MS = 200;

const WIN_SCORE  =  1_000_000;
const LOSE_SCORE = -1_000_000;

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * True if the enemy king is missing from the board.
 * Indicates the game is over (player won).
 */
function enemyKingGone(board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.owner === 'enemy') return false;
    }
  }
  return true;
}

/**
 * True if the player king is missing from the board.
 * Indicates the enemy won (goal for the AI).
 */
function playerKingGone(board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.owner === 'player') return false;
    }
  }
  return true;
}

/**
 * Adaptive depth: go deeper in endgame (fewer pieces).
 */
function countPieces(board) {
  let n = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c]) n++;
  return n;
}

function adaptiveDepth(board, baseDepth) {
  const n = countPieces(board);
  if (n <= 4) return baseDepth + 2;
  if (n <= 7) return baseDepth + 1;
  return baseDepth;
}

/**
 * Build an action list for the given owner.
 * Includes any override actions (e.g. explode) merged in, with overrides
 * that have `source` matching legal move sources replacing only quiet moves.
 */
function buildActions(state, owner, overrideActions) {
  const legal = generateLegalActions(state, owner);
  if (!overrideActions || overrideActions.length === 0) return legal;
  // Merge: append overrides (dedup by kind+source+targets[0] if needed).
  return [...overrideActions, ...legal];
}

// ─── explode resolution (search-side) ────────────────────────────────────────

/**
 * Apply an explode action to state for search.
 * Removes all pieces within radius of target square.
 * Returns a list of {sq, prev} for undo.
 *
 * Explode does NOT use state.play/undo because it's a synthetic action
 * not in engine2/actions.js yet. We do a direct board mutation + manual undo.
 */
function applyExplode(state, action) {
  const dest = action.targets[0];
  const radius = action.payload?.radius ?? 1;
  const [tr, tc] = sqToRC(dest);

  const undos = [];
  for (let r = Math.max(0, tr - radius); r <= Math.min(7, tr + radius); r++) {
    for (let c = Math.max(0, tc - radius); c <= Math.min(7, tc + radius); c++) {
      const prev = state.board[r][c];
      if (prev !== null) {
        state.board[r][c] = null;
        undos.push({ r, c, prev });
      }
    }
  }
  console.log('[ai2/search] applyExplode dest=%s radius=%d removed=%d', dest, radius, undos.length);
  return undos;
}

function undoExplode(state, undos) {
  for (const { r, c, prev } of undos) {
    state.board[r][c] = prev;
  }
}

// ─── minimax ──────────────────────────────────────────────────────────────────

/**
 * @param {object}   state       - GameState (mutated in-place, undone after each branch)
 * @param {number}   depth
 * @param {number}   alpha
 * @param {number}   beta
 * @param {boolean}  maximizing  - true = enemy turn (maximising), false = player turn
 * @param {object}   personality - eval weight overrides
 * @returns {number}
 */
function minimax(state, depth, alpha, beta, maximizing, personality) {
  if (depth === 0) return evaluate(state, personality);

  const owner = maximizing ? 'enemy' : 'player';
  const actions = generateLegalActions(state, owner);
  const ordered = orderActions(actions, state.board);

  if (ordered.length === 0) return evaluate(state, personality);

  if (maximizing) {
    let best = -Infinity;
    for (const action of ordered) {
      let score;
      if (action.kind === 'explode') {
        const undos = applyExplode(state, action);
        if (playerKingGone(state.board)) {
          score = WIN_SCORE + depth; // win sooner is better
        } else {
          score = minimax(state, depth - 1, alpha, beta, false, personality);
        }
        undoExplode(state, undos);
      } else {
        state.play(action);
        if (playerKingGone(state.board)) {
          score = WIN_SCORE + depth;
        } else if (enemyKingGone(state.board)) {
          score = LOSE_SCORE - depth;
        } else {
          score = minimax(state, depth - 1, alpha, beta, false, personality);
        }
        state.undo();
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const action of ordered) {
      let score;
      if (action.kind === 'explode') {
        const undos = applyExplode(state, action);
        if (enemyKingGone(state.board)) {
          score = LOSE_SCORE - depth;
        } else {
          score = minimax(state, depth - 1, alpha, beta, true, personality);
        }
        undoExplode(state, undos);
      } else {
        state.play(action);
        if (enemyKingGone(state.board)) {
          score = LOSE_SCORE - depth;
        } else if (playerKingGone(state.board)) {
          score = WIN_SCORE + depth;
        } else {
          score = minimax(state, depth - 1, alpha, beta, true, personality);
        }
        state.undo();
      }
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Select the best action for `owner` using iterative deepening minimax + αβ.
 *
 * @param {object} state   - GameState
 * @param {string} owner   - 'enemy' | 'player'
 * @param {object} opts
 * @param {number}   opts.depth           - max search depth (default 3)
 * @param {number}   opts.timeMs          - time budget in ms (default 200)
 * @param {object}   opts.personality     - eval weight overrides
 * @param {object[]} opts.overrideActions - inject additional actions (e.g. explode)
 * @returns {object|null} best action
 */
export function selectAction(state, owner, {
  depth    = DEFAULT_DEPTH,
  timeMs   = DEFAULT_TIME_MS,
  personality = {},
  overrideActions = [],
} = {}) {
  const actions = buildActions(state, owner, overrideActions);

  if (!actions || actions.length === 0) {
    console.log('[ai2/search] no actions owner=%s', owner);
    return null;
  }

  const ordered = orderActions(actions, state.board);

  // Direct king capture — no need to search
  for (const action of ordered) {
    const dest = action.targets?.[0];
    if (dest) {
      const [dr, dc] = sqToRC(dest);
      const target = state.board[dr]?.[dc];
      if (target?.type === 'king' && target.owner !== owner) {
        console.log('[ai2/search] direct king capture src=%s dst=%s', action.source, dest);
        return action;
      }
    }
  }

  const d = adaptiveDepth(state.board, depth);
  const start = Date.now();

  let bestAction = ordered[0];
  let bestScore  = -Infinity;
  let bestImmediate = -Infinity;

  // Iterative deepening
  for (let curDepth = 1; curDepth <= d; curDepth++) {
    let iterBest = ordered[0];
    let iterScore = -Infinity;
    let iterImmediate = -Infinity;

    for (const action of ordered) {
      let score;
      let immediate;

      if (action.kind === 'explode') {
        const undos = applyExplode(state, action);
        immediate = evaluate(state, personality);
        if (playerKingGone(state.board)) {
          score = WIN_SCORE + curDepth;
        } else {
          score = minimax(state, curDepth - 1, -Infinity, Infinity, false, personality);
        }
        undoExplode(state, undos);
      } else {
        state.play(action);
        immediate = evaluate(state, personality);
        if (playerKingGone(state.board)) {
          score = WIN_SCORE + curDepth;
        } else if (enemyKingGone(state.board)) {
          score = LOSE_SCORE - curDepth;
        } else {
          score = minimax(state, curDepth - 1, -Infinity, Infinity, false, personality);
        }
        state.undo();
      }

      console.log('[ai2/search] depth=%d src=%s dst=%s score=%d', curDepth, action.source, action.targets?.[0], score);

      if (score > iterScore || (score === iterScore && immediate > iterImmediate)) {
        iterScore = score;
        iterImmediate = immediate;
        iterBest = action;
      }
    }

    bestAction    = iterBest;
    bestScore     = iterScore;
    bestImmediate = iterImmediate;

    const elapsed = Date.now() - start;
    console.log('[ai2/search] iter depth=%d score=%d elapsed=%dms', curDepth, bestScore, elapsed);

    // Time budget: stop if we've used half the budget (next iteration ~10× more expensive)
    if (elapsed > timeMs / 2) break;
  }

  console.log('[ai2/search] selected src=%s dst=%s score=%d', bestAction.source, bestAction.targets?.[0], bestScore);
  return bestAction;
}
