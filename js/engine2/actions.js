/**
 * engine2/actions.js
 * Action resolution + mutation helpers with inverse log for undo.
 *
 * Mutation helpers: _set, _setTag, _setData, _setTile
 *   - Each records an inverse entry onto the current action's log.
 *   - log is passed explicitly so AI search can use a fresh [] per ply.
 *
 * resolveAction(state, action, log)
 *   - Applies action to state, records all inverse mutations in log.
 *   - Effects phase will extend this entry point later.
 *
 * state.undo()
 *   - Pops the top log from state.undoStack and replays inverses in reverse.
 */

import { sqToRC, rcToSq } from './board.js';
import { runHook } from './effects.js';
import { TILE_DEFS } from './tiles.js';

// ─── mutation helpers ─────────────────────────────────────────────────────────

/**
 * Set board[r][c] = val; push inverse onto log.
 * @param {Array[]} board
 * @param {string}  sq    algebraic square
 * @param {*}       val   new value (Piece|null)
 * @param {Array}   log   inverse log for current action
 */
export function _set(board, sq, val, log) {
  const [r, c] = sqToRC(sq);
  const prev = board[r][c];
  board[r][c] = val;
  log.push(() => { board[r][c] = prev; });
}

/**
 * Add or remove a tag on piece.tags; push inverse onto log.
 * op: 'add' | 'delete'
 */
export function _setTag(piece, tag, op, log) {
  const had = piece.tags.has(tag);
  if (op === 'add') piece.tags.add(tag);
  else piece.tags.delete(tag);
  log.push(() => {
    if (had) piece.tags.add(tag);
    else piece.tags.delete(tag);
  });
}

/**
 * Set piece.data[key] = val; push inverse onto log.
 */
export function _setData(piece, key, val, log) {
  const prev = piece.data[key];
  piece.data[key] = val;
  log.push(() => { piece.data[key] = prev; });
}

/**
 * Set tiles[r][c] = val; push inverse onto log.
 */
export function _setTile(tiles, sq, val, log) {
  const [r, c] = sqToRC(sq);
  const prev = tiles[r][c];
  tiles[r][c] = val;
  log.push(() => { tiles[r][c] = prev; });
}

// ─── state-level scalar mutator ───────────────────────────────────────────────

/**
 * Set state[field] = val; push inverse onto log.
 * Used for enPassant, castling flags, turn, etc.
 */
export function _setState(state, field, val, log) {
  const prev = state[field];
  state[field] = val;
  log.push(() => { state[field] = prev; });
}

// ─── action resolution ────────────────────────────────────────────────────────

/**
 * Resolve a single action's board mutations and run its lifecycle hooks.
 * Does NOT manage the cascade queue — see resolveAction for the top-level entry.
 *
 * @param {object} state
 * @param {object} action
 * @param {Array}  log
 * @param {Array}  queue   - FIFO cascade queue; hooks push onto this via ctx.enqueue
 */
function _resolveOne(state, action, log, queue) {
  const { board } = state;
  const { kind, source, targets, payload } = action;
  const dest = targets?.[0];

  console.log('[engine2/actions] kind=%s src=%s dst=%s', kind, source, dest);

  const ctx = {
    action,
    /** Expose state so effects (e.g. shield) can read the board in onBeforeAction. */
    _state: state,
    /** Expose the mutation log so effects can record undo-loggable changes (e.g. tag removal). */
    log,
    /** Enqueue a cascaded action (FIFO). Effects call ctx.enqueue(action). */
    enqueue: (a) => {
      queue.push(a);
      console.log('[engine2/actions] enqueued kind=%s dst=%s qlen=%d', a.kind, a.targets?.[0], queue.length);
    },
  };

  // P6: if action targets an uncapturable piece, cancel immediately before hooks.
  if (dest && kind !== 'castle' && kind !== 'en_passant') {
    const [dr, dc] = sqToRC(dest);
    const destPiece = board[dr][dc];
    if (destPiece?.tags?.has('uncapturable')) {
      console.log('[engine2/actions] cancelled — target uncapturable id=%s type=%s dst=%s', destPiece.id, destPiece.type, dest);
      ctx.cancel = true;
      return;
    }
  }

  // onBeforeAction: fires before any board mutation
  runHook(state, 'onBeforeAction', ctx);

  // P5: if any onBeforeAction hook set ctx.cancel, skip all mutations.
  // The log may already contain no-op inverse entries from the hook (e.g. tag
  // removal); those are preserved so undo restores correctly.
  if (ctx.cancel) {
    console.log('[engine2/actions] action cancelled kind=%s src=%s dst=%s', kind, source, dest);
    return;
  }

  // Detect capture BEFORE mutation; record the dying piece's id for onCapture hooks.
  // After mutation the piece is gone from the board, so piece-scoped onCapture
  // effects need the id injected via ctx.capturedPieceId.
  let isCapture = false;
  let capturedPieceId = null;
  if (kind === 'en_passant') {
    isCapture = true;
    // captured pawn is at payload.captured
    if (payload?.captured) {
      const [cr, cc] = sqToRC(payload.captured);
      const cp = board[cr][cc];
      if (cp) capturedPieceId = cp.id;
    }
  } else if (kind === 'capture') {
    isCapture = true;
    if (dest) {
      const [dr, dc] = sqToRC(dest);
      const cp = board[dr][dc];
      if (cp) capturedPieceId = cp.id;
    }
  } else if (kind !== 'castle' && dest) {
    const [dr, dc] = sqToRC(dest);
    const occupant = board[dr][dc];
    // Capture = destination occupied by a different owner than the moving piece
    if (occupant) {
      const [sr, sc] = sqToRC(source);
      const mover = board[sr][sc];
      if (!mover || occupant.owner !== mover.owner) {
        isCapture = true;
        capturedPieceId = occupant.id;
      }
    }
  }

  if (kind === 'castle') {
    _resolveCastle(state, action, log);
  } else if (kind === 'en_passant') {
    _resolveEnPassant(state, action, log);
  } else if (kind === 'capture') {
    // Pure capture: clear the target square (used by cascade effects like explode)
    _resolveCapture(state, action, log);
  } else {
    // Normal move (includes captures and promotions)
    _resolveMove(state, action, log);
  }

  // P8: onTileEnter — fire tile effect when a piece lands on a destination square.
  // Applies to move and en_passant (where the piece ends up at dest).
  // Does NOT apply to castle (king lands but tile effects are not expected there)
  // or pure capture (no piece moves onto the square).
  if (dest && (kind === 'move' || kind === 'en_passant')) {
    const [dr, dc] = sqToRC(dest);
    const tileData = state.tiles?.[dr]?.[dc];
    if (tileData) {
      const tileDef = TILE_DEFS[tileData.type];
      if (tileDef?.onTileEnter) {
        const landedPiece = board[dr][dc];
        if (landedPiece) {
          console.log('[engine2/actions] onTileEnter tile=%s piece.id=%s sq=%s', tileData.type, landedPiece.id, dest);
          tileDef.onTileEnter(landedPiece, dest, log);
        }
      }
    }
  }

  // onAction: fires after mutation
  runHook(state, 'onAction', ctx);

  // onCapture: fires only when a piece was taken.
  // Inject capturedPieceId so piece-scoped effects on the dying piece still fire.
  if (isCapture) {
    ctx.capturedPieceId = capturedPieceId;
    runHook(state, 'onCapture', ctx);
    ctx.capturedPieceId = null; // clean up
  }

  // onAfterAction: fires last
  runHook(state, 'onAfterAction', ctx);
}

/**
 * Resolve an action against state, recording all mutations in log.
 * Maintains a FIFO cascade queue: effects may call ctx.enqueue(action) to
 * schedule follow-up actions. The queue drains fully or until depth > 64.
 *
 * All cascaded mutations are appended to the same log for unified undo.
 *
 * @param {object} state  - GameState (board, tiles, enPassant, castling, ...)
 * @param {object} action - { kind, source, targets, piece, capture?, payload? }
 * @param {Array}  log    - mutation inverse log (caller provides, effects will extend)
 */
export function resolveAction(state, action, log = []) {
  /** FIFO queue of pending cascaded actions. */
  const queue = [];

  // Resolve the top-level action (may push onto queue via ctx.enqueue)
  _resolveOne(state, action, log, queue);

  // Drain cascade queue with depth cap
  let depth = 0;
  const DEPTH_CAP = 64;

  while (queue.length > 0) {
    if (depth >= DEPTH_CAP) {
      console.warn('[engine2/actions] cascade depth cap reached depth=%d remaining=%d', depth, queue.length);
      break;
    }

    // FIFO: take from front
    const next = queue.shift();
    depth++;
    console.log('[engine2/actions] cascade depth=%d kind=%s dst=%s', depth, next.kind, next.targets?.[0]);
    _resolveOne(state, next, log, queue);
  }

  if (queue.length > 0) {
    console.log('[engine2/actions] cascade stopped depth=%d unresolved=%d', depth, queue.length);
  }
}

// ─── move ─────────────────────────────────────────────────────────────────────

function _resolveMove(state, action, log) {
  const { board } = state;
  const { source, targets, payload } = action;
  const dest = targets[0];

  const movingPiece = board[sqToRC(source)[0]][sqToRC(source)[1]];

  _set(board, source, null, log);

  if (payload?.promotion) {
    // Place promoted piece (same id/owner, new type)
    const promoted = { ...movingPiece, type: payload.promotion, tags: new Set(movingPiece.tags) };
    _set(board, dest, promoted, log);
  } else {
    _set(board, dest, movingPiece, log);
  }
}

// ─── castle ───────────────────────────────────────────────────────────────────

function _resolveCastle(state, action, log) {
  const { board } = state;
  const { source, targets, payload } = action;
  const kingDest = targets[0];
  const { rookFrom, rookTo } = payload;

  const [kr, kc] = sqToRC(source);
  const [rr, rc] = sqToRC(rookFrom);
  const kingPiece = board[kr][kc];
  const rookPiece = board[rr][rc];

  _set(board, source, null, log);
  _set(board, rookFrom, null, log);
  _set(board, kingDest, kingPiece, log);
  _set(board, rookTo, rookPiece, log);
}

// ─── pure capture (cascade) ───────────────────────────────────────────────────

/**
 * Pure capture: clear every square in action.targets.
 * Used by cascade effects (e.g. explode) that want to remove a piece without
 * "moving" anything. source is recorded for hook context but no piece moves.
 * Handles single-target (targets[0]) and multi-target (lineCard) alike.
 */
function _resolveCapture(state, action, log) {
  const { board } = state;
  const targets = action.targets;
  if (!targets || targets.length === 0) return;
  for (const dest of targets) {
    if (!dest) continue;
    const [dr, dc] = sqToRC(dest);
    const occupant = board[dr][dc];
    if (occupant !== null) {
      // Per-square uncapturable guard for multi-target captures.
      // (Single-target captures are already guarded by the pre-check above.)
      if (occupant?.tags?.has('uncapturable')) {
        console.log('[engine2/actions] capture skipped — uncapturable id=%s sq=%s', occupant.id, dest);
        continue;
      }
      console.log('[engine2/actions] capture clearing sq=%s', dest);
      _set(board, dest, null, log);
    }
  }
}

// ─── en passant ───────────────────────────────────────────────────────────────

function _resolveEnPassant(state, action, log) {
  const { board } = state;
  const { source, targets, payload } = action;
  const dest = targets[0];
  const capturedSq = payload.captured;

  const [sr, sc] = sqToRC(source);
  const movingPiece = board[sr][sc];

  _set(board, source, null, log);
  _set(board, dest, movingPiece, log);
  _set(board, capturedSq, null, log);
}

console.log('[engine2/actions] loaded');
