import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';

function freshGame() {
  return new GameState('knight');
}

// --- Move card ---

test('move card moves a piece', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const result = state.playMoveCard(0, 'b1', 'a3');
  expect(result.ok).toBe(true);
  const d = state.toDict();
  expect(d.board['a3']).toBeDefined();
  expect(d.board['a3'].type).toBe('knight');
});

test('illegal move is rejected', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.mana = 3;
  // Rook on a1, blocked by pawn on a2 — can't reach a8
  const result = state.playMoveCard(0, 'a1', 'a8');
  expect(result.error).toBeDefined();
});

test('move card plays regardless of card cost (no mana system)', () => {
  const state = freshGame();
  state.hand = [{ name: 'Move', type: 'move', cost: 9 }]; // arbitrarily high cost
  const result = state.playMoveCard(0, 'b1', 'a3');
  expect(result.ok).toBe(true);
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

test('summoned piece can move next turn (no same-turn restriction)', () => {
  // Wildfrost: 1 card/turn; auto-turn runs after summon so next player turn starts fresh
  const state = new GameState('knight');
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'k', color: 'b' }, 'h8');
  state.hand = [{ name: 'Summon Pawn', type: 'summon', piece: 'pawn', cost: 1 }];
  state.mana = 3;
  state.playSummonCard(0, 'pawn', 'c2');
  // Now it's a new player turn — summonedThisTurn is cleared
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const result = state.playMoveCard(0, 'c2', 'c3');
  expect(result.ok).toBe(true);
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

test('end turn decrements redraw countdown', () => {
  const state = freshGame();
  const before = state.toDict().redraw_countdown;
  state.endTurn();
  expect(state.toDict().redraw_countdown).toBe(before - 1);
});

test('hand persists after end turn (no auto-refill)', () => {
  const state = freshGame();
  const handBefore = state.toDict().hand.slice();
  state.endTurn();
  const handAfter = state.toDict().hand;
  expect(handAfter).toHaveLength(handBefore.length);
  expect(handAfter.map(c => c.name)).toEqual(handBefore.map(c => c.name));
});

test('redrawHand replaces hand with new cards', () => {
  const state = freshGame();
  const firstCard = state.hand[0].name;
  state.redrawCountdown = 0; // free redraw so we can observe hand without enemy-move side effects
  state.redrawHand();
  expect(state.hand).toHaveLength(6);
  // After a full reshuffle the hand is re-dealt — it will be a different sequence
  // (at minimum the card order changes because we discard then reshuffle)
  expect(state.deck.length + state.hand.length + state.discard.length).toBe(10);
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
