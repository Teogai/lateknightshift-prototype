import { describe, test, expect } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { set, sqToRC } from '../../js/engine2/board.js';
import { generateLegalActions } from '../../js/engine2/movegen.js';
import { resolveAction } from '../../js/engine2/actions.js';

function findPieceById(board, id) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.id === id) return board[r][c];
    }
  }
  return null;
}

test('piece with knight_power tag gets extra knight moves', () => {
  const state = new GameState();
  const piece = makePiece('pawn', 'player');
  piece.tags.add('knight_power');
  set(state.board, 'e2', piece);

  const actions = generateLegalActions(state, 'player');
  const fromE2 = actions.filter(a => a.source === 'e2');

  // Should have normal pawn moves + knight moves
  const knightTargets = ['d4', 'f4', 'c3', 'g3'];
  for (const target of knightTargets) {
    const hasKnightMove = fromE2.some(a => a.targets[0] === target && a.isPowerMove);
    expect(hasKnightMove).toBe(true);
  }
});

test('power moves are marked with isPowerMove flag', () => {
  const state = new GameState();
  const piece = makePiece('rook', 'player');
  piece.tags.add('knight_power');
  set(state.board, 'a1', piece);

  const actions = generateLegalActions(state, 'player');
  const fromA1 = actions.filter(a => a.source === 'a1');

  const normalMoves = fromA1.filter(a => !a.isPowerMove);
  const powerMoves = fromA1.filter(a => a.isPowerMove);

  expect(normalMoves.length).toBeGreaterThan(0);
  expect(powerMoves.length).toBeGreaterThan(0);
});

test('power tags are removed after piece moves', () => {
  const state = new GameState();
  const piece = makePiece('pawn', 'player');
  const pieceId = piece.id;
  piece.tags.add('knight_power');
  set(state.board, 'e2', piece);

  const actions = generateLegalActions(state, 'player');
  const action = actions.find(a => a.source === 'e2' && !a.isPowerMove);
  expect(action).toBeDefined();

  const log = [];
  resolveAction(state, action, log);

  const movedPiece = findPieceById(state.board, pieceId);
  expect(movedPiece).toBeDefined();
  expect(movedPiece.tags.has('knight_power')).toBe(false);
});

test('power tags are removed after power move', () => {
  const state = new GameState();
  const piece = makePiece('pawn', 'player');
  const pieceId = piece.id;
  piece.tags.add('knight_power');
  set(state.board, 'e2', piece);

  const actions = generateLegalActions(state, 'player');
  const powerAction = actions.find(a => a.source === 'e2' && a.isPowerMove);
  expect(powerAction).toBeDefined();

  const log = [];
  resolveAction(state, powerAction, log);

  const movedPiece = findPieceById(state.board, pieceId);
  expect(movedPiece).toBeDefined();
  expect(movedPiece.tags.has('knight_power')).toBe(false);
});

test('multiple power tags can stack', () => {
  const state = new GameState();
  const piece = makePiece('pawn', 'player');
  piece.tags.add('knight_power');
  piece.tags.add('bishop_power');
  set(state.board, 'e2', piece);

  const actions = generateLegalActions(state, 'player');
  const fromE2 = actions.filter(a => a.source === 'e2' && a.isPowerMove);

  const knightMoves = fromE2.filter(a => ['d4', 'f4', 'c3', 'g3'].includes(a.targets[0]));
  const bishopMoves = fromE2.filter(a =>
    ['d3', 'f3', 'd1', 'f1', 'c4', 'g4'].includes(a.targets[0])
  );

  expect(knightMoves.length).toBeGreaterThan(0);
  expect(bishopMoves.length).toBeGreaterThan(0);
});

test('all power tags are removed after move', () => {
  const state = new GameState();
  const piece = makePiece('pawn', 'player');
  const pieceId = piece.id;
  piece.tags.add('knight_power');
  piece.tags.add('bishop_power');
  set(state.board, 'e2', piece);

  const actions = generateLegalActions(state, 'player');
  const action = actions.find(a => a.source === 'e2');

  const log = [];
  resolveAction(state, action, log);

  const movedPiece = findPieceById(state.board, pieceId);
  expect(movedPiece).toBeDefined();
  expect(movedPiece.tags.has('knight_power')).toBe(false);
  expect(movedPiece.tags.has('bishop_power')).toBe(false);
});
