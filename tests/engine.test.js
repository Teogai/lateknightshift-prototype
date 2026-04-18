import { describe, test, expect } from 'vitest';
import { GameState, CHARACTER_PIECES, ENEMY_PIECES, HAND_SIZE, STARTING_MANA } from '../js/engine.js';

function freshGame(character = 'knight') {
  return new GameState(character);
}

test('new game returns board with mana and hand and turn', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(d.board).toBeDefined();
  expect(d.mana).toBe(3);
  expect(d.hand).toBeDefined();
  expect(d.turn).toBe('player');
});

test('knight character starts with 5 white pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const player = pieces.filter(p => p.color === 'white');
  expect(player).toHaveLength(5);
});

test('pawn pusher enemy starts with 5 black pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const enemy = pieces.filter(p => p.color === 'black');
  expect(enemy).toHaveLength(5);
});

test('new game deals 5 cards', () => {
  const state = freshGame();
  expect(state.toDict().hand).toHaveLength(5);
});

test('invalid character throws', () => {
  expect(() => new GameState('wizard')).toThrow();
});

test('_allGeometricMovesFor does not generate illegal pawn diagonal to empty square', () => {
  const state = freshGame();
  // Position where black pawn on c4 could illegally move to empty d3
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e2');
  state._chess.put({ type: 'k', color: 'b' }, 'h5');
  state._chess.put({ type: 'p', color: 'b' }, 'c4');
  state._chess.put({ type: 'p', color: 'w' }, 'c3');
  const moves = state._allGeometricMovesFor('b');
  const illegal = moves.find(m => m.from === 'c4' && m.to === 'd3');
  expect(illegal).toBeUndefined();
});
