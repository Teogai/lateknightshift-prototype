/**
 * P11 — Player-facing undo
 *
 * Tests:
 *   1. canUndo() returns false on fresh state.
 *   2. play action → canUndo() true → undo → toJSON equals initial snapshot.
 *   3. undo returns false when stack is empty.
 */
import { describe, test, expect } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { set } from '../../js/engine2/board.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Minimal state with two pieces — a player pawn on e2 and enemy king on e8
 * (enemy king present so resolveAction doesn't hit missing-king edge cases).
 */
function makeMinimalState() {
  const state = new GameState();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      state.board[r][c] = null;
  set(state.board, 'e2', makePiece('pawn', 'player'));
  set(state.board, 'e8', makePiece('king', 'enemy'));
  state.turn = 'player';
  return state;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('P11 player-facing undo', () => {
  test('canUndo() returns false on fresh GameState', () => {
    const state = new GameState();
    expect(state.canUndo()).toBe(false);
  });

  test('play pushes undo stack; undo restores initial toJSON snapshot', () => {
    const state = makeMinimalState();
    const before = JSON.stringify(state.toJSON());

    state.play({ kind: 'move', source: 'e2', targets: ['e4'] });

    expect(state.canUndo()).toBe(true);

    const undid = state.undo();
    expect(undid).toBe(true);

    const after = JSON.stringify(state.toJSON());
    expect(after).toBe(before);
  });

  test('undo returns false when stack is empty', () => {
    const state = makeMinimalState();
    expect(state.undo()).toBe(false);
  });
});
