import { describe, it, expect } from 'vitest';
import { RELIC_DEFS } from '../config/relics.js';
import { RELIC_CATALOG, pickRelicChoices } from '../js/relics.js';
import { ROOM_META } from '../config/path.js';
import { RELIC_REWARD_CHOICES } from '../config/game.js';

describe('relic data model', () => {
  it('has at least 2 relics defined', () => {
    expect(Object.keys(RELIC_DEFS).length).toBeGreaterThanOrEqual(2);
  });

  it('catalog matches defs', () => {
    expect(RELIC_CATALOG.length).toBe(Object.keys(RELIC_DEFS).length);
  });
});

describe('pickRelicChoices', () => {
  it('excludes already-owned relics', () => {
    const runState = { relics: [{ id: 'slammer' }] };
    const choices = pickRelicChoices(3, runState);
    expect(choices.every(c => c.id !== 'slammer')).toBe(true);
  });

  it('returns empty when all relics owned', () => {
    const allRelics = RELIC_CATALOG.map(r => ({ id: r.id }));
    const runState = { relics: allRelics };
    const choices = pickRelicChoices(3, runState);
    expect(choices.length).toBe(0);
  });
});

describe('relic room type', () => {
  it('exists in ROOM_META', () => {
    expect(ROOM_META.relic).toBeDefined();
    expect(ROOM_META.relic.label).toBe('Relic');
  });

  it('has RELIC_REWARD_CHOICES constant', () => {
    expect(RELIC_REWARD_CHOICES).toBe(3);
  });
});

import { renderRelicRewardScreen } from '../js/rewards.js';

describe('relic reward screen', () => {
  it('renders without error', () => {
    document.body.innerHTML = '<div id="screen-room"><div id="room-content"></div></div>';
    const runState = { relics: [], addRelic(r) { this.relics.push(r); } };
    expect(() => renderRelicRewardScreen(runState, () => {})).not.toThrow();
    const content = document.getElementById('room-content');
    expect(content.querySelectorAll('.relic-choice').length).toBeGreaterThan(0);
  });
});

import { renderRelicBar } from '../js/ui.js';

describe('relic bar', () => {
  it('renders owned relics', () => {
    document.body.innerHTML = '<div id="relic-bar"></div>';
    const runState = { relics: [{ id: 'slammer', name: 'Slammer' }] };
    renderRelicBar(runState);
    const bar = document.getElementById('relic-bar');
    expect(bar.textContent).toContain('Slammer');
  });
});

import { makePiece } from '../js/engine2/pieces.js';
import { set, get, sqToRC } from '../js/engine2/board.js';
import { resolvePush } from '../js/battle_state.js';

describe('Slammer relic', () => {
  function createEmptyBoard() {
    return Array.from({ length: 8 }, () => Array(8).fill(null));
  }

  it('destroys pushed piece when blocked by edge', () => {
    const board = createEmptyBoard();
    const [r, c] = sqToRC('e8');
    board[r][c] = makePiece('rook', 'black');
    const runState = { relics: [{ id: 'slammer' }] };
    // Push from e7 - piece at e8 is pushed north off board
    resolvePush(board, 'e7', runState);
    expect(board[r][c]).toBeNull();
  });

  it('destroys pushed piece when blocked by another piece', () => {
    const board = createEmptyBoard();
    const [r7, c7] = sqToRC('e7');
    const [r8, c8] = sqToRC('e8');
    board[r7][c7] = makePiece('pawn', 'black');
    board[r8][c8] = makePiece('rook', 'black');
    const runState = { relics: [{ id: 'slammer' }] };
    // Push from e6 - piece at e7 is pushed north into e8 (occupied)
    resolvePush(board, 'e6', runState);
    expect(board[r7][c7]).toBeNull();
    expect(board[r8][c8]).not.toBeNull();
  });

  it('shield blocks slammer destruction', () => {
    const board = createEmptyBoard();
    const [r, c] = sqToRC('e8');
    const piece = makePiece('rook', 'black');
    piece.tags.add('shielded');
    board[r][c] = piece;
    const runState = { relics: [{ id: 'slammer' }] };
    resolvePush(board, 'e7', runState);
    expect(board[r][c]).not.toBeNull();
    expect(board[r][c].tags.has('shielded')).toBe(false);
  });

  it('does not destroy without slammer relic', () => {
    const board = createEmptyBoard();
    const [r, c] = sqToRC('e8');
    board[r][c] = makePiece('rook', 'black');
    // No runState / no slammer
    resolvePush(board, 'e7');
    expect(board[r][c]).not.toBeNull();
  });
});
