import { test, expect } from 'vitest';
import { Chess } from 'chess.js';
import { selectMove, generateMoves } from '../js/ai.js';
import { GameState } from '../js/engine.js';
import { ENEMIES } from '../js/enemies.js';
const IRON_LINE    = ENEMIES.iron_line.personality;
const KNIGHT_RIDER = ENEMIES.knight_rider.personality;
const BISHOP_PAIR  = ENEMIES.bishop_pair.personality;

function emptyChess() {
  const c = new Chess();
  c.clear();
  return c;
}

// --- GameState construction ---

test('GameState accepts iron_line enemy without throwing', () => {
  expect(() => new GameState('knight', 'iron_line')).not.toThrow();
});

test('GameState accepts knight_rider enemy without throwing', () => {
  expect(() => new GameState('knight', 'knight_rider')).not.toThrow();
});

test('GameState accepts bishop_pair enemy without throwing', () => {
  expect(() => new GameState('knight', 'bishop_pair')).not.toThrow();
});

test('GameState rejects unknown enemy', () => {
  expect(() => new GameState('knight', 'bogus_enemy')).toThrow();
});

// --- Board setup ---

test('iron_line board has king and rook', () => {
  const gs = new GameState('knight', 'iron_line');
  const board = gs.toDict().board;
  const blackPieces = Object.values(board).filter(p => p.color === 'black');
  expect(blackPieces.some(p => p.type === 'king')).toBe(true);
  expect(blackPieces.some(p => p.type === 'rook')).toBe(true);
});

test('knight_rider board has king and two knights', () => {
  const gs = new GameState('knight', 'knight_rider');
  const board = gs.toDict().board;
  const blackPieces = Object.values(board).filter(p => p.color === 'black');
  expect(blackPieces.some(p => p.type === 'king')).toBe(true);
  expect(blackPieces.filter(p => p.type === 'knight').length).toBe(2);
});

test('bishop_pair board has king and two bishops', () => {
  const gs = new GameState('knight', 'bishop_pair');
  const board = gs.toDict().board;
  const blackPieces = Object.values(board).filter(p => p.color === 'black');
  expect(blackPieces.some(p => p.type === 'king')).toBe(true);
  expect(blackPieces.filter(p => p.type === 'bishop').length).toBe(2);
});

// --- Personality behaviour ---

// Iron Line: high material+aggression — should prefer capturing a queen over any idle move
test('IRON_LINE prefers rook capture of queen over idle move', () => {
  const chess = emptyChess();
  // King cornered with limited moves; rook has a clear queen capture
  chess.put({ type: 'k', color: 'b' }, 'h8');
  chess.put({ type: 'r', color: 'b' }, 'e4');
  chess.put({ type: 'k', color: 'w' }, 'a1');
  chess.put({ type: 'q', color: 'w' }, 'e2'); // rook slides e4→e2, capturing the queen (9 pts)

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, IRON_LINE, 2);
  expect(chosen.to).toBe('e2');
});

// Knight Rider: high mobility — should capture adjacent king when available
test('KNIGHT_RIDER captures enemy king when reachable by knight', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'n', color: 'b' }, 'd6');
  chess.put({ type: 'k', color: 'w' }, 'e4'); // knight on d6 can reach e4 via f5 or c4… actually d6→e4 is valid knight move (df=1, dr=-2)

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, KNIGHT_RIDER, 2);
  expect(chosen.to).toBe('e4');
});

// Bishop Pair: material weight — should capture a pawn with bishop
test('BISHOP_PAIR captures enemy pawn when bishop can reach it', () => {
  const chess = emptyChess();
  chess.put({ type: 'k', color: 'b' }, 'e8');
  chess.put({ type: 'b', color: 'b' }, 'c6');
  chess.put({ type: 'k', color: 'w' }, 'a1');
  chess.put({ type: 'p', color: 'w' }, 'e4'); // bishop c6→e4 is diagonal (df=2, dr=-2)

  const moves = generateMoves(chess, 'b');
  const chosen = selectMove(chess, moves, BISHOP_PAIR, 2);
  expect(chosen.to).toBe('e4');
});

// --- endTurn uses the correct personality ---

test('GameState endTurn works for iron_line enemy', () => {
  const gs = new GameState('knight', 'iron_line');
  const result = gs.endTurn();
  expect(result.ok).toBe(true);
});

test('GameState endTurn works for knight_rider enemy', () => {
  const gs = new GameState('knight', 'knight_rider');
  const result = gs.endTurn();
  expect(result.ok).toBe(true);
});

test('GameState endTurn works for bishop_pair enemy', () => {
  const gs = new GameState('knight', 'bishop_pair');
  const result = gs.endTurn();
  expect(result.ok).toBe(true);
});
