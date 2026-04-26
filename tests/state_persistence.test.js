import { describe, test, expect, beforeEach, vi } from 'vitest';
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

test('GameState.toJSON serializes board, hand, deck, discard, turn, and metadata', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  const json = gs.toJSON();
  expect(json).toHaveProperty('_state');
  expect(json).toHaveProperty('character');
  expect(json).toHaveProperty('turn');
  expect(json).toHaveProperty('redrawCountdown');
  expect(json).toHaveProperty('enemy');
  expect(json).toHaveProperty('enemyPhase');
  expect(json).toHaveProperty('enemyWillDoubleMove');
  expect(json).toHaveProperty('lastMove');
  expect(json._state).toHaveProperty('board');
  expect(json._state).toHaveProperty('hand');
  expect(json._state).toHaveProperty('deck');
  expect(json._state).toHaveProperty('discard');
});

test('GameState.fromJSON restores identical state', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  const json = gs.toJSON();
  const restored = GameState.fromJSON(json);
  const origDict = gs.toDict();
  const restDict = restored.toDict();
  expect(restDict.turn).toBe(origDict.turn);
  expect(restDict.hand).toEqual(origDict.hand);
  expect(restDict.deck_size).toBe(origDict.deck_size);
  expect(restDict.discard_size).toBe(origDict.discard_size);
  expect(restDict.redraw_countdown).toBe(origDict.redraw_countdown);
  expect(restDict.enemy_will_double_move).toBe(origDict.enemy_will_double_move);
});

test('saveSession stores serialized state to sessionStorage', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs.saveSession();
  const saved = sessionStorage.getItem('lks_battle_state');
  expect(saved).toBeTruthy();
  const parsed = JSON.parse(saved);
  expect(parsed).toHaveProperty('character', 'knight');
  expect(parsed).toHaveProperty('enemy', 'pawn_pusher');
});

test('loadSession restores from sessionStorage and clears key', () => {
  const gs = new GameState('knight', 'pawn_pusher');
  gs.saveSession();
  const restored = GameState.loadSession();
  expect(restored).toBeInstanceOf(GameState);
  expect(restored.character).toBe('knight');
  expect(sessionStorage.getItem('lks_battle_state')).toBeNull();
});

test('loadSession returns null when no saved state', () => {
  const restored = GameState.loadSession();
  expect(restored).toBeNull();
});
