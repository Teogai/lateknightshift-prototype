// Single source of truth for enemy definitions.
// To add a new enemy: add one entry here with pieces + personality.
// Optional createAI(): returns a stateful AI with takeTurn(chess, personality, ep)
//   → { moves: [{from,to}], warnNext: boolean }

import { selectMoveIterative } from './ai.js';
import { pseudoLegalMovesFor, allGeometricMovesFor, savePieces, restorePieces } from './engine/board.js';

function defaultAI() {
  return {
    takeTurn(chess, personality, enPassantTarget, positionHistory = []) {
      let moves = pseudoLegalMovesFor(chess, 'b', enPassantTarget);
      if (!moves.length) moves = allGeometricMovesFor(chess, 'b');
      if (!moves.length) return { moves: [], warnNext: false };
      const chosen = selectMoveIterative(chess, moves, personality, {
        maxDepth: 6, timeBudgetMs: 200, enPassantTarget, positionHistory,
      });
      return { moves: chosen ? [chosen] : [], warnNext: false };
    },
  };
}

function doubleMoveAI() {
  let doubleMovePending = false;
  return {
    takeTurn(chess, personality, enPassantTarget, positionHistory = []) {
      if (doubleMovePending) {
        doubleMovePending = false;
        // Select first move
        let moves = pseudoLegalMovesFor(chess, 'b', enPassantTarget);
        if (!moves.length) moves = allGeometricMovesFor(chess, 'b');
        if (!moves.length) return { moves: [], warnNext: false };
        const first = selectMoveIterative(chess, moves, personality, {
          maxDepth: 6, timeBudgetMs: 200, enPassantTarget, positionHistory,
        });
        if (!first) return { moves: [], warnNext: false };

        // Temporarily apply first move to pick second from updated board
        const saved = savePieces(chess);
        const movingPiece = chess.get(first.from);
        chess.remove(first.from);
        chess.remove(first.to);
        if (movingPiece) chess.put(movingPiece, first.to);

        // Include the just-played position so the second move also avoids it.
        const extendedHistory = [...positionHistory, chess.fen().split(' ')[0]];

        let moves2 = pseudoLegalMovesFor(chess, 'b', null);
        if (!moves2.length) moves2 = allGeometricMovesFor(chess, 'b');
        const second = moves2.length
          ? selectMoveIterative(chess, moves2, personality, {
              maxDepth: 6, timeBudgetMs: 200, enPassantTarget: null, positionHistory: extendedHistory,
            })
          : null;

        restorePieces(chess, saved);
        return { moves: second ? [first, second] : [first], warnNext: false };
      } else {
        doubleMovePending = true;
        let moves = pseudoLegalMovesFor(chess, 'b', enPassantTarget);
        if (!moves.length) moves = allGeometricMovesFor(chess, 'b');
        if (!moves.length) return { moves: [], warnNext: true };
        const chosen = selectMoveIterative(chess, moves, personality, {
          maxDepth: 6, timeBudgetMs: 200, enPassantTarget, positionHistory,
        });
        return { moves: chosen ? [chosen] : [], warnNext: true };
      }
    },
  };
}

export const ENEMIES = {
  pawn_pusher: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'g7' },
    ],
    personality: { material: 1.0, pawn_advance: 2.0, king_safety: 0.8, mobility: 0.1, aggression: 0.5 },
    createAI: defaultAI,
  },
  knight_rider: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'n', color: 'b', sq: 'b8' },
      { type: 'n', color: 'b', sq: 'g8' },
      { type: 'p', color: 'b', sq: 'b7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'g7' },
    ],
    personality: { material: 1.0, king_safety: 0.6, mobility: 2.0, pawn_advance: 0.2, aggression: 1.2 },
    createAI: defaultAI,
  },
  bishop_pair: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'b', color: 'b', sq: 'c8' },
      { type: 'b', color: 'b', sq: 'f8' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'f7' },
    ],
    personality: { material: 1.2, king_safety: 0.9, mobility: 1.5, aggression: 1.0 },
    createAI: defaultAI,
  },
  // Floor 8 — king pushed to 7th rank, flanking knights
  phalanx: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e7' },
      { type: 'b', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'f7' },
      { type: 'n', color: 'b', sq: 'c6' },
      { type: 'n', color: 'b', sq: 'f6' },
      { type: 'p', color: 'b', sq: 'd6' },
      { type: 'p', color: 'b', sq: 'e6' },
    ],
    personality: { material: 1.0, king_safety: 0.5, mobility: 1.5, aggression: 1.2 },
    createAI: defaultAI,
  },
  // Floor 9 — rook+bishop back rank with advanced knight pawn
  iron_line: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'r', color: 'b', sq: 'a8' },
      { type: 'b', color: 'b', sq: 'f8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'b7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'f7' },
      { type: 'n', color: 'b', sq: 'c6' },
      { type: 'p', color: 'b', sq: 'c5' },
    ],
    personality: { material: 1.5, king_safety: 1.0, mobility: 1.0, aggression: 1.5 },
    createAI: defaultAI,
  },
  // Floor 10 — 4 knights + full pawn rank
  cavalry_charge: {
    pieces: [
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'n', color: 'b', sq: 'b8' },
      { type: 'n', color: 'b', sq: 'c8' },
      { type: 'n', color: 'b', sq: 'f8' },
      { type: 'n', color: 'b', sq: 'g8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'b7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'f7' },
      { type: 'p', color: 'b', sq: 'g7' },
      { type: 'p', color: 'b', sq: 'h7' },
    ],
    personality: { material: 1.0, king_safety: 0.5, mobility: 2.5, aggression: 1.5 },
    createAI: defaultAI,
  },
  // Floor 13 — offset king, heavy mixed army
  high_command: {
    pieces: [
      { type: 'k', color: 'b', sq: 'g8' },
      { type: 'b', color: 'b', sq: 'c8' },
      { type: 'r', color: 'b', sq: 'f8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'b7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'f7' },
      { type: 'p', color: 'b', sq: 'g7' },
      { type: 'p', color: 'b', sq: 'h7' },
      { type: 'n', color: 'b', sq: 'c6' },
      { type: 'n', color: 'b', sq: 'f6' },
      { type: 'p', color: 'b', sq: 'e6' },
      { type: 'p', color: 'b', sq: 'd5' },
    ],
    personality: { material: 1.3, king_safety: 0.8, mobility: 1.2, aggression: 1.4 },
    createAI: defaultAI,
  },
  duelist: {
    // FEN rows: 2bnkb2/2pppp2
    pieces: [
      { type: 'b', color: 'b', sq: 'c8' },
      { type: 'n', color: 'b', sq: 'd8' },
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'b', color: 'b', sq: 'f8' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'f7' },
    ],
    personality: { material: 1.2, king_safety: 0.8, mobility: 1.5, aggression: 1.2 },
    createAI: doubleMoveAI,
  },
  // Floor 12 — duelist with rook + queen added, doubleMoveAI
  duelist_2: {
    pieces: [
      { type: 'r', color: 'b', sq: 'a8' },
      { type: 'q', color: 'b', sq: 'b8' },
      { type: 'b', color: 'b', sq: 'c8' },
      { type: 'n', color: 'b', sq: 'd8' },
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'b', color: 'b', sq: 'f8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'f7' },
      { type: 'p', color: 'b', sq: 'g7' },
    ],
    personality: { material: 1.5, king_safety: 1.0, mobility: 1.5, aggression: 1.5 },
    createAI: doubleMoveAI,
  },
  boss_duelist: {
    // Full 16-piece standard chess starting position (black side)
    pieces: [
      { type: 'r', color: 'b', sq: 'a8' },
      { type: 'n', color: 'b', sq: 'b8' },
      { type: 'b', color: 'b', sq: 'c8' },
      { type: 'q', color: 'b', sq: 'd8' },
      { type: 'k', color: 'b', sq: 'e8' },
      { type: 'b', color: 'b', sq: 'f8' },
      { type: 'n', color: 'b', sq: 'g8' },
      { type: 'r', color: 'b', sq: 'h8' },
      { type: 'p', color: 'b', sq: 'a7' },
      { type: 'p', color: 'b', sq: 'b7' },
      { type: 'p', color: 'b', sq: 'c7' },
      { type: 'p', color: 'b', sq: 'd7' },
      { type: 'p', color: 'b', sq: 'e7' },
      { type: 'p', color: 'b', sq: 'f7' },
      { type: 'p', color: 'b', sq: 'g7' },
      { type: 'p', color: 'b', sq: 'h7' },
    ],
    personality: { material: 1.5, king_safety: 1.2, mobility: 1.0, pawn_advance: 0.8, aggression: 1.5 },
    createAI: doubleMoveAI,
  },
};

export const VALID_ENEMIES = new Set(Object.keys(ENEMIES));

// Regular enemies pool (used as fallback if node has no enemyKey)
export const REGULAR_ENEMIES = ['pawn_pusher', 'knight_rider', 'bishop_pair'];
// Elite enemies
export const ELITE_ENEMY = 'duelist';
export const ELITE_2_ENEMY = 'duelist_2';
// Boss enemy
export const BOSS_ENEMY = 'boss_duelist';
