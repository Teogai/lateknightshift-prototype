/**
 * tests/engine2/view.test.js
 * P12 — View / fog-of-war seam
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../js/engine2/state.js';
import { getView } from '../../js/engine2/view.js';

function makeStateWithPiece() {
  const state = new GameState();
  // Place a piece directly so we don't need full action system
  state.board[0][0] = { type: 'K', owner: 'player', tags: new Set(['royal']), data: { hp: 3 }, id: 'k1' };
  state.board[7][7] = { type: 'k', owner: 'enemy', tags: new Set(), data: {}, id: 'ek1' };
  state.turn = 'player';
  state.enPassant = 'e3';
  state.castling = { wK: false, wQ: true, bK: true, bQ: false };
  return state;
}

describe('getView', () => {
  let state;

  beforeEach(() => {
    state = makeStateWithPiece();
  });

  it('view structurally matches state for all-visible case', () => {
    const view = getView(state, 'player');

    // Same board dimensions
    expect(view.board).toHaveLength(8);
    for (let r = 0; r < 8; r++) {
      expect(view.board[r]).toHaveLength(8);
    }

    // Piece types match where pieces exist
    expect(view.board[0][0].type).toBe('K');
    expect(view.board[0][0].owner).toBe('player');
    expect(view.board[7][7].type).toBe('k');
    expect(view.board[7][7].owner).toBe('enemy');

    // Null squares preserved
    expect(view.board[3][3]).toBeNull();

    // Turn, enPassant, castling carried through
    expect(view.turn).toBe(state.turn);
    expect(view.enPassant).toBe(state.enPassant);
    expect(view.castling).toEqual(state.castling);

    // tiles carried through
    expect(view.tiles).toHaveLength(8);
  });

  it('mutations to view board do not affect state board', () => {
    const view = getView(state, 'player');

    // Replace a cell in the view board
    view.board[0][0] = null;

    // State board must be unaffected
    expect(state.board[0][0]).not.toBeNull();
    expect(state.board[0][0].type).toBe('K');
  });

  it('mutations to view pieces do not affect state pieces', () => {
    const view = getView(state, 'player');

    // Mutate a property on the view piece
    view.board[0][0].type = 'Q';
    view.board[0][0].data.hp = 999;

    // State piece must be unaffected
    expect(state.board[0][0].type).toBe('K');
    expect(state.board[0][0].data.hp).toBe(3);
  });

  it('perspective parameter is accepted and stored on the view without error', () => {
    const viewPlayer = getView(state, 'player');
    const viewEnemy = getView(state, 'enemy');

    expect(viewPlayer.perspective).toBe('player');
    expect(viewEnemy.perspective).toBe('enemy');
  });
});
