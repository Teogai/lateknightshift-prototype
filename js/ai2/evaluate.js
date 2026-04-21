/**
 * ai2/evaluate.js
 * Static evaluation of a GameState from the enemy's perspective.
 * Positive score = good for enemy. No chess.js dependency.
 *
 * Material values: king=900, queen=9, rook=5, bishop=3, knight=3, pawn=1
 * Tags:
 *   shielded  → piece worth +SHIELD_BONUS to owner (harder to remove)
 *   wounded   → piece worth -WOUNDED_PENALTY to owner (already debuffed)
 */

// ─── constants ────────────────────────────────────────────────────────────────

export const PIECE_VALUES = {
  king: 900,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

const SHIELD_BONUS   = 2;  // shielded tag: piece harder to capture
const WOUNDED_PENALTY = 1; // wounded tag: piece already debuffed, less scary

// ─── helpers ─────────────────────────────────────────────────────────────────

function pieceValue(piece) {
  const base = PIECE_VALUES[piece.type] ?? 0;
  let v = base;
  if (piece.tags?.has('shielded')) v += SHIELD_BONUS;
  if (piece.tags?.has('wounded'))  v -= WOUNDED_PENALTY;
  return Math.max(0, v);
}

function findKingSq(board, owner) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.owner === owner) {
        return [r, c];
      }
    }
  }
  return null;
}

// ─── eval components ─────────────────────────────────────────────────────────

/**
 * Material score from enemy's perspective.
 * enemy pieces contribute positively, player pieces negatively.
 */
function materialScore(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = pieceValue(p);
      score += p.owner === 'enemy' ? v : -v;
    }
  }
  return score;
}

/**
 * Pawn advance score for enemy pawns.
 * Pawns advance downward (increasing row index, enemy starts at row 1).
 * r^2 scoring mirrors old ai.js: rewards already-advanced pawns more.
 * Enemy pawn at row r (0=rank8, 7=rank1): advancing means going toward row 7.
 * Use (r-1)^2 so pawns at start rank (row=1) score 0, row=7 scores 36.
 */
function pawnAdvanceScore(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== 'enemy') continue;
      if (p.type === 'pawn') {
        // Row 1 = starting rank for enemy; row 7 = promotion rank.
        // advance = distance from starting rank
        const advance = r - 1; // 0 at start, 6 at promo
        score += advance * advance;
      } else if (p.type === 'queen') {
        // Promoted queen keeps pawn advance credit (mirrors ai.js: 49)
        score += 25;
      }
    }
  }
  return score;
}

/**
 * King safety: penalise squares adjacent to enemy king that are attacked by player.
 * Returns negative score for each player attacker on enemy king square.
 */
function kingSafetyScore(board) {
  const kingSq = findKingSq(board, 'enemy');
  if (!kingSq) return 0;
  const [kr, kc] = kingSq;

  let attackers = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== 'player') continue;
      if (attacksPseudo(board, r, c, p, kr, kc)) attackers++;
    }
  }
  return -attackers;
}

/**
 * Mobility: count legal-looking moves for enemy (pseudo-legal; excludes king wandering).
 * Higher mobility = more options = better.
 */
function mobilityScore(board) {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== 'enemy' || p.type === 'king') continue;
      // Count non-blocked moves (rough heuristic: no full movegen needed here)
      count += countPseudoMoves(board, r, c, p);
    }
  }
  return count;
}

/**
 * Aggression: enemy pieces attacking/near player king.
 */
function aggressionScore(board) {
  const kingSq = findKingSq(board, 'player');
  if (!kingSq) return 0;
  const [kr, kc] = kingSq;

  const PROX_WEIGHT = { king: 0, queen: 4, rook: 3, bishop: 2, knight: 2, pawn: 1 };
  let attackers = 0;
  let tropism = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== 'enemy') continue;
      if (attacksPseudo(board, r, c, p, kr, kc)) attackers++;
      const dist = Math.max(Math.abs(r - kr), Math.abs(c - kc));
      tropism += (PROX_WEIGHT[p.type] ?? 0) * (7 - dist);
    }
  }
  return attackers * 10 + tropism;
}

// ─── pseudo-legal attack geometry (mirrors movegen.js inline) ─────────────────

function clearPathBoard(board, fromR, fromC, toR, toC) {
  const stepR = Math.sign(toR - fromR), stepC = Math.sign(toC - fromC);
  let r = fromR + stepR, c = fromC + stepC;
  while (r !== toR || c !== toC) {
    if (board[r][c]) return false;
    r += stepR; c += stepC;
  }
  return true;
}

function attacksPseudo(board, fromR, fromC, piece, toR, toC) {
  const dr = toR - fromR, dc = toC - fromC;
  switch (piece.type) {
    case 'pawn': {
      const fwd = piece.owner === 'player' ? -1 : 1;
      return dr === fwd && Math.abs(dc) === 1;
    }
    case 'knight':
      return (Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
             (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    case 'bishop':
      return Math.abs(dr) === Math.abs(dc) && dr !== 0 &&
             clearPathBoard(board, fromR, fromC, toR, toC);
    case 'rook':
      return (dr === 0 || dc === 0) && !(dr === 0 && dc === 0) &&
             clearPathBoard(board, fromR, fromC, toR, toC);
    case 'queen':
      return ((dr === 0 || dc === 0) || Math.abs(dr) === Math.abs(dc)) &&
             !(dr === 0 && dc === 0) &&
             clearPathBoard(board, fromR, fromC, toR, toC);
    case 'king':
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && (dr !== 0 || dc !== 0);
    default:
      return false;
  }
}

function countPseudoMoves(board, fromR, fromC, piece) {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === fromR && c === fromC) continue;
      const occupant = board[r][c];
      if (occupant && occupant.owner === piece.owner) continue;
      if (attacksPseudo(board, fromR, fromC, piece, r, c)) count++;
    }
  }
  return count;
}

// ─── damage-tile penalty ─────────────────────────────────────────────────────

/**
 * Penalise enemy pieces on damage tiles (they get wounded).
 * Each enemy piece on a damage tile costs -WOUNDED_PENALTY.
 */
function damageTilePenalty(board, tiles) {
  if (!tiles) return 0;
  let penalty = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== 'enemy') continue;
      const tile = tiles[r]?.[c];
      if (tile?.type === 'damage') penalty -= WOUNDED_PENALTY;
    }
  }
  return penalty;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate a state from enemy's perspective.
 * Positive = good for enemy.
 *
 * @param {object} state   - { board, tiles }
 * @param {object} personality - weight overrides (optional)
 * @returns {number}
 */
export function evaluate(state, personality = {}) {
  const w = (key, def) => personality[key] ?? def;

  const board = state.board;
  const tiles  = state.tiles;

  const score =
    w('material',    1.0) * materialScore(board) +
    w('pawnAdvance', 0.0) * pawnAdvanceScore(board) +
    w('kingSafety',  0.5) * kingSafetyScore(board) +
    w('mobility',    0.1) * mobilityScore(board) +
    w('aggression',  0.5) * aggressionScore(board) +
    damageTilePenalty(board, tiles);

  console.log('[ai2/eval] mat=%d pawnadv=%d kingSafe=%d mob=%d agg=%d total=%d',
    materialScore(board),
    pawnAdvanceScore(board),
    kingSafetyScore(board),
    mobilityScore(board),
    aggressionScore(board),
    score
  );

  return score;
}

export { pieceValue };
