// Minimax search engine for enemy AI.
// Self-contained — only depends on a chess.js Chess instance.

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
const FILES = 'abcdefgh';

// --- Personality constants (weights on eval components) ---

// Personality objects live in js/enemies.js alongside piece layouts.

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

// Returns [{from, to}] for color.
// Order: captures first (better alpha-beta pruning), then non-king quiets,
// then king quiets last. King-last avoids zero-gradient king shuffling on ties.
export function generateMoves(chess, color, enPassantTarget = null) {
  const captures = [], quiets = [], kingQuiets = [];
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
            else if (piece.type === 'k') kingQuiets.push({ from, to });
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
  return [...captures, ...quiets, ...kingQuiets];
}

// --- Make / unmake (no cloning, in-place for search tree) ---

export function makeMove(chess, move) {
  const movingPiece = chess.get(move.from);
  const capturedPiece = chess.get(move.to) || null;
  chess.remove(move.from);
  chess.remove(move.to);

  // Auto-promote pawns that reach the last rank. Search generates the pawn's
  // one-square push with no promotion flag, so we detect it here. Queen is the
  // best promotion in the overwhelming majority of positions; under-promotion
  // is not worth the branching cost in this search.
  const isPromotion = movingPiece.type === 'p' &&
    ((movingPiece.color === 'w' && move.to[1] === '8') ||
     (movingPiece.color === 'b' && move.to[1] === '1'));
  const placedPiece = isPromotion ? { type: 'q', color: movingPiece.color } : movingPiece;
  chess.put(placedPiece, move.to);

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
      const p = board[r][f];
      if (p?.color !== 'b') continue;
      if (p.type === 'p') {
        // r=0 is rank 8 (black back rank), r=7 is rank 1 (promotion).
        // r*r rewards advancing an already-advanced pawn more than a backward one.
        score += r * r;
      } else if (p.type === 'q') {
        // A promoted pawn reaches the maximum rank; keep its pawn_advance credit
        // after promotion so the pawn-push personality doesn't lose score by
        // promoting. Also applies uniformly to starting queens (a fixed bonus).
        score += 49;
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
  // Exclude king moves — king wandering shouldn't be rewarded as "activity"
  // (without this, the king oscillates on equal-mobility squares)
  const kingSq = _findKing(chess, 'b');
  return generateMoves(chess, 'b').filter(m => m.from !== kingSq).length;
}

function aggressionScore(chess) {
  const board = chess.board();
  const kingSq = _findKing(chess, 'w');
  if (!kingSq) return 0;
  const kf = kingSq.charCodeAt(0) - 97;
  const kr = parseInt(kingSq[1]) - 1;

  const PROXIMITY_WEIGHT = { q: 4, r: 3, b: 2, n: 2, p: 1, k: 0 };
  let attackers = 0;
  let tropism = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p || p.color !== 'b') continue;
      const sq = FILES[f] + (8 - r);
      if (_pieceAttacks(chess, sq, p.type, p.color, kingSq)) attackers++;
      // Chebyshev distance 0..7; closer = higher score
      const dist = Math.max(Math.abs(f - kf), Math.abs((7 - r) - kr));
      tropism += (PROXIMITY_WEIGHT[p.type] ?? 0) * (7 - dist);
    }
  }
  // Tropism pulls pieces toward the king when no attack is available;
  // direct attackers still dominate via the ×10 weight.
  return attackers * 10 + tropism * 1.0;
}
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
// Penalty applied at root to any move whose resulting position has been seen
// recently (passed via positionHistory). Beats quiet-position tie plateaus
// (tropism/mobility swings are single digits to ~50) but far below material
// (100–900) or king capture (~10000) — tactics still dominate.
const REPETITION_PENALTY = 75;

export function selectMove(chess, moves, personality, depth, enPassantTarget = null, positionHistory = []) {
  // Direct king capture is the shortest possible win — always pick it over any
  // deferred forced mate. Without this, both direct and deferred captures score
  // Infinity and tiebreak-by-immediate-eval can pick the longer path.
  for (const move of moves) {
    const target = chess.get(move.to);
    if (target?.type === 'k' && target.color === 'w') return move;
  }

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
    // Castling/EP are intentionally ignored — "same pieces on same squares" is the cycle we want to break.
    if (positionHistory.length && positionHistory.includes(chess.fen().split(' ')[0])) {
      score -= REPETITION_PENALTY;
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

// Iterative deepening with time budget. Runs fixed-depth search at depth 1,
// 2, ..., maxDepth, returning the best move from the deepest completed iteration.
// Stops once elapsed exceeds half the budget — the next iteration is ~10× more
// expensive so starting it would blow the budget. Always completes depth 1.
export function selectMoveIterative(chess, moves, personality, {
  maxDepth = 6,
  timeBudgetMs = 200,
  enPassantTarget = null,
  positionHistory = [],
} = {}) {
  const start = Date.now();
  let bestMove = moves[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    bestMove = selectMove(chess, moves, personality, depth, enPassantTarget, positionHistory);
    if (Date.now() - start > timeBudgetMs / 2) break;
  }
  return bestMove;
}
