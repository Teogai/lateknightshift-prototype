import { describe, test, expect } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { makePiece } from '../../js/engine2/pieces.js';
import { set, get } from '../../js/engine2/board.js';
import { snipeCard } from '../../js/cards2/capture_card.js';

function makeState() {
  const state = new GameState();
  // clear board
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state.board[r][c] = null;
  set(state.board, 'e4', makePiece('pawn', 'player', { id: 'sniper' }));
  set(state.board, 'e6', makePiece('pawn', 'enemy',  { id: 'target' }));
  state.turn = 'player';
  return state;
}

describe('snipeCard', () => {
  test('removes enemy at range 2 without moving sniper', () => {
    const state = makeState();
    const card = snipeCard({ range: 2, ownerFilter: 'opponent' });
    const action = card.play(state, 'e4', 'e6');
    expect(action).not.toBeNull();
    state.play(action);
    expect(get(state.board, 'e4').id).toBe('sniper'); // sniper did not move
    expect(get(state.board, 'e6')).toBeNull();        // target removed
  });

  test('undo restores captured piece', () => {
    const state = makeState();
    const card = snipeCard({ range: 2, ownerFilter: 'opponent' });
    state.play(card.play(state, 'e4', 'e6'));
    state.undo();
    expect(get(state.board, 'e6').id).toBe('target');
    expect(get(state.board, 'e4').id).toBe('sniper');
  });

  test('cannot target piece with uncapturable tag', () => {
    const state = makeState();
    get(state.board, 'e6').tags.add('uncapturable');
    const card = snipeCard({ range: 2, ownerFilter: 'opponent' });
    const action = card.play(state, 'e4', 'e6');
    expect(action).not.toBeNull(); // card produces action; engine cancels it
    state.play(action); // engine's uncapturable check cancels this
    expect(get(state.board, 'e6')).not.toBeNull(); // target still present
  });

  test('play returns null for own-piece target with ownerFilter opponent', () => {
    const state = makeState();
    set(state.board, 'e6', makePiece('pawn', 'player', { id: 'ally' }));
    const card = snipeCard({ range: 2, ownerFilter: 'opponent' });
    const action = card.play(state, 'e4', 'e6');
    expect(action).toBeNull(); // card rejects own-piece target
    expect(get(state.board, 'e6').id).toBe('ally'); // ally still present
  });

  test('targetGenerator yields in-range opponents only', () => {
    const state = makeState();
    const card = snipeCard({ range: 2, ownerFilter: 'opponent' });
    const targets = [...card.targetGenerator(state, 'e4')];
    expect(targets).toContain('e6');
    // should not yield the sniper itself
    expect(targets).not.toContain('e4');
  });
});
