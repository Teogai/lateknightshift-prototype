import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';

function setupPawnOnE7() {
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'a8');
  state._chess.put({ type: 'p', color: 'w' }, 'e7');
  state.hand = [{ type: 'move', cost: 1 }];
  state.mana = 3;
  state.movedThisTurn = new Set();
  state.summonedThisTurn = new Set();
  return state;
}

test('player promotes pawn to queen', () => {
  const state = setupPawnOnE7();
  const result = state.playMoveCard(0, 'e7', 'e8', 'q');
  expect(result.ok).toBe(true);
  expect(state._chess.get('e8').type).toBe('q');
  expect(state._chess.get('e7')).toBeFalsy();
});

test.each([['q', 'queen'], ['r', 'rook'], ['b', 'bishop'], ['n', 'knight']])(
  'player promotes to %s',
  (letter, name) => {
    const state = setupPawnOnE7();
    const result = state.playMoveCard(0, 'e7', 'e8', letter);
    expect(result.ok).toBe(true);
    expect(state._chess.get('e8').type).toBe(letter);
  }
);

test('missing promotion returns error', () => {
  const state = setupPawnOnE7();
  const result = state.playMoveCard(0, 'e7', 'e8');
  expect(result.error).toMatch(/promotion/);
});

test('invalid promotion letter returns error', () => {
  const state = setupPawnOnE7();
  const result = state.playMoveCard(0, 'e7', 'e8', 'x');
  expect(result.error).toMatch(/promotion/);
});

test('non-pawn move ignores promotion field', () => {
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'a8');
  state._chess.put({ type: 'r', color: 'w' }, 'a1');
  state.hand = [{ type: 'move', cost: 1 }];
  state.mana = 3;
  state.movedThisTurn = new Set();
  state.summonedThisTurn = new Set();
  const result = state.playMoveCard(0, 'a1', 'a5', 'q');
  expect(result.ok).toBe(true);
  expect(state._chess.get('a5').type).toBe('r');
});

test('pawn not on rank 7 does not promote', () => {
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'a8');
  state._chess.put({ type: 'p', color: 'w' }, 'e6');
  state.hand = [{ type: 'move', cost: 1 }];
  state.mana = 3;
  state.movedThisTurn = new Set();
  state.summonedThisTurn = new Set();
  const result = state.playMoveCard(0, 'e6', 'e7', 'q');
  expect(result.ok).toBe(true);
  expect(state._chess.get('e7').type).toBe('p');
});

