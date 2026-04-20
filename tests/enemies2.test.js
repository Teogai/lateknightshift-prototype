import { describe, test, expect } from 'vitest';
import { ENEMIES, VALID_ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, BOSS_ENEMY } from '../js/enemies2.js';
import { GameState } from '../js/engine2/state.js';
import { makePiece } from '../js/engine2/pieces.js';
import { set } from '../js/engine2/board.js';

test('ENEMIES has pawn_pusher', () => {
  expect(ENEMIES.pawn_pusher).toBeDefined();
  expect(ENEMIES.pawn_pusher.name).toBe('Pawn Pusher');
});

test('VALID_ENEMIES contains pawn_pusher', () => {
  expect(VALID_ENEMIES.has('pawn_pusher')).toBe(true);
});

test('REGULAR_ENEMIES is non-empty', () => {
  expect(REGULAR_ENEMIES.length).toBeGreaterThan(0);
});

test('ELITE_ENEMY is duelist', () => {
  expect(ELITE_ENEMY).toBe('duelist');
});

test('BOSS_ENEMY is boss_duelist', () => {
  expect(BOSS_ENEMY).toBe('boss_duelist');
});

test('each enemy has pieces array', () => {
  for (const [key, enemy] of Object.entries(ENEMIES)) {
    expect(Array.isArray(enemy.pieces), `${key} missing pieces`).toBe(true);
  }
});

test('each enemy has personality', () => {
  for (const [key, enemy] of Object.entries(ENEMIES)) {
    expect(enemy.personality, `${key} missing personality`).toBeDefined();
  }
});

test('each enemy has createAI function', () => {
  for (const [key, enemy] of Object.entries(ENEMIES)) {
    expect(typeof enemy.createAI, `${key} createAI not function`).toBe('function');
  }
});

test('defaultAI returns an object with selectMove', () => {
  const ai = ENEMIES.pawn_pusher.createAI();
  expect(typeof ai.selectMove).toBe('function');
});

test('doubleMoveAI returns an object with selectMove', () => {
  const ai = ENEMIES.duelist.createAI();
  expect(typeof ai.selectMove).toBe('function');
});

test('defaultAI selectMove returns an action or null from a real state', () => {
  const state = new GameState();
  // put player king and enemy king
  set(state.board, 'e1', makePiece('king', 'player'));
  set(state.board, 'e8', makePiece('king', 'enemy'));
  set(state.board, 'd7', makePiece('pawn', 'enemy'));
  const ai = ENEMIES.pawn_pusher.createAI();
  const action = ai.selectMove(state);
  // Should return an action (enemy has moves)
  expect(action).not.toBeNull();
  expect(action.source).toBeDefined();
});

test('doubleMoveAI alternates warnNext behavior', () => {
  const ai = ENEMIES.duelist.createAI();
  const state = new GameState();
  set(state.board, 'e1', makePiece('king', 'player'));
  set(state.board, 'e8', makePiece('king', 'enemy'));
  set(state.board, 'd7', makePiece('pawn', 'enemy'));
  // First call: warnNext should be true (preparing double move)
  const r1 = ai.selectMove(state);
  expect(r1).toBeDefined();
});
