// Minimax search engine for enemy AI.
// Self-contained — only depends on a chess.js Chess instance.

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
const FILES = 'abcdefgh';

// --- Personality constants (weights on eval components) ---

export const PAWN_PUSHER = {
  material:     1.0,
  pawn_advance: 2.0,
  king_safety:  0.8,
  mobility:     0.1,
};

// Future personalities (not yet active):
// LONE_ROOK:    { material: 1.5, king_safety: 1.0, mobility: 1.2 }
// KNIGHT_RIDER: { material: 1.0, king_safety: 0.6, mobility: 2.0, pawn_advance: 0.2 }
// BISHOP_PAIR:  { material: 1.2, king_safety: 0.9, mobility: 1.5 }
// DUELIST:      { material: 0.8, mobility: 2.5, aggression: 2.0 }
// CASTELLAN:    { material: 1.0, king_safety: 2.0, castle_urgency: 3.0 }

// --- Geometry helpers ---

function _clearPath(chess, ff, fr, tf, tr) {
  const steps = Math.max(Math.abs(tf - ff), Math.abs(tr - fr));
  const sf = Math.sign(tf - ff), sr = Math.sign(tr - fr);
  for (let i = 1; i < steps; i++) {
    if (chess.get(FILES[ff + sf * i] + (fr + sr * i + 1))) return false;
  }
  return true;
}

function _pieceAttacks(chess, fromSq, type, color, toSq) {
  const ff = fromSq.charCodeAt(0) - 97;
  const fr = parseInt(fromSq[1]) - 1;
  const tf = toSq.charCodeAt(0) - 97;
  const tr = parseInt(toSq[1]) - 1;
  const df = tf - ff, dr = tr - fr;
  switch (type) {
    case 'n': return (Math.abs(df) === 2 && Math.abs(dr) === 1) || (Math.abs(df) === 1 && Math.abs(dr) === 2);
    case 'k': return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
    case 'p': { const fwd = color === 'w' ? 1 : -1; return dr === fwd && Math.abs(df) === 1; }
    case 'r': return (df === 0 || dr === 0) && _clearPath(chess, ff, fr, tf, tr);
    case 'b': return Math.abs(df) === Math.abs(dr) && _clearPath(chess, ff, fr, tf, tr);
    case 'q': return (df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) && _clearPath(chess, ff, fr, tf, tr);
    default: return false;
  }
}

// --- Move generation ---

// Returns [{from, to}] for color. Captures first (better alpha-beta pruning).
export function generateMoves(chess, color, enPassantTarget = null) {
  const captures = [], quiets = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece || piece.color !== color) continue;
      const from = FILES[f] + (8 - r);
      const rank = 8 - r;

      // Pawn push (non-capture, quiet only)
      if (piece.type === 'p') {
        const nextRank = color === 'w' ? rank + 1 : rank - 1;
        if (nextRank >= 1 && nextRank <= 8) {
          const step1 = FILES[f] + nextRank;
          if (!chess.get(step1)) {
            quiets.push({ from, to: step1 });
            const startRank = color === 'w' ? 2 : 7;
            if (rank === startRank) {
              const step2Rank = color === 'w' ? rank + 2 : rank - 2;
              if (!chess.get(FILES[f] + step2Rank))
                quiets.push({ from, to: FILES[f] + step2Rank });
            }
          }
        }
      }

      // All attack-pattern moves (captures + non-capture for non-pawns)
      for (let tr = 0; tr < 8; tr++) {
        for (let tf = 0; tf < 8; tf++) {
          if (r === tr && f === tf) continue;
          const target = board[tr][tf];
          if (target?.color === color) continue;
          const to = FILES[tf] + (8 - tr);
          if (!_pieceAttacks(chess, from, piece.type, color, to)) continue;
          // Pawn diagonal is only valid as capture
          if (piece.type === 'p') {
            if (target && target.color !== color) captures.push({ from, to });
          } else {
            if (target) captures.push({ from, to });
            else quiets.push({ from, to });
          }
        }
      }
    }
  }
  if (enPassantTarget) {
    const epFile = enPassantTarget.charCodeAt(0) - 97;
    const epRank = parseInt(enPassantTarget[1]) - 1;
    const fwd = color === 'w' ? 1 : -1;
    const fromRank = epRank - fwd;
    for (const df of [-1, 1]) {
      const fromFile = epFile + df;
      if (fromFile < 0 || fromFile > 7) continue;
      const fromSq = FILES[fromFile] + (fromRank + 1);
      const piece = chess.get(fromSq);
      if (piece?.type === 'p' && piece.color === color) {
        captures.push({ from: fromSq, to: enPassantTarget, enPassant: true });
      }
    }
  }
  return [...captures, ...quiets];
}

// --- Make / unmake (no cloning, in-place for search tree) ---

export function makeMove(chess, move) {
  const movingPiece = chess.get(move.from);
  const capturedPiece = chess.get(move.to) || null;
  chess.remove(move.from);
  chess.remove(move.to);
  chess.put(movingPiece, move.to);

  let epCapturedSq = null;
  if (move.enPassant) {
    epCapturedSq = move.to[0] + move.from[1];
    chess.remove(epCapturedSq);
  }

  const fromRank = parseInt(move.from[1]);
  const toRank = parseInt(move.to[1]);
  const newEnPassantTarget =
    movingPiece.type === 'p' && Math.abs(toRank - fromRank) === 2
      ? move.from[0] + String((fromRank + toRank) / 2)
      : null;

  return { movingPiece, capturedPiece, epCapturedSq, newEnPassantTarget };
}

export function unmakeMove(chess, move, saved) {
  chess.remove(move.to);
  chess.put(saved.movingPiece, move.from);
  if (saved.capturedPiece) chess.put(saved.capturedPiece, move.to);
  if (saved.epCapturedSq) {
    const epColor = saved.movingPiece.color === 'w' ? 'b' : 'w';
    chess.put({ type: 'p', color: epColor }, saved.epCapturedSq);
  }
}

// --- Evaluation (score from black's perspective; positive = good for enemy) ---

function materialScore(chess) {
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const p of row) {
      if (!p) continue;
      const v = PIECE_VALUES[p.type] ?? 0;
      score += p.color === 'b' ? v : -v;
    }
  }
  return score;
}

function pawnAdvanceScore(chess) {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      if (board[r][f]?.type === 'p' && board[r][f]?.color === 'b') {
        // r=0 is rank 8 (black back rank), r=7 is rank 1 (promotion).
        // r*r rewards advancing an already-advanced pawn more than a backward one.
        score += r * r;
      }
    }
  }
  return score;
}

function kingSafetyScore(chess) {
  // Find black king
  let kingSq = null;
  const board = chess.board();
  outer: for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      if (board[r][f]?.type === 'k' && board[r][f]?.color === 'b') {
        kingSq = FILES[f] + (8 - r);
        break outer;
      }
    }
  }
  if (!kingSq) return 0;
  // Count white pieces attacking the black king square
  let attackers = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p || p.color !== 'w') continue;
      const sq = FILES[f] + (8 - r);
      if (_pieceAttacks(chess, sq, p.type, p.color, kingSq)) attackers++;
    }
  }
  return -attackers;
}

function mobilityScore(chess) {
  return generateMoves(chess, 'b').length;
}

function aggressionScore(_chess) { return 0; }
function castleUrgencyScore(_chess) { return 0; }

function evaluate(chess, personality) {
  const w = (key) => personality[key] ?? 0;
  return w('material')      * materialScore(chess)
       + w('pawn_advance')  * pawnAdvanceScore(chess)
       + w('king_safety')   * kingSafetyScore(chess)
       + w('mobility')      * mobilityScore(chess)
       + w('aggression')    * aggressionScore(chess)
       + w('castle_urgency') * castleUrgencyScore(chess);
}

// --- Adaptive depth ---

function countPieces(chess) {
  let count = 0;
  for (const row of chess.board()) for (const p of row) if (p) count++;
  return count;
}

function adaptiveDepth(chess, baseDepth) {
  const pieces = countPieces(chess);
  if (pieces <= 4) return baseDepth + 2;
  if (pieces <= 7) return baseDepth + 1;
  return baseDepth;
}

// --- Minimax with alpha-beta ---

function minimax(chess, depth, alpha, beta, maximizing, personality, enPassantTarget = null) {
  if (depth === 0) return evaluate(chess, personality);

  const color = maximizing ? 'b' : 'w';
  const moves = generateMoves(chess, color, enPassantTarget);

  if (!moves.length) return evaluate(chess, personality);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const saved = makeMove(chess, move);
      // King captured → immediate win
      if (!_findKing(chess, 'w')) {
        unmakeMove(chess, move, saved);
        return Infinity;
      }
      const score = minimax(chess, depth - 1, alpha, beta, false, personality, saved.newEnPassantTarget);
      unmakeMove(chess, move, saved);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const saved = makeMove(chess, move);
      // King captured → immediate loss
      if (!_findKing(chess, 'b')) {
        unmakeMove(chess, move, saved);
        return -Infinity;
      }
      const score = minimax(chess, depth - 1, alpha, beta, true, personality, saved.newEnPassantTarget);
      unmakeMove(chess, move, saved);
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function _findKing(chess, color) {
  const board = chess.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++)
      if (board[r][f]?.type === 'k' && board[r][f]?.color === color)
        return FILES[f] + (8 - r);
  return null;
}

// --- Public API ---

// Returns best {from, to} move for the enemy (black).
// Tie-break by immediate eval: when two moves give equal minimax scores, prefer
// the one whose post-move position already scores higher (achieve the goal now,
// not via a detour). Without this, "move king, then advance pawn" ties with
// "advance pawn now" and order-of-iteration picks arbitrarily.
export function selectMove(chess, moves, personality, depth, enPassantTarget = null) {
  const d = adaptiveDepth(chess, depth);
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let bestImmediate = -Infinity;

  for (const move of moves) {
    const saved = makeMove(chess, move);
    const immediate = evaluate(chess, personality);
    let score;
    if (!_findKing(chess, 'w')) {
      score = Infinity;
    } else {
      score = minimax(chess, d - 1, -Infinity, Infinity, false, personality, saved.newEnPassantTarget);
    }
    unmakeMove(chess, move, saved);
    if (score > bestScore || (score === bestScore && immediate > bestImmediate)) {
      bestScore = score;
      bestImmediate = immediate;
      bestMove = move;
    }
  }
  return bestMove;
}
