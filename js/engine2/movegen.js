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

// ─── void-tile helpers ────────────────────────────────────────────────────────

/**
 * Return true if the tile at sq is a void tile (no piece may land there).
 * @param {Array[]} tiles  state.tiles
 * @param {string}  sq     algebraic square
 */
function _isVoid(tiles, sq) {
  if (!tiles) return false;
  const [r, c] = sqToRC(sq);
  const tile = tiles[r]?.[c];
  return tile && tile.type === 'void';
}

/**
 * Return true if any tile strictly between src and dest is void.
 * Used to detect sliding movement blocked by a void tile along the path.
 * Returns false for knight hops (non-linear) and single-step moves (no intermediate).
 *
 * @param {Array[]} tiles
 * @param {string}  src   source square
 * @param {string}  dest  destination square
 */
function _voidOnPath(tiles, src, dest) {
  if (!tiles) return false;
  const [sr, sc] = sqToRC(src);
  const [dr, dc] = sqToRC(dest);
  const dR = Math.abs(dr - sr);
  const dC = Math.abs(dc - sc);

  // Knight hop: non-linear, no intermediate squares
  if ((dR === 2 && dC === 1) || (dR === 1 && dC === 2)) return false;

  // Single step or same square: no intermediate
  if (dR <= 1 && dC <= 1) return false;

  // Sliding move (rook/bishop/queen/long king-range): check intermediate squares
  const stepR = Math.sign(dr - sr);
  const stepC = Math.sign(dc - sc);
  let r = sr + stepR, c = sc + stepC;
  while (r !== dr || c !== dc) {
    if (_isVoid(tiles, rcToSq(r, c))) return true;
    r += stepR; c += stepC;
  }
  return false;
}

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

/** True if path between (fromR,fromC) and (toR,toC) is clear (exclusive of endpoints).
 *  Ghost pieces do not block sliding paths.
 */
function clearPath(board, fromR, fromC, toR, toC) {
  const stepR = Math.sign(toR - fromR), stepC = Math.sign(toC - fromC);
  let r = fromR + stepR, c = fromC + stepC;
  while (r !== toR || c !== toC) {
    const occupant = board[r][c];
    if (occupant && !occupant.tags?.has('ghost')) return false;
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

// ─── canCapture ───────────────────────────────────────────────────────────────

/**
 * Returns false if target has 'uncapturable' tag or same owner as attacker.
 * Consult before adding a capture action.
 * @param {object} attacker - Piece
 * @param {object} target   - Piece
 * @returns {boolean}
 */
export function canCapture(attacker, target) {
  if (!target) return false;
  if (target.owner === attacker.owner) return false;
  if (target.tags?.has('uncapturable')) {
    console.log('[engine2/movegen] canCapture=false uncapturable id=%s type=%s', target.id, target.type);
    return false;
  }
  return true;
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
 * King-capture win condition: kings MAY move into check / danger squares.
 * No self-check filtering (unlike standard chess).
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

      // P5: frozen/stunned pieces cannot act (they can still be captured by opponents)
      if (piece.tags?.has('frozen') || piece.tags?.has('stunned')) {
        console.log('[engine2/movegen] skip frozen/stunned piece type=%s sq=%s', piece.type, rcToSq(r, c));
        continue;
      }

      const sq = rcToSq(r, c);

      const def = PIECE_DEFS[piece.type];
      if (!def) continue;

      const pseudoMoves = def.generateMoves(board, sq, piece, ctx);

      // Power tags: generate extra moves using alternative piece movement
      const powerTags = ['knight_power', 'bishop_power', 'rook_power', 'queen_power', 'king_power'];
      for (const tag of powerTags) {
        if (piece.tags?.has(tag)) {
          const powerType = tag.replace('_power', '');
          const powerDef = PIECE_DEFS[powerType];
          if (powerDef) {
            const powerMoves = powerDef.generateMoves(board, sq, piece, ctx);
            for (const mv of powerMoves) {
              pseudoMoves.push({ ...mv, isPowerMove: true });
            }
          }
        }
      }

      for (const mv of pseudoMoves) {
        // P8: skip destinations that are void tiles
        if (_isVoid(state.tiles, mv.sq)) {
          console.log('[engine2/movegen] skip void dest sq=%s', mv.sq);
          continue;
        }
        // P8: skip moves whose path passes through a void tile (sliding pieces)
        if (_voidOnPath(state.tiles, sq, mv.sq)) {
          console.log('[engine2/movegen] skip void path src=%s dst=%s', sq, mv.sq);
          continue;
        }

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
            ...(mv.isPowerMove ? { isPowerMove: true } : {}),
          };
        }

        legal.push(action);
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
