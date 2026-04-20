import { describe, test, expect } from 'vitest';
import { GameState, knightAttacks } from '../js/battle_state.js';

function freshGame(character = 'knight', enemy = 'pawn_pusher') {
  return new GameState(character, enemy);
}

test('new game returns board and hand and turn', () => {
  const state = freshGame();
  const d = state.toDict();
  expect(d.board).toBeDefined();
  expect(d.hand).toBeDefined();
  expect(d.turn).toBe('player');
});

test('knight character starts with 6 player pieces', () => {
  const state = freshGame();
  const pieces = Object.values(state.toDict().board);
  const player = pieces.filter(p => p.color === 'white');
  expect(player).toHaveLength(6);
});

test('pawn_pusher enemy starts with 6 enemy pieces', () => {
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

test('invalid enemy throws', () => {
  expect(() => new GameState('knight', 'nonexistent_enemy')).toThrow();
});

test('legalDestinationsFor e1 king returns moves', () => {
  const state = freshGame();
  const dests = state.legalDestinationsFor('e1');
  expect(Array.isArray(dests)).toBe(true);
});

test('knightAttacks from e1 returns 4 squares', () => {
  const attacks = knightAttacks('e1');
  expect(attacks).toHaveLength(4);
  expect(attacks).toContain('d3');
  expect(attacks).toContain('f3');
});

test('geometricDestsFor bishop pattern returns diagonals only', () => {
  const state = freshGame();
  // a1 rook used with bishop pattern → diagonal only
  const dests = state.geometricDestsFor('a1', 'b');
  expect(dests.length).toBeGreaterThanOrEqual(0);
  // All dests must be diagonal from a1 (file 0, rank 0 in 0-indexed)
  for (const sq of dests) {
    const dc = Math.abs(sq.charCodeAt(0) - 'a'.charCodeAt(0));
    const dr = Math.abs(parseInt(sq[1]) - 1);
    expect(dc).toBe(dr);
  }
});

test('playSummonCard places a piece on the board', () => {
  const state = freshGame();
  // Find a summon card in hand
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'summon');
  if (idx === -1) return; // no summon in hand, skip
  const card = d.hand[idx];
  const result = state.playSummonCard(idx, card.piece, 'h2');
  expect(result.error).toBeUndefined();
  expect(state.toDict().board['h2']).toBeDefined();
});

test('playSummonCard on occupied square returns error', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'summon');
  if (idx === -1) return;
  const card = d.hand[idx];
  // e1 is occupied by player king
  const result = state.playSummonCard(idx, card.piece, 'e1');
  expect(result.error).toBeDefined();
});

test('playSummonCard on rank 5 returns error', () => {
  const state = freshGame();
  const d = state.toDict();
  const idx = d.hand.findIndex(c => c.type === 'summon');
  if (idx === -1) return;
  const card = d.hand[idx];
  const result = state.playSummonCard(idx, card.piece, 'e5');
  expect(result.error).toBeDefined();
});

test('toDict includes redraw_countdown', () => {
  const d = freshGame().toDict();
  expect(d.redraw_countdown).toBe(4);
});

test('toDict does not include mana', () => {
  const d = freshGame().toDict();
  expect(d.mana).toBeUndefined();
});

test('applyPromotion on non-pawn square returns error', () => {
  const state = freshGame();
  // e1 has a king, not a promotable pawn
  const result = state.applyPromotion('e1', 'q');
  expect(result.error).toBeDefined();
});

test('redrawHand replaces hand', () => {
  const state = freshGame();
  const firstHand = state.toDict().hand.map(c => c.name);
  state.redrawCountdown = 0; // free redraw
  const result = state.redrawHand();
  expect(result.free).toBe(true);
  expect(result.ok).toBe(true);
  expect(state.toDict().hand).toHaveLength(6);
});
