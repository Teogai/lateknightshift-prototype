/**
 * engine2/effects.js
 * Effect registry + lifecycle hook runner.
 *
 * An effect: { id, hooks: { onBeforeAction?, onAction?, onCapture?, onAfterAction?, onTurnStart?, onTurnEnd?, onTileEnter? } }
 *
 * Scopes:
 *   - 'global'         → fires for every action
 *   - { piece: id }    → fires only while that piece is alive on the board
 *   - { tile: sq }     → fires when the source or target tile matches
 *
 * attachEffect(state, scope, effect)
 *   - Registers effect under the given scope.
 *   - Returns the effect (for chaining / convenience).
 *
 * runHook(state, hookName, ctx)
 *   - Walks effects in fixed order: global → source piece → target piece → source tile → target tile.
 *   - Piece-scoped effects only fire if the piece id exists somewhere on the board.
 *   - ctx must contain { action: { source, targets, ... } }.
 *
 * Depth cap: 64 cascading actions (not enforced here — caller responsibility).
 */

import { sqToRC, rcToSq } from './board.js';

// ─── internal registry ────────────────────────────────────────────────────────

/**
 * Ensure state has an effects registry. Lazily initialised so existing
 * GameState instances (fromJSON etc.) don't need changes.
 * @param {object} state
 * @returns {{ global: Effect[], pieces: Map<string, Effect[]>, tiles: Map<string, Effect[]> }}
 */
function _registry(state) {
  if (!state._effects) {
    state._effects = {
      global: [],           // Effect[]
      pieces: new Map(),    // pieceId → Effect[]
      tiles: new Map(),     // sq → Effect[]
    };
    console.log('[engine2/effects] registry created');
  }
  return state._effects;
}

// ─── piece liveness check ─────────────────────────────────────────────────────

/**
 * Return true if a piece with the given id exists anywhere on the board.
 * O(64) but only called during hook dispatch, which is rare.
 * @param {object} state
 * @param {string} pieceId
 * @returns {boolean}
 */
function _pieceAlive(state, pieceId) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.id === pieceId) return true;
    }
  }
  return false;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Attach an effect to a scope.
 * @param {object} state
 * @param {'global' | { piece: string } | { tile: string }} scope
 * @param {{ id: string, hooks: object }} effect
 * @returns {object} the effect
 */
export function attachEffect(state, scope, effect) {
  const reg = _registry(state);

  if (scope === 'global') {
    reg.global.push(effect);
    console.log('[engine2/effects] attach scope=global id=%s', effect.id);
  } else if (scope.piece !== undefined) {
    const list = reg.pieces.get(scope.piece) ?? [];
    list.push(effect);
    reg.pieces.set(scope.piece, list);
    console.log('[engine2/effects] attach scope=piece id=%s pieceId=%s', effect.id, scope.piece);
  } else if (scope.tile !== undefined) {
    const list = reg.tiles.get(scope.tile) ?? [];
    list.push(effect);
    reg.tiles.set(scope.tile, list);
    console.log('[engine2/effects] attach scope=tile id=%s sq=%s', effect.id, scope.tile);
  } else {
    console.warn('[engine2/effects] attachEffect unknown scope=%o', scope);
  }

  return effect;
}

/**
 * Run a named hook across all registered effects in fixed order:
 *   global → source piece → target piece → source tile → target tile
 *
 * Piece-scoped effects are silently skipped if the piece is no longer on the board.
 *
 * @param {object} state
 * @param {string} hookName  - e.g. 'onBeforeAction'
 * @param {object} ctx       - { action, ...any extra context }
 */
export function runHook(state, hookName, ctx) {
  if (!state._effects) return; // no effects attached at all

  const reg = state._effects;
  const action = ctx.action ?? {};
  const source = action.source ?? null;
  const dest   = (action.targets && action.targets[0]) ?? null;

  // 1. Global effects
  for (const effect of reg.global) {
    const fn = effect.hooks[hookName];
    if (fn) fn(ctx);
  }

  // Helper: fire piece-scoped effects for a given piece id (only if alive)
  const _firePiece = (pieceId) => {
    if (!pieceId) return;
    if (!_pieceAlive(state, pieceId)) return;
    const list = reg.pieces.get(pieceId);
    if (!list) return;
    for (const effect of list) {
      const fn = effect.hooks[hookName];
      if (fn) fn(ctx);
    }
  };

  // Helper: fire tile-scoped effects for a given square
  const _fireTile = (sq) => {
    if (!sq) return;
    const list = reg.tiles.get(sq);
    if (!list) return;
    for (const effect of list) {
      const fn = effect.hooks[hookName];
      if (fn) fn(ctx);
    }
  };

  // Resolve piece ids at source / target squares
  const srcPieceId = source ? _pieceIdAt(state.board, source) : null;
  const tgtPieceId = dest   ? _pieceIdAt(state.board, dest)   : null;

  // 2. Source piece
  _firePiece(srcPieceId);

  // 3. Target piece (different from source piece).
  if (tgtPieceId && tgtPieceId !== srcPieceId) {
    _firePiece(tgtPieceId);
  }

  // 3b. Dying piece: for onCapture, the captured piece is already off the board,
  //     so tgtPieceId resolves to the attacker (now occupying that square), not
  //     the dead piece. ctx.capturedPieceId carries the dead piece's id so its
  //     piece-scoped effects can still fire (bypass liveness check).
  const capturedId = ctx.capturedPieceId ?? null;
  if (capturedId && capturedId !== srcPieceId && capturedId !== tgtPieceId) {
    const list = reg.pieces.get(capturedId);
    if (list) {
      for (const effect of list) {
        const fn = effect.hooks[hookName];
        if (fn) fn(ctx);
      }
    }
  }

  // 4. Source tile
  _fireTile(source);

  // 5. Target tile (different from source tile)
  if (dest && dest !== source) {
    _fireTile(dest);
  }
}

/**
 * Return the id of the piece at the given square, or null.
 * @param {Array[]} board
 * @param {string} sq
 * @returns {string|null}
 */
function _pieceIdAt(board, sq) {
  const [r, c] = sqToRC(sq);
  const piece = board[r]?.[c];
  return piece ? piece.id : null;
}

console.log('[engine2/effects] loaded');
