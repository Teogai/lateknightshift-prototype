import { describe, test, expect } from 'vitest';
import { ENEMIES, VALID_ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, ELITE_2_ENEMY, BOSS_ENEMY } from '../js/enemies2.js';
import { ELITE_ENEMY as CONFIG_ELITE_ENEMY, ELITE_2_ENEMY as CONFIG_ELITE_2_ENEMY, BOSS_ENEMY as CONFIG_BOSS_ENEMY } from '../config/enemies.js';
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

test('ELITE_ENEMY matches config', () => {
  expect(ELITE_ENEMY).toBe(CONFIG_ELITE_ENEMY);
});

test('ELITE_2_ENEMY matches config', () => {
  expect(ELITE_2_ENEMY).toBe(CONFIG_ELITE_2_ENEMY);
});

test('BOSS_ENEMY matches config', () => {
  expect(BOSS_ENEMY).toBe(CONFIG_BOSS_ENEMY);
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

describe('doubleMoveAI phase behavior', () => {
  test('warn phase returns single action', () => {
    const ai = ENEMIES.duelist.createAI();
    const state = new GameState();
    set(state.board, 'e1', makePiece('king', 'player'));
    set(state.board, 'e8', makePiece('king', 'enemy'));
    set(state.board, 'd7', makePiece('pawn', 'enemy'));

    const action = ai.selectMove(state, 'warn');
    expect(action).not.toBeNull();
    expect(action._double).toBeUndefined();
    expect(action.source).toBeDefined();
  });

  test('double phase returns compound action with 2 moves', () => {
    const ai = ENEMIES.duelist.createAI();
    const state = new GameState();
    set(state.board, 'e1', makePiece('king', 'player'));
    set(state.board, 'e8', makePiece('king', 'enemy'));
    set(state.board, 'd7', makePiece('pawn', 'enemy'));
    set(state.board, 'c7', makePiece('pawn', 'enemy'));

    const result = ai.selectMove(state, 'double');
    expect(result).not.toBeNull();
    expect(result._double).toBe(true);
    expect(Array.isArray(result.moves)).toBe(true);
    expect(result.moves.length).toBeGreaterThanOrEqual(1);
  });

  test('double phase uses schedule-based search for first move', () => {
    // Set up a position where a 2-move sequence is needed
    // Enemy rook on a1, enemy knight on a2 (blocking a-file), player king on a3
    const ai = ENEMIES.duelist.createAI();
    const state = new GameState();
    set(state.board, 'e8', makePiece('king', 'enemy'));
    set(state.board, 'a1', makePiece('rook', 'enemy'));
    set(state.board, 'a2', makePiece('knight', 'enemy'));
    set(state.board, 'a3', makePiece('king', 'player'));

    const result = ai.selectMove(state, 'double');
    expect(result).not.toBeNull();
    expect(result._double).toBe(true);
    // First move should be moving the knight to open the a-file
    // Knight on a2 can move to b4, c3, or c1 - any of these opens the a-file
    expect(result.moves[0].source).toBe('a2');
    const validKnightMoves = ['b4', 'c3', 'c1'];
    expect(validKnightMoves).toContain(result.moves[0].targets[0]);
  });
});
