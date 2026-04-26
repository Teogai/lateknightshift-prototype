import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RunState } from '../js/run.js';

beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
  });
});

test('RunState.toJSON serializes character, deck, lives, floor, phase, relics', () => {
  const rs = new RunState('knight');
  rs.lives = 2;
  rs.currentFloor = 5;
  rs.phase = 'battle';
  const json = rs.toJSON();
  expect(json.character).toBe('knight');
  expect(json.lives).toBe(2);
  expect(json.currentFloor).toBe(5);
  expect(json.phase).toBe('battle');
  expect(json).toHaveProperty('deck');
  expect(json).toHaveProperty('startingPieces');
  expect(json).toHaveProperty('currentNodes');
  expect(json).toHaveProperty('relics');
});

test('RunState.fromJSON restores identical state', () => {
  const rs = new RunState('knight');
  rs.lives = 2;
  rs.currentFloor = 5;
  const json = rs.toJSON();
  const restored = RunState.fromJSON(json);
  expect(restored.character).toBe('knight');
  expect(restored.lives).toBe(2);
  expect(restored.currentFloor).toBe(5);
  expect(restored.deck.length).toBe(rs.deck.length);
  expect(restored.phase).toBe(rs.phase);
});

test('saveSession stores to sessionStorage', () => {
  const rs = new RunState('knight');
  rs.saveSession();
  const saved = sessionStorage.getItem('lks_run_state');
  expect(saved).toBeTruthy();
  const parsed = JSON.parse(saved);
  expect(parsed.character).toBe('knight');
});

test('loadSession restores and clears key', () => {
  const rs = new RunState('knight');
  rs.saveSession();
  const restored = RunState.loadSession();
  expect(restored).toBeInstanceOf(RunState);
  expect(restored.character).toBe('knight');
  expect(sessionStorage.getItem('lks_run_state')).toBeNull();
});

test('loadSession returns null when no saved state', () => {
  const restored = RunState.loadSession();
  expect(restored).toBeNull();
});
