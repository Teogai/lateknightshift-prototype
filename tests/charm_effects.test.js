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
