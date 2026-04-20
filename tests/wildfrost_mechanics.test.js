import { test, expect } from 'vitest';
import { GameState } from '../js/engine.js';

function freshGame() {
  return new GameState('knight');
}

// Minimal board: white king + rook, black king + pawn (enemy always has something to move)
function makeTestBoard(state) {
  state._chess.clear();
  state._chess.put({ type: 'k', color: 'w' }, 'e1');
  state._chess.put({ type: 'r', color: 'w' }, 'a1');
  state._chess.put({ type: 'k', color: 'b' }, 'e8');
  state._chess.put({ type: 'p', color: 'b' }, 'e7');
}

// --- Group 1: Initial state ---

test('new game deals 6 cards', () => {
  expect(freshGame().hand).toHaveLength(6);
});

test('new game has redrawCountdown of 4', () => {
  expect(freshGame().redrawCountdown).toBe(4);
});

test('toDict exposes redraw_countdown', () => {
  expect(freshGame().toDict().redraw_countdown).toBe(4);
});

test('toDict does not include mana', () => {
  expect(freshGame().toDict().mana).toBeUndefined();
});

// --- Group 2: Card play auto-ends turn ---

test('playing a move card auto-ends the player turn', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const boardBefore = JSON.stringify(state.toDict().board);
  const result = state.playMoveCard(0, 'a1', 'a5');
  expect(result.ok).toBe(true);
  expect(state.toDict().turn).toBe('player');
  expect(JSON.stringify(state.toDict().board)).not.toBe(boardBefore);
});

test('playing a summon card auto-ends the player turn', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.hand = [{ name: 'Summon Pawn', type: 'summon', piece: 'pawn', cost: 1 }];
  const boardBefore = JSON.stringify(state.toDict().board);
  const result = state.playSummonCard(0, 'pawn', 'c2');
  expect(result.ok).toBe(true);
  expect(state.toDict().turn).toBe('player');
  expect(JSON.stringify(state.toDict().board)).not.toBe(boardBefore);
});

test('playing a knight_move card auto-ends the player turn', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.hand = [{ name: 'Knight Move', type: 'move', moveVariant: 'knight', cost: 2 }];
  const boardBefore = JSON.stringify(state.toDict().board);
  const result = state.playKnightMoveCard(0, 'a1', 'b3');
  expect(result.ok).toBe(true);
  expect(state.toDict().turn).toBe('player');
  expect(JSON.stringify(state.toDict().board)).not.toBe(boardBefore);
});

// --- Group 3: Countdown decrements ---

test('redrawCountdown decrements after playing a card', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  expect(state.redrawCountdown).toBe(4);
  state.playMoveCard(0, 'a1', 'a5');
  // Manually trigger enemy turn sequence which decrements countdown
  const seq = state.executeEnemyTurnSequence();
  for (const move of seq.remainingMoves) {
    state.executeNextEnemyMove(move);
  }
  state.finishEnemyTurnSequence(seq.warnNext);
  expect(state.redrawCountdown).toBe(3);
});

test('redrawCountdown reaches 0 after 4 turn ends', () => {
  const state = freshGame();
  expect(state.redrawCountdown).toBe(4);
  for (let i = 0; i < 4; i++) state.endTurn();
  expect(state.redrawCountdown).toBe(0);
});

test('redrawCountdown does not go below 0', () => {
  const state = freshGame();
  for (let i = 0; i < 6; i++) state.endTurn();
  expect(state.redrawCountdown).toBe(0);
});

// --- Group 4: Hand persistence ---

test('unplayed cards remain in hand after turn ends', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.hand = [
    { name: 'Move', type: 'move', cost: 1 },
    { name: 'Move', type: 'move', cost: 1 },
    { name: 'Move', type: 'move', cost: 1 },
  ];
  state.playMoveCard(0, 'a1', 'a5');
  expect(state.hand).toHaveLength(2);
});

test('hand is not auto-refilled after turn ends', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.playMoveCard(0, 'a1', 'a5');
  expect(state.hand).toHaveLength(0);
});

// --- Group 5: redrawHand costly (countdown > 0) ---

test('redrawHand with countdown > 0 replaces hand with 6 new cards', () => {
  const state = freshGame();
  state.redrawCountdown = 3;
  state.redrawHand();
  expect(state.hand).toHaveLength(6);
});

test('redrawHand with countdown > 0 ends the turn (enemy moves)', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.redrawCountdown = 2;
  const boardBefore = JSON.stringify(state.toDict().board);
  state.redrawHand();
  expect(JSON.stringify(state.toDict().board)).not.toBe(boardBefore);
  expect(state.toDict().turn).toBe('player');
});

test('redrawHand with countdown > 0 decrements countdown', () => {
  const state = freshGame();
  state.redrawCountdown = 3;
  state.redrawHand();
  expect(state.redrawCountdown).toBe(2);
});

test('redrawHand returns free: false when countdown > 0', () => {
  const state = freshGame();
  state.redrawCountdown = 2;
  const result = state.redrawHand();
  expect(result.ok).toBe(true);
  expect(result.free).toBe(false);
});

// --- Group 6: redrawHand free (countdown === 0) ---

test('redrawHand with countdown 0 does not end the turn', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.redrawCountdown = 0;
  const boardBefore = JSON.stringify(state.toDict().board);
  state.redrawHand();
  expect(JSON.stringify(state.toDict().board)).toBe(boardBefore);
  expect(state.toDict().turn).toBe('player');
});

test('redrawHand with countdown 0 resets countdown to 4', () => {
  const state = freshGame();
  state.redrawCountdown = 0;
  state.redrawHand();
  expect(state.redrawCountdown).toBe(4);
});

test('redrawHand with countdown 0 replaces hand with 6 cards', () => {
  const state = freshGame();
  state.redrawCountdown = 0;
  state.redrawHand();
  expect(state.hand).toHaveLength(6);
});

test('redrawHand returns free: true when countdown is 0', () => {
  const state = freshGame();
  state.redrawCountdown = 0;
  const result = state.redrawHand();
  expect(result.ok).toBe(true);
  expect(result.free).toBe(true);
});

test('after free redraw player can still play a card', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.redrawCountdown = 0;
  state.redrawHand();
  expect(state.toDict().turn).toBe('player');
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  const result = state.playMoveCard(0, 'a1', 'a5');
  expect(result.ok).toBe(true);
});

test('playing a card after free redraw decrements countdown from 4', () => {
  const state = freshGame();
  makeTestBoard(state);
  state.redrawCountdown = 0;
  state.redrawHand(); // free, resets to 4
  state.hand = [{ name: 'Move', type: 'move', cost: 1 }];
  state.playMoveCard(0, 'a1', 'a5');
  // Before enemy turn sequence, countdown is still 4
  expect(state.redrawCountdown).toBe(4);
  // Manually trigger enemy turn sequence which decrements countdown
  const seq = state.executeEnemyTurnSequence();
  for (const move of seq.remainingMoves) {
    state.executeNextEnemyMove(move);
  }
  state.finishEnemyTurnSequence(seq.warnNext);
  // After enemy turn finishes, countdown should decrement to 3
  expect(state.redrawCountdown).toBe(3);
});

// --- Group 7: Deck exhaustion ---

test('redrawHand with only 3 cards in deck+discard gives hand of 3', () => {
  const state = freshGame();
  state.deck = [
    { name: 'Move', type: 'move', cost: 1 },
    { name: 'Move', type: 'move', cost: 1 },
    { name: 'Move', type: 'move', cost: 1 },
  ];
  state.discard = [];
  state.hand = [];
  state.redrawCountdown = 0; // free redraw to skip enemy-turn side effects
  state.redrawHand();
  expect(state.hand).toHaveLength(3);
});
