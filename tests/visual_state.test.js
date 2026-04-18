import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';

function freshGame() {
  return new GameState('knight');
}

function setHand(state, type, piece = null, cost = 1) {
  if (type === 'summon') state.hand = [{ name: `Summon ${piece}`, type: 'summon', piece, cost }];
  else if (type === 'move') state.hand = [{ name: 'Move', type: 'move', cost }];
  else if (type === 'knight_move') state.hand = [{ name: 'Knight Move', type: 'knight_move', cost }];
  state.mana = 3;
}

// --- summoned_this_turn ---

test('summoned_this_turn appears in state after summon', () => {
  const state = freshGame();
  setHand(state, 'summon', 'pawn');
  state.playSummonCard(0, 'pawn', 'c2');
  const d = state.toDict();
  expect(d.summoned_this_turn).toContain('c2');
});

test('summoned square not in moved_this_turn', () => {
  const state = freshGame();
  setHand(state, 'summon', 'pawn');
  state.playSummonCard(0, 'pawn', 'c2');
  expect(state.toDict().moved_this_turn).not.toContain('c2');
});

test('summoned_this_turn clears after end turn', () => {
  const state = freshGame();
  setHand(state, 'summon', 'pawn');
  state.playSummonCard(0, 'pawn', 'c2');
  state.endTurn();
  expect(state.toDict().summoned_this_turn).toEqual([]);
});

// --- last_move ---

test('last_move is null/null on new game', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(d.last_move.from).toBeNull();
  expect(d.last_move.to).toBeNull();
});

test('last_move tracks move card', () => {
  const state = freshGame();
  setHand(state, 'move');
  state.playMoveCard(0, 'b1', 'a3');
  const d = state.toDict();
  expect(d.last_move.from).toBe('b1');
  expect(d.last_move.to).toBe('a3');
});

test('last_move tracks knight move', () => {
  const state = freshGame();
  setHand(state, 'knight_move', null, 2);
  state.playKnightMoveCard(0, 'b1', 'a3');
  const d = state.toDict();
  expect(d.last_move.from).toBe('b1');
  expect(d.last_move.to).toBe('a3');
});

test('last_move tracks summon (from is null)', () => {
  const state = freshGame();
  setHand(state, 'summon', 'pawn');
  state.playSummonCard(0, 'pawn', 'c2');
  const d = state.toDict();
  expect(d.last_move.from).toBeNull();
  expect(d.last_move.to).toBe('c2');
});

test('last_move.to is set after end turn (enemy moves)', () => {
  const state = freshGame();
  state.endTurn();
  expect(state.toDict().last_move.to).not.toBeNull();
});

// --- in_check ---

test('in_check is false on new game', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(d.in_check).toBe(false);
  expect(d.check_attacker_sq).toBeNull();
});

test('in_check true when white king attacked', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'r', color: 'b' }, 'e8');
  const d = state.toDict();
  expect(d.in_check).toBe(true);
  expect(d.check_attacker_sq).not.toBeNull();
});

test('check_attacker_sq is correct', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'r', color: 'b' }, 'e4');
  const d = state.toDict();
  expect(d.in_check).toBe(true);
  expect(d.check_attacker_sq).toBe('e4');
});

test('in_check false when path is blocked', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'p', color: 'w' }, 'e3');
  state._chess.put({ type: 'r', color: 'b' }, 'e8');
  const d = state.toDict();
  expect(d.in_check).toBe(false);
});

// --- legal-moves ---

test('legalDestinationsFor returns moves for knight', () => {
  const state = freshGame();
  const dests = state.legalDestinationsFor('b1');
  expect(Array.isArray(dests)).toBe(true);
  expect(dests.length).toBeGreaterThan(0);
  expect(dests.some(d => d === 'a3' || d === 'c3')).toBe(true);
});

test('legalDestinationsFor returns empty for summoned piece', () => {
  const state = freshGame();
  setHand(state, 'summon', 'pawn');
  state.playSummonCard(0, 'pawn', 'c2');
  expect(state.legalDestinationsFor('c2')).toEqual([]);
});

test('legalDestinationsFor returns empty for already-moved piece', () => {
  const state = freshGame();
  setHand(state, 'move');
  state.playMoveCard(0, 'b1', 'a3');
  expect(state.legalDestinationsFor('a3')).toEqual([]);
});

test('legalDestinationsFor returns empty for enemy piece', () => {
  const state = freshGame();
  expect(state.legalDestinationsFor('e7')).toEqual([]);
});

test('legalDestinationsFor returns empty for empty square', () => {
  const state = freshGame();
  expect(state.legalDestinationsFor('e4')).toEqual([]);
});
