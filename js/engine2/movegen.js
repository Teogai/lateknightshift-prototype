/**
 * engine2/movegen.js
 * Legal action generation with self-check filtering.
 * No chess.js dependency.
 *
 * Action shape: { kind, source, targets: [sq], piece, capture?, payload? }
 *   kind: 'move' | 'castle' | 'en_passant'
 *   payload.promotion: 'queen'|'rook'|'bishop'|'knight'  (pawn promotions)
 *   payload.captured:  sq  (en passant captured pawn square)
 */

import { sqToRC, rcToSq, inBounds, get, set } from './board.js';
import { PIECE_DEFS } from './pieces.js';
import { resolveAction } from './actions.js';

// ─── attack detection ─────────────────────────────────────────────────────────

/**
 * Return true if square `sq` is attacked by any piece owned by `attackerOwner`.
 * Uses pseudo-legal attack geometry (ignores pins / turn).
 */
export function isAttackedBy(board, sq, attackerOwner) {
  const [tr, tc] = sqToRC(sq);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.owner !== attackerOwner) continue;
      if (attacksPseudo(board, r, c, piece, tr, tc)) return true;
    }
  }
  return false;
}

/** True if piece at (fromR, fromC) pseudo-legally attacks (toR, toC). */
function attacksPseudo(board, fromR, fromC, piece, toR, toC) {
  const dr = toR - fromR, dc = toC - fromC;
  switch (piece.type) {
    case 'pawn': {
      const fwdDir = piece.owner === 'player' ? -1 : 1;
      return dr === fwdDir && Math.abs(dc) === 1;
    }
    case 'knight': {
      return (Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
             (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    }
    case 'bishop':
      return Math.abs(dr) === Math.abs(dc) && dr !== 0 &&
             clearPath(board, fromR, fromC, toR, toC);
    case 'rook':
      return (dr === 0 || dc === 0) && !(dr === 0 && dc === 0) &&
             clearPath(board, fromR, fromC, toR, toC);
    case 'queen':
      return ((dr === 0 || dc === 0) || Math.abs(dr) === Math.abs(dc)) &&
             !(dr === 0 && dc === 0) &&
             clearPath(board, fromR, fromC, toR, toC);
    case 'king':
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && (dr !== 0 || dc !== 0);
    default:
      return false;
  }
}

/** True if path between (fromR,fromC) and (toR,toC) is clear (exclusive of endpoints). */
function clearPath(board, fromR, fromC, toR, toC) {
  const stepR = Math.sign(toR - fromR), stepC = Math.sign(toC - fromC);
  let r = fromR + stepR, c = fromC + stepC;
  while (r !== toR || c !== toC) {
    if (board[r][c]) return false;
    r += stepR; c += stepC;
  }
  return true;
}

// ─── king finder ──────────────────────────────────────────────────────────────

function findKingSq(board, owner) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.owner === owner) return rcToSq(r, c);
    }
  }
  return null;
}

// ─── opponent helper ──────────────────────────────────────────────────────────

function opponents(owner) {
  // All owners that are not `owner` (neutral never moves, but can be captured)
  if (owner === 'player') return ['enemy', 'neutral'];
  if (owner === 'enemy') return ['player', 'neutral'];
  return ['player', 'enemy'];
}

function isOpponent(owner, targetOwner) {
  return targetOwner !== owner && targetOwner !== null;
}

// ─── apply / undo lightweight for check-testing ───────────────────────────────

/**
 * Apply a pseudo-legal action to board for legality testing.
 * Returns a function that undoes the change.
 */
function applyTemp(board, action) {
  const undos = [];

  function setCell(r, c, val) {
    const prev = board[r][c];
    board[r][c] = val;
    undos.push(() => { board[r][c] = prev; });
  }

  const [sr, sc] = sqToRC(action.source);
  const [tr, tc] = sqToRC(action.targets[0]);

  const movingPiece = board[sr][sc];

  if (action.kind === 'castle') {
    // Move king
    setCell(sr, sc, null);
    setCell(tr, tc, movingPiece);
    // Move rook
    const [rr, rc2] = sqToRC(action.payload.rookFrom);
    const [rtr, rtc] = sqToRC(action.payload.rookTo);
    const rookPiece = board[rr][rc2];
    setCell(rr, rc2, null);
    setCell(rtr, rtc, rookPiece);
  } else if (action.kind === 'en_passant') {
    const [cr, cc] = sqToRC(action.payload.captured);
    setCell(sr, sc, null);
    setCell(tr, tc, movingPiece);
    setCell(cr, cc, null); // remove captured pawn
  } else {
    // Normal move (includes promotion)
    const promotion = action.payload?.promotion;
    setCell(sr, sc, null);
    if (promotion) {
      // Place promoted piece (same owner, new type)
      const promoted = { ...movingPiece, type: promotion };
      setCell(tr, tc, promoted);
    } else {
      setCell(tr, tc, movingPiece);
    }
  }

  return () => { for (let i = undos.length - 1; i >= 0; i--) undos[i](); };
}

// ─── castling generation ──────────────────────────────────────────────────────

function castlingActions(board, owner, castling) {
  const actions = [];
  const isPlayer = owner === 'player';

  // Determine which castling rights apply and the squares involved
  const rank = isPlayer ? '1' : '8';
  const kingSq = 'e' + rank;
  const kingPiece = get(board, kingSq);
  if (!kingPiece || kingPiece.type !== 'king' || kingPiece.owner !== owner) return actions;

  // Must not be in check
  if (isAttackedBy(board, kingSq, isPlayer ? 'enemy' : 'player')) return actions;

  const sides = isPlayer
    ? [
        { right: castling.wK, kingTo: 'g' + rank, rookFrom: 'h' + rank, rookTo: 'f' + rank, passSq: 'f' + rank },
        { right: castling.wQ, kingTo: 'c' + rank, rookFrom: 'a' + rank, rookTo: 'd' + rank, passSq: 'd' + rank, extraClear: 'b' + rank },
      ]
    : [
        { right: castling.bK, kingTo: 'g' + rank, rookFrom: 'h' + rank, rookTo: 'f' + rank, passSq: 'f' + rank },
        { right: castling.bQ, kingTo: 'c' + rank, rookFrom: 'a' + rank, rookTo: 'd' + rank, passSq: 'd' + rank, extraClear: 'b' + rank },
      ];

  const attackerOwner = isPlayer ? 'enemy' : 'player';

  for (const side of sides) {
    if (!side.right) continue;
    const rookPiece = get(board, side.rookFrom);
    if (!rookPiece || rookPiece.type !== 'rook' || rookPiece.owner !== owner) continue;

    // Path between king and rook must be clear
    const [kr, kc] = sqToRC(kingSq);
    const [rr, rc] = sqToRC(side.rookFrom);
    if (!clearPath(board, kr, kc, rr, rc)) continue;

    // Extra clear square for queenside (b-file must also be empty)
    if (side.extraClear && get(board, side.extraClear)) continue;

    // King must not pass through or land on attacked square
    if (isAttackedBy(board, side.passSq, attackerOwner)) continue;
    if (isAttackedBy(board, side.kingTo, attackerOwner)) continue;

    actions.push({
      kind: 'castle',
      source: kingSq,
      targets: [side.kingTo],
      piece: kingPiece,
      payload: { rookFrom: side.rookFrom, rookTo: side.rookTo },
    });
  }
  return actions;
}

// ─── main entry ───────────────────────────────────────────────────────────────

/**
 * Generate all legal actions for `owner` from `state`.
 * state: { board, tiles, turn, enPassant, castling }
 *
 * Filters out actions that leave the moving side's king in check.
 */
export function generateLegalActions(state, owner) {
  const { board, enPassant, castling } = state;
  const ctx = { enPassant, castling, owner };
  const legal = [];

  // Collect pseudo-legal actions from all pieces
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.owner !== owner) continue;
      const sq = rcToSq(r, c);

      const def = PIECE_DEFS[piece.type];
      if (!def) continue;

      const pseudoMoves = def.generateMoves(board, sq, piece, ctx);

      for (const mv of pseudoMoves) {
        let action;
        if (mv.enPassantCapture) {
          action = {
            kind: 'en_passant',
            source: sq,
            targets: [mv.sq],
            piece,
            payload: { captured: mv.enPassantCapture },
          };
        } else if (mv.promotion) {
          action = {
            kind: 'move',
            source: sq,
            targets: [mv.sq],
            piece,
            ...(mv.capture ? { capture: mv.capture } : {}),
            payload: { promotion: mv.promotion },
          };
        } else {
          action = {
            kind: 'move',
            source: sq,
            targets: [mv.sq],
            piece,
            ...(mv.capture ? { capture: mv.capture } : {}),
          };
        }

        // Check legality: does this action leave our king in check?
        const undo = applyTemp(board, action);
        const kingSq = findKingSq(board, owner);
        const attackerOwner = owner === 'player' ? 'enemy' : 'player';
        const inCheck = kingSq ? isAttackedBy(board, kingSq, attackerOwner) : false;
        undo();

        if (!inCheck) legal.push(action);
      }
    }
  }

  // Castling (handled separately — needs attack detection on pass-through squares)
  if (castling) {
    const castles = castlingActions(board, owner, castling);
    // Castling actions are already filtered for king safety in castlingActions()
    legal.push(...castles);
  }

  console.log('[engine2/movegen] owner=%s actions=%d', owner, legal.length);
  return legal;
}

// ─── applyMove ────────────────────────────────────────────────────────────────

/**
 * Apply an action to state via resolveAction (P2 undo-log path).
 * This is the canonical way to mutate state from outside the engine.
 *
 * @param {object} state  - GameState (board, tiles, ...)
 * @param {object} action - Legal action from generateLegalActions
 * @returns {{ ok: true, log: Array }}
 */
export function applyMove(state, action) {
  const log = [];
  resolveAction(state, action, log);
  console.log('[engine2/movegen] applyMove kind=%s src=%s dst=%s', action.kind, action.source, action.targets[0]);
  return { ok: true, log };
}
