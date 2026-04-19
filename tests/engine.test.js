import { describe, test, expect } from 'vitest';
import { GameState, CHARACTER_PIECES, HAND_SIZE } from '../js/engine.js';

function freshGame(character = 'knight') {
  return new GameState(character);
}

test('new game returns board and hand and turn', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(d.board).toBeDefined();
  expect(d.hand).toBeDefined();
  expect(d.turn).toBe('player');
});

test('knight character starts with 6 white pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const player = pieces.filter(p => p.color === 'white');
  expect(player).toHaveLength(6);
});

test('pawn pusher enemy starts with 6 black pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const enemy = pieces.filter(p => p.color === 'black');
  expect(enemy).toHaveLength(6);
});

test('new game deals 6 cards', () => {
  const state = freshGame();
  expect(state.toDict().hand).toHaveLength(6);
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

test('player en passant: white pawn e5 can capture on d6 after black pawn d7-d5', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'a1');
  state._chess.put({ type: 'k', color: 'b' }, 'h8');
  state._chess.put({ type: 'p', color: 'w' }, 'e5');
  state._chess.put({ type: 'p', color: 'b' }, 'd7');
  // Simulate enemy double push: set en passant target manually
  state.enPassantTarget = 'd6';

  const dests = state.legalDestinationsFor('e5');
  expect(dests).toContain('d6');
});

test('player en passant: captures the pawn and lands on target square', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'a1');
  state._chess.put({ type: 'k', color: 'b' }, 'h8');
  state._chess.put({ type: 'p', color: 'w' }, 'e5');
  state._chess.put({ type: 'p', color: 'b' }, 'd5');
  state.enPassantTarget = 'd6';
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;

  const result = state.playMoveCard(0, 'e5', 'd6');
  expect(result.ok).toBe(true);
  const board = state.toDict().board;
  expect(board['d6']).toBeDefined();
  expect(board['d6'].type).toBe('pawn');
  expect(board['d5']).toBeUndefined(); // captured pawn removed
});

test('en passant target clears after non-en-passant player move', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'a1');
  state._chess.put({ type: 'k', color: 'b' }, 'h8');
  state._chess.put({ type: 'p', color: 'w' }, 'e5');
  state._chess.put({ type: 'p', color: 'b' }, 'd5');
  state.enPassantTarget = 'd6';
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;

  // Move pawn forward instead of en passant capture
  state.playMoveCard(0, 'e5', 'e6');
  expect(state.enPassantTarget).toBeNull();
});

test('en passant target cleared after auto-turn end (double push)', () => {
  // In wildfrost mode, playing a card auto-ends the turn (enemy moves).
  // startEnemyTurn clears enPassantTarget, so it is always null at the start of the next player turn.
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'a1');
  state._chess.put({ type: 'k', color: 'b' }, 'h8');
  state._chess.put({ type: 'p', color: 'w' }, 'e2');
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];

  state.playMoveCard(0, 'e2', 'e4');
  // Auto-turn ran; enPassantTarget was set then cleared by startEnemyTurn
  expect(state.enPassantTarget).toBeNull();
});

