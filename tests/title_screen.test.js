import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RunState } from '../js/run.js';
import { GameState } from '../js/battle_state.js';

beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
  });
});

test('Continue button disabled when no saved state', () => {
  const hasSave = sessionStorage.getItem('lks_run_state') !== null;
  expect(hasSave).toBe(false);
});

test('Continue enabled after saving run + battle state', () => {
  const runState = new RunState('knight');
  runState.saveSession();

  const gameState = new GameState('knight', 'pawn_pusher', runState.deck);
  gameState.saveSession();

  const hasSave = sessionStorage.getItem('lks_run_state') !== null;
  expect(hasSave).toBe(true);
});

test('Restore flow reconstructs both run and battle state', () => {
  const runState = new RunState('knight');
  runState.saveSession();

  const gameState = new GameState('knight', 'pawn_pusher', runState.deck);
  gameState.saveSession();

  const restoredRun = RunState.loadSession();
  const restoredBattle = GameState.loadSession();

  expect(restoredRun).toBeInstanceOf(RunState);
  expect(restoredBattle).toBeInstanceOf(GameState);
  expect(restoredRun.character).toBe('knight');
  expect(restoredBattle.character).toBe('knight');
});
