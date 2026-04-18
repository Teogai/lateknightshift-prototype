import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';

function freshGame() {
  return new GameState('knight');
}

// --- Move card ---

test('move card moves a piece', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  const result = state.playMoveCard(0, 'b1', 'a3');
  expect(result.ok).toBe(true);
  const d = state.toDict();
  expect(d.board['a3']).toBeDefined();
  expect(d.board['a3'].type).toBe('knight');
  expect(d.mana).toBe(2);
});

test('illegal move is rejected', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  // Rook on a1, blocked by pawn on a2 — can't reach a8
  const result = state.playMoveCard(0, 'a1', 'a8');
  expect(result.error).toBeDefined();
});

test('move with no mana is rejected', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 2 }];
  state.mana = 1;
  const result = state.playMoveCard(0, 'b1', 'a3');
  expect(result.error).toMatch(/mana/);
});

test('moving enemy piece is rejected', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  const result = state.playMoveCard(0, 'e7', 'e5');
  expect(result.error).toBeDefined();
});

// --- Summon card ---

test('summon card places piece', () => {
  const state = freshGame();
  state.hand = [{ name: 'Summon Pawn', type: 'summon', piece: 'pawn', cost: 1 }];
  state.mana = 3;
  const result = state.playSummonCard(0, 'pawn', 'c2');
  expect(result.ok).toBe(true);
  expect(state.toDict().board['c2'].type).toBe('pawn');
});

test('summon pawn on invalid rank is rejected', () => {
  const state = freshGame();
  state.hand = [{ name: 'Summon Pawn', type: 'summon', piece: 'pawn', cost: 1 }];
  state.mana = 3;
  const result = state.playSummonCard(0, 'pawn', 'c5');
  expect(result.error).toBeDefined();
});

test('summoned piece cannot move same turn', () => {
  const state = freshGame();
  state.hand = [
    { name: 'Summon Pawn', type: 'summon', piece: 'pawn', cost: 1 },
    { name: 'Move', type: 'move', cost: 1 },
  ];
  state.mana = 3;
  state.playSummonCard(0, 'pawn', 'c2');
  const result = state.playMoveCard(0, 'c2', 'c3');
  expect(result.error).toMatch(/summon/);
});

// --- End turn ---

test('end turn triggers enemy move and resets turn to player', () => {
  const state = freshGame();
  const boardBefore = JSON.stringify(state.toDict().board);
  const result = state.endTurn();
  expect(result.ok).toBe(true);
  expect(state.toDict().turn).toBe('player');
  expect(JSON.stringify(state.toDict().board)).not.toBe(boardBefore);
});

test('end turn resets mana to 3', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 1;
  state.playMoveCard(0, 'b1', 'a3');
  state.endTurn();
  expect(state.toDict().mana).toBe(3);
});

test('end turn deals 5 new cards', () => {
  const state = freshGame();
  state.endTurn();
  expect(state.toDict().hand).toHaveLength(5);
});

test('end turn discards old hand', () => {
  const state = freshGame();
  const discardBefore = state.toDict().discard_size;
  state.endTurn();
  expect(state.toDict().discard_size).toBeGreaterThanOrEqual(discardBefore + 5);
});

// --- Win conditions ---

test('player wins on enemy king capture', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'q', color: 'w' }, 'e8');
  state._chess.put({ type: 'k', color: 'b' }, 'd8');
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  state.movedThisTurn = new Set();
  state.summonedThisTurn = new Set();
  state.playMoveCard(0, 'e8', 'd8');
  expect(state.toDict().turn).toBe('player_won');
});

test('enemy wins on white king capture', () => {
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'a1');
  state._chess.put({ type: 'r', color: 'b' }, 'a8');
  state._chess.put({ type: 'k', color: 'b' }, 'h8');
  state.endTurn();
  expect(state.toDict().turn).toBe('enemy_won');
});

test('enemy moves when all chess.js legal moves are filtered out by check constraints', () => {
  // Black king is "checkmated" by chess.js rules but can still geometrically move.
  // White controls d7, e7, f7, d8, f8 - chess.js would say no legal moves for black king.
  // The enemy must still make a move (our game has no check rule).
  const state = freshGame();
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'q', color: 'w' }, 'a8'); // covers d8, f8 via queen diagonal not needed
  state._chess.put({ type: 'r', color: 'w' }, 'h7'); // covers all of rank 7
  state._chess.put({ type: 'r', color: 'w' }, 'h6'); // covers all of rank 6
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  const boardBefore = JSON.stringify(state.toDict().board);
  state.endTurn();
  expect(JSON.stringify(state.toDict().board)).not.toBe(boardBefore);
});
