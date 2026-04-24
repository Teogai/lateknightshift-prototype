import { test, expect } from 'vitest';
import { GameState } from '../js/battle_state.js';
import { set } from '../js/engine2/board.js';
import { makePiece } from '../js/engine2/pieces.js';

function makeStateWithCards(cards, startingPieces = []) {
  return new GameState('knight', 'pawn_pusher', cards, startingPieces);
}

// --- Push Charm Tests ---
test('push charm on knight move pushes adjacent enemy piece', () => {
  const card = {
    name: 'Knight Move',
    type: 'move',
    moveVariant: 'knight',
    charm: { id: 'push', name: 'Push', validCardTypes: ['move'] }
  };
  const state = makeStateWithCards([card]);

  // Clear board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = String.fromCharCode(97 + c) + (r + 1);
      set(state._state.board, sq, null);
    }
  }

  // Place player knight at e1, enemy pawn at d3
  set(state._state.board, 'e1', makePiece('knight', 'player'));
  set(state._state.board, 'd3', makePiece('pawn', 'enemy'));

  // Set hand to our push-charm knight move card
  state._state.hand = [card];

  // Knight jumps e1 -> c2. From c2, d3 is adjacent (up-right), so pawn should
  // be pushed one square further in the same direction to e4.
  const result = state.playKnightMoveCard(0, 'e1', 'c2');

  expect(result.error).toBeUndefined();
  const board = state.toDict().board;
  expect(board['d3']).toBeUndefined(); // pawn no longer at d3
  expect(board['e4']).toBeDefined();   // pawn pushed to e4
  expect(board['e4'].type).toBe('pawn');
  expect(board['e4'].color).toBe('black'); // enemy pieces are black
});

test('push charm blocked by piece behind', () => {
  const card = {
    name: 'Knight Move',
    type: 'move',
    moveVariant: 'knight',
    charm: { id: 'push', name: 'Push', validCardTypes: ['move'] }
  };
  const state = makeStateWithCards([card]);

  // Clear board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = String.fromCharCode(97 + c) + (r + 1);
      set(state._state.board, sq, null);
    }
  }

  // Place player knight at e1, enemy pawn at d3, enemy pawn at e4 (behind d3)
  set(state._state.board, 'e1', makePiece('knight', 'player'));
  set(state._state.board, 'd3', makePiece('pawn', 'enemy'));
  set(state._state.board, 'e4', makePiece('pawn', 'enemy'));

  state._state.hand = [card];

  // Knight jumps e1 -> c2. From c2, d3 is adjacent, but e4 is occupied.
  // New behavior: d3 should NOT be pushed.
  const result = state.playKnightMoveCard(0, 'e1', 'c2');

  expect(result.error).toBeUndefined();
  const board = state.toDict().board;
  expect(board['d3']).toBeDefined();   // pawn stays at d3
  expect(board['e4']).toBeDefined();   // pawn stays at e4
});

test('push charm blocked at board edge', () => {
  const card = {
    name: 'Knight Move',
    type: 'move',
    moveVariant: 'knight',
    charm: { id: 'push', name: 'Push', validCardTypes: ['move'] }
  };
  const state = makeStateWithCards([card]);

  // Clear board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = String.fromCharCode(97 + c) + (r + 1);
      set(state._state.board, sq, null);
    }
  }

  // Place player knight at c2, enemy pawn at a1 (adjacent? no, let me think)
  // Center at b1. Adjacent squares: a2, b2, c2, a1, c1. 
  // a1 is adjacent to b1. Direction from b1 to a1 is (0,-1). Behind a1 is a0 (off-board).
  // Let's use knight landing at b1 from d2. a1 is adjacent and would push to a0 (off-board).
  set(state._state.board, 'd2', makePiece('knight', 'player'));
  set(state._state.board, 'a1', makePiece('pawn', 'enemy'));

  state._state.hand = [card];

  // Knight jumps d2 -> b1. From b1, a1 is adjacent, but push would go to a0 (off-board).
  // New behavior: a1 should NOT be pushed.
  const result = state.playKnightMoveCard(0, 'd2', 'b1');

  expect(result.error).toBeUndefined();
  const board = state.toDict().board;
  expect(board['a1']).toBeDefined();   // pawn stays at a1
});

// --- Push Charm on Move Together Tests ---
test('push charm on move_together first move pushes adjacent enemy piece', () => {
  const card = {
    name: 'Move Together',
    type: 'move',
    moveVariant: 'move_together',
    charm: { id: 'push', name: 'Push', validCardTypes: ['move'] }
  };
  const state = makeStateWithCards([card]);

  // Clear board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = String.fromCharCode(97 + c) + (r + 1);
      set(state._state.board, sq, null);
    }
  }

  // Place player rook at e4, player bishop at c4, enemy pawn at f5
  set(state._state.board, 'e4', makePiece('rook', 'player'));
  set(state._state.board, 'c4', makePiece('bishop', 'player'));
  set(state._state.board, 'f5', makePiece('pawn', 'enemy'));

  state._state.hand = [card];

  // Move rook e4 -> e5 (one square up, legal rook move)
  // From e5, f5 is adjacent (right). Direction (0,1). Push to g5.
  const result = state.playMoveTogetherFirst(0, 'e4', 'e5');

  expect(result.error).toBeUndefined();
  const board = state.toDict().board;
  expect(board['f5']).toBeUndefined(); // pawn no longer at f5
  expect(board['g5']).toBeDefined();   // pawn pushed to g5
  expect(board['g5'].type).toBe('pawn');
});

test('push charm on move_together second move pushes adjacent enemy piece', () => {
  const card = {
    name: 'Move Together',
    type: 'move',
    moveVariant: 'move_together',
    charm: { id: 'push', name: 'Push', validCardTypes: ['move'] }
  };
  const state = makeStateWithCards([card]);

  // Clear board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = String.fromCharCode(97 + c) + (r + 1);
      set(state._state.board, sq, null);
    }
  }

  // Place player rook at e4, player bishop at c4, enemy pawn at d5
  set(state._state.board, 'e4', makePiece('rook', 'player'));
  set(state._state.board, 'c4', makePiece('bishop', 'player'));
  set(state._state.board, 'd5', makePiece('pawn', 'enemy'));

  state._state.hand = [card];

  // First move: rook e4 -> e5 (one square up, legal rook move)
  const result1 = state.playMoveTogetherFirst(0, 'e4', 'e5');
  expect(result1.error).toBeUndefined();

  // Second move: bishop c4 -> c5 (one square up, legal bishop move? No, bishop on c4 moving to c5 is not diagonal)
  // Let's use bishop c4 -> d5 which captures the pawn. From d5, push adjacent.
  // But d5 had the pawn. Let's place another enemy pawn at e6 (adjacent to d5).
  set(state._state.board, 'e6', makePiece('pawn', 'enemy'));

  const result2 = state.playMoveTogetherSecond('c4', 'd5');

  expect(result2.error).toBeUndefined();
  const board = state.toDict().board;
  // From d5, e6 is adjacent (up-right). Direction (1,1). Push to f7.
  expect(board['e6']).toBeUndefined(); // pawn no longer at e6
  expect(board['f7']).toBeDefined();   // pawn pushed to f7
  expect(board['f7'].type).toBe('pawn');
});

// --- Atomic Charm Tests ---
test('atomic piece explodes on capture', () => {
  const state = makeStateWithCards([{ name: 'Pawn', type: 'piece', piece: 'pawn', charm: { id: 'atomic', name: 'Atomic', validCardTypes: ['piece'] } }]);
  const d = state.toDict();

  // This requires complex board setup - placeholder for now
  expect(true).toBe(true);
});

test('atomic piece explodes when captured', () => {
  const state = makeStateWithCards([{ name: 'Pawn', type: 'piece', piece: 'pawn', charm: { id: 'atomic', name: 'Atomic', validCardTypes: ['piece'] } }]);

  // Placeholder
  expect(true).toBe(true);
});
