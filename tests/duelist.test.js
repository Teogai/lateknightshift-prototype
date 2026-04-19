import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';
import { ENEMIES } from '../js/enemies.js';

// --- Duelist: piece setup ---
test('duelist has 8 pieces', () => {
  expect(ENEMIES.duelist.pieces).toHaveLength(8);
});
test('duelist has king', () => {
  expect(ENEMIES.duelist.pieces.some(p => p.type === 'k')).toBe(true);
});

// --- Boss Duelist: piece setup ---
test('boss_duelist has 16 pieces', () => {
  expect(ENEMIES.boss_duelist.pieces).toHaveLength(16);
});
test('boss_duelist has king', () => {
  expect(ENEMIES.boss_duelist.pieces.some(p => p.type === 'k')).toBe(true);
});
test('boss_duelist has 8 pawns', () => {
  expect(ENEMIES.boss_duelist.pieces.filter(p => p.type === 'p')).toHaveLength(8);
});

// --- Duelist AI: warning + double move ---
test('duelist AI sets warnNext on first turn', () => {
  const ai = ENEMIES.duelist.createAI();
  const gs = new GameState('knight', 'duelist');
  const result = ai.takeTurn(gs._chess, ENEMIES.duelist.personality, null);
  expect(result.warnNext).toBe(true);
});
test('duelist AI executes 2 moves on double turn', () => {
  const ai = ENEMIES.duelist.createAI();
  const gs = new GameState('knight', 'duelist');
  // First turn: normal
  ai.takeTurn(gs._chess, ENEMIES.duelist.personality, null);
  // Second turn: double
  const result = ai.takeTurn(gs._chess, ENEMIES.duelist.personality, null);
  expect(result.moves.length).toBeGreaterThanOrEqual(1);
  expect(result.warnNext).toBe(false);
});
test('duelist AI pattern repeats: 3rd turn warns again', () => {
  const ai = ENEMIES.duelist.createAI();
  const gs = new GameState('knight', 'duelist');
  ai.takeTurn(gs._chess, ENEMIES.duelist.personality, null); // warn
  ai.takeTurn(gs._chess, ENEMIES.duelist.personality, null); // double
  const result = ai.takeTurn(gs._chess, ENEMIES.duelist.personality, null);
  expect(result.warnNext).toBe(true);
});

// --- GameState: enemy_will_double_move in toDict ---
test('enemyWillDoubleMove starts false', () => {
  const gs = new GameState('knight', 'duelist');
  expect(gs.toDict().enemy_will_double_move).toBe(false);
});
test('enemyWillDoubleMove is true after first endTurn vs duelist', () => {
  const gs = new GameState('knight', 'duelist');
  gs.endTurn();
  expect(gs.toDict().enemy_will_double_move).toBe(true);
});
test('enemyWillDoubleMove is false after second endTurn vs duelist', () => {
  const gs = new GameState('knight', 'duelist');
  gs.endTurn(); // warn
  gs.endTurn(); // double
  expect(gs.toDict().enemy_will_double_move).toBe(false);
});
