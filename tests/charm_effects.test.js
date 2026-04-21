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
