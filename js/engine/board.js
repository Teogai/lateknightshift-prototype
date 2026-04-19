import { Chess } from 'chess.js';
import { FILES, PIECE_NAMES, CHARACTER_PIECES } from './constants.js';
import { ENEMIES } from '../enemies.js';

export function boardToDict(chess) {
  const result = {};
  const board = chess.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const sq = FILES[file] + (8 - rank);
        result[sq] = {
          type: PIECE_NAMES[piece.type],
          color: piece.color === 'w' ? 'white' : 'black',
        };
      }
    }
  }
  return result;
}

export function knightAttacks(sq) {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .map(([df, dr]) => [file + df, rank + dr])
    .filter(([f, r]) => f >= 0 && f < 8 && r >= 0 && r < 8)
    .map(([f, r]) => FILES[f] + (r + 1));
}

export function makeBoard(character, enemy = 'pawn_pusher') {
  const chess = new Chess();
  chess.clear();
  for (const { type, color, sq } of CHARACTER_PIECES[character]) {
    chess.put({ type, color }, sq);
  }
  for (const { type, color, sq } of ENEMIES[enemy].pieces) {
    chess.put({ type, color }, sq);
  }
  return chess;
}

export function savePieces(chess) {
  const saved = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p) saved.push({ sq: FILES[f] + (8 - r), piece: { type: p.type, color: p.color } });
    }
  }
  return saved;
}

export function restorePieces(chess, saved) {
  chess.clear();
  for (const { sq, piece } of saved) chess.put(piece, sq);
}

// Temporarily switches board turn to get moves for a square of a given color.
// chess.js only returns moves when it's that color's turn.
// Saves/restores via piece map (not FEN) to handle positions missing a king.
export function getMovesForSq(chess, sq, color, enPassantTarget) {
  const saved = savePieces(chess);
  try {
    const fen = chess.fen();
    const parts = fen.split(' ');
    parts[1] = color;
    parts[2] = '-';
    const ep = enPassantTarget;
    parts[3] = (ep && ((color === 'w' && ep[1] === '6') || (color === 'b' && ep[1] === '3'))) ? ep : '-';
    chess.load(parts.join(' '));
    return chess.moves({ square: sq, verbose: true });
  } catch {
    return [];
  } finally {
    restorePieces(chess, saved);
  }
}

export function findKing(chess, color) {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p?.type === 'k' && p?.color === color) return FILES[f] + (8 - r);
    }
  }
  return null;
}

export function clearPath(chess, ff, fr, tf, tr) {
  const steps = Math.max(Math.abs(tf - ff), Math.abs(tr - fr));
  const sf = Math.sign(tf - ff), sr = Math.sign(tr - fr);
  for (let i = 1; i < steps; i++) {
    if (chess.get(FILES[ff + sf * i] + (fr + sr * i + 1))) return false;
  }
  return true;
}

export function pieceAttacks(chess, fromSq, pieceType, pieceColor, toSq) {
  const ff = fromSq.charCodeAt(0) - 97;
  const fr = parseInt(fromSq[1]) - 1;
  const tf = toSq.charCodeAt(0) - 97;
  const tr = parseInt(toSq[1]) - 1;
  const df = tf - ff, dr = tr - fr;
  switch (pieceType) {
    case 'n': return (Math.abs(df) === 2 && Math.abs(dr) === 1) || (Math.abs(df) === 1 && Math.abs(dr) === 2);
    case 'k': return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
    case 'p': { const fwd = pieceColor === 'w' ? 1 : -1; return dr === fwd && Math.abs(df) === 1; }
    case 'r': return (df === 0 || dr === 0) && clearPath(chess, ff, fr, tf, tr);
    case 'b': return Math.abs(df) === Math.abs(dr) && clearPath(chess, ff, fr, tf, tr);
    case 'q': return (df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) && clearPath(chess, ff, fr, tf, tr);
    default: return false;
  }
}

export function findAttackersOf(chess, targetSq, attackingColor) {
  const attackers = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p || p.color !== attackingColor) continue;
      const sq = FILES[f] + (8 - r);
      if (pieceAttacks(chess, sq, p.type, p.color, targetSq)) attackers.push(sq);
    }
  }
  return attackers;
}

export function allGeometricMovesFor(chess, color) {
  const moves = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece || piece.color !== color) continue;
      const from = FILES[f] + (8 - r);
      const rank = 8 - r;
      if (piece.type === 'p') {
        const nextRank = color === 'w' ? rank + 1 : rank - 1;
        if (nextRank >= 1 && nextRank <= 8) {
          const step1 = FILES[f] + nextRank;
          if (!chess.get(step1)) {
            moves.push({ from, to: step1 });
            const startRank = color === 'w' ? 2 : 7;
            if (rank === startRank) {
              const step2Rank = color === 'w' ? rank + 2 : rank - 2;
              if (!chess.get(FILES[f] + step2Rank))
                moves.push({ from, to: FILES[f] + step2Rank });
            }
          }
        }
      }
      for (let tr = 0; tr < 8; tr++) {
        for (let tf = 0; tf < 8; tf++) {
          if (r === tr && f === tf) continue;
          const target = board[tr][tf];
          if (target?.color === color) continue;
          const to = FILES[tf] + (8 - tr);
          if (pieceAttacks(chess, from, piece.type, color, to)) {
            if (piece.type === 'p') {
              if (target && target.color !== color) moves.push({ from, to });
            } else {
              moves.push({ from, to });
            }
          }
        }
      }
    }
  }
  return moves;
}

// Returns 'player_won', 'enemy_won', or null.
export function checkKingCaptured(chess) {
  let whiteKing = false, blackKing = false;
  const board = chess.board();
  for (const row of board) {
    for (const piece of row) {
      if (piece?.type === 'k') {
        if (piece.color === 'w') whiteKing = true;
        else blackKing = true;
      }
    }
  }
  if (!blackKing) return 'player_won';
  if (!whiteKing) return 'enemy_won';
  return null;
}

export function checkInfo(chess) {
  const whiteKingSq = findKing(chess, 'w');
  if (!whiteKingSq) return { in_check: false, check_attacker_sq: null };
  const inCheck = chess.isAttacked(whiteKingSq, 'b');
  if (!inCheck) return { in_check: false, check_attacker_sq: null };
  const attackers = findAttackersOf(chess, whiteKingSq, 'b');
  return { in_check: true, check_attacker_sq: attackers[0] ?? null };
}

export function enemyCheckInfo(chess) {
  const blackKingSq = findKing(chess, 'b');
  if (!blackKingSq) return { enemy_in_check: false, enemy_check_attacker_sq: null };
  const inCheck = chess.isAttacked(blackKingSq, 'w');
  if (!inCheck) return { enemy_in_check: false, enemy_check_attacker_sq: null };
  const attackers = findAttackersOf(chess, blackKingSq, 'w');
  return { enemy_in_check: true, enemy_check_attacker_sq: attackers[0] ?? null };
}

export function executeKingCapture(chess, fromSq, toSq, piece) {
  chess.remove(fromSq);
  chess.remove(toSq);
  chess.put(piece, toSq);
}

export function pseudoLegalMovesFor(chess, color, enPassantTarget) {
  const moves = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece || piece.color !== color) continue;
      const sq = FILES[f] + (8 - r);
      moves.push(...getMovesForSq(chess, sq, color, enPassantTarget));
    }
  }
  const enemyColor = color === 'w' ? 'b' : 'w';
  const enemyKingSq = findKing(chess, enemyColor);
  if (enemyKingSq && chess.isAttacked(enemyKingSq, color)) {
    const attackers = findAttackersOf(chess, enemyKingSq, color);
    for (const attSq of attackers) {
      if (!moves.some(m => m.from === attSq && m.to === enemyKingSq)) {
        moves.push({ from: attSq, to: enemyKingSq });
      }
    }
  }
  return moves;
}
