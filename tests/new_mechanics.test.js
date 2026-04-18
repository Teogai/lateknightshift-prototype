import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';
import { STARTER_DECKS } from '../js/cards.js';

function freshGame() {
  return new GameState('knight');
}

// --- Deck composition ---

test('starter deck: 7 move, 2 summon pawn, 1 knight_move, total 10', () => {
  const deck = STARTER_DECKS['knight'];
  expect(deck.filter(c => c.type === 'move')).toHaveLength(7);
  expect(deck.filter(c => c.type === 'summon' && c.piece === 'pawn')).toHaveLength(2);
  expect(deck.filter(c => c.type === 'knight_move')).toHaveLength(1);
  expect(deck).toHaveLength(10);
});

test('bishop character does not exist', () => {
  expect(() => new GameState('bishop')).toThrow();
});

// --- No-repeat-piece rule ---

test('moved piece cannot move again same turn', () => {
  const state = freshGame();
  state.hand = [
    { name: 'Move', type: 'move', cost: 1 },
    { name: 'Move', type: 'move', cost: 1 },
  ];
  state.mana = 3;
  state.playMoveCard(0, 'b1', 'a3');
  const result = state.playMoveCard(0, 'a3', 'b5');
  expect(result.error).toMatch(/already moved/);
});

test('moved_this_turn resets after end turn', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  state.playMoveCard(0, 'b1', 'a3');
  state.endTurn();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  const result = state.playMoveCard(0, 'a3', 'b5');
  expect(result.ok).toBe(true);
});

test('state exposes moved_this_turn', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  state.playMoveCard(0, 'b1', 'a3');
  expect(state.toDict().moved_this_turn).toContain('a3');
});

// --- Knight Move card ---

test('knight move card moves piece to valid L-shape destination', () => {
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'knight_move', cost: 2 }];
  state.mana = 3;
  const result = state.playKnightMoveCard(0, 'a1', 'b3');
  expect(result.ok).toBe(true);
  const d = state.toDict();
  expect(d.board['b3'].type).toBe('rook');
  expect(d.mana).toBe(1);
});

test('knight move card rejects non-L-shape destination', () => {
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'knight_move', cost: 2 }];
  state.mana = 3;
  const result = state.playKnightMoveCard(0, 'a1', 'a3');
  expect(result.error).toBeDefined();
});

test('knight move card obeys no-repeat rule', () => {
  const state = freshGame();
  state.hand = [
    { name: 'Move', type: 'move', cost: 1 },
    { name: 'Knight Move', type: 'knight_move', cost: 2 },
  ];
  state.mana = 3;
  state.playMoveCard(0, 'b1', 'a3');
  const result = state.playKnightMoveCard(0, 'a3', 'b5');
  expect(result.error).toMatch(/already moved/);
});

test('knight move card costs 2 mana', () => {
  const state = freshGame();
  state.hand = [{ name: 'Knight Move', type: 'knight_move', cost: 2 }];
  state.mana = 1;
  const result = state.playKnightMoveCard(0, 'a1', 'b3');
  expect(result.error).toMatch(/mana/);
});

// --- Knight move pawn promotion ---

function setupKnightPromo() {
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'a8');
  state._chess.put({ type: 'p', color: 'w' }, 'b7');
  state.hand = [{ name: 'Knight Move', type: 'knight_move', cost: 2 }];
  state.mana = 3;
  state.movedThisTurn = new Set();
  return state;
}

test('knight move pawn to rank 8 returns needs_promotion', () => {
  const state = setupKnightPromo();
  // b7 → d8 is a valid L-shape (+2 file, +1 rank)
  const result = state.playKnightMoveCard(0, 'b7', 'd8');
  expect(result.ok).toBe(true);
  expect(result.needs_promotion).toEqual(['d8']);
});

test('pawn stays as pawn on rank 8 before applyPromotion', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  expect(state._chess.get('d8').type).toBe('p');
});

test('applyPromotion promotes pawn to queen', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  const result = state.applyPromotion('d8', 'q');
  expect(result.ok).toBe(true);
  expect(state._chess.get('d8').type).toBe('q');
});

test('applyPromotion promotes pawn to rook', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  const result = state.applyPromotion('d8', 'r');
  expect(result.ok).toBe(true);
  expect(state._chess.get('d8').type).toBe('r');
});

test('applyPromotion rejects invalid piece', () => {
  const state = setupKnightPromo();
  state.playKnightMoveCard(0, 'b7', 'd8');
  const result = state.applyPromotion('d8', 'x');
  expect(result.error).toMatch(/invalid/);
});

test('applyPromotion rejects non-pawn square', () => {
  const state = setupKnightPromo();
  const result = state.applyPromotion('e1', 'q');
  expect(result.error).toBeDefined();
});

// --- Pattern-based AI ---

test('AI advances most-forward black pawn', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'a5'); // rank 5, more forward
  state._chess.put({ type: 'p', color: 'b' }, 'c7'); // rank 7, less forward
  state.endTurn();
  // a5 → a4 (most forward pawn advances)
  expect(state._chess.get('a4')).toBeTruthy();
  expect(state._chess.get('a4').type).toBe('p');
  expect(state._chess.get('a5')).toBeFalsy();
});

test('AI prefers capture over pawn advance', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'a7');
  state._chess.put({ type: 'r', color: 'w' }, 'b6'); // capturable by a7 pawn
  state.endTurn();
  expect(state._chess.get('b6')).toBeTruthy();
  expect(state._chess.get('b6').color).toBe('b');
  expect(state._chess.get('a7')).toBeFalsy();
});

// --- Enemy pawn promotion ---

test('enemy pawn reaching rank 1 promotes to queen', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'a2'); // one step from promotion
  state.endTurn();
  expect(state._chess.get('a1')).toBeTruthy();
  expect(state._chess.get('a1').type).toBe('q');
  expect(state._chess.get('a2')).toBeFalsy();
});
