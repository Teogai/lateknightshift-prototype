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
 * Resolve an action against state, recording all mutations in log.
 *
 * @param {object} state  - GameState (board, tiles, enPassant, castling, ...)
 * @param {object} action - { kind, source, targets, piece, capture?, payload? }
 * @param {Array}  log    - mutation inverse log (caller provides, effects will extend)
 */
export function resolveAction(state, action, log = []) {
  const { board, tiles } = state;
  const { kind, source, targets, payload } = action;
  const dest = targets[0];

  console.log('[engine2/actions] kind=%s src=%s dst=%s', kind, source, dest);

  if (kind === 'castle') {
    _resolveCastle(state, action, log);
  } else if (kind === 'en_passant') {
    _resolveEnPassant(state, action, log);
  } else {
    // Normal move (includes captures and promotions)
    _resolveMove(state, action, log);
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
