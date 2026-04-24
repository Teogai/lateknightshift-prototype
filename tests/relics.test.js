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

describe('relic room type', () => {
  it('exists in ROOM_META', () => {
    expect(ROOM_META.relic).toBeDefined();
    expect(ROOM_META.relic.label).toBe('Relic');
  });

  it('has RELIC_REWARD_CHOICES constant', () => {
    expect(RELIC_REWARD_CHOICES).toBe(3);
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

  it('confirm button is disabled until selection', () => {
    document.body.innerHTML = '<div id="screen-room"><div id="room-content"></div></div>';
    const runState = { relics: [], addRelic(r) { this.relics.push(r); } };
    renderRelicRewardScreen(runState, () => {});
    const content = document.getElementById('room-content');
    const confirmBtn = content.querySelector('.confirm-btn');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn.disabled).toBe(true);
  });

  it('clicking relic selects it and enables confirm', () => {
    document.body.innerHTML = '<div id="screen-room"><div id="room-content"></div></div>';
    const runState = { relics: [], addRelic(r) { this.relics.push(r); } };
    renderRelicRewardScreen(runState, () => {});
    const content = document.getElementById('room-content');
    const choices = content.querySelectorAll('.relic-choice');
    choices[0].click();
    expect(choices[0].classList.contains('selected')).toBe(true);
    const confirmBtn = content.querySelector('.confirm-btn');
    expect(confirmBtn.disabled).toBe(false);
  });

  it('confirm applies relic and calls onDone', () => {
    document.body.innerHTML = '<div id="screen-room"><div id="room-content"></div></div>';
    const runState = { relics: [], addRelic(r) { this.relics.push(r); } };
    let doneCalled = false;
    renderRelicRewardScreen(runState, () => { doneCalled = true; });
    const content = document.getElementById('room-content');
    const choices = content.querySelectorAll('.relic-choice');
    choices[0].click();
    const confirmBtn = content.querySelector('.confirm-btn');
    confirmBtn.click();
    expect(runState.relics.length).toBe(1);
    expect(doneCalled).toBe(true);
  });

  it('reroll button regenerates choices', () => {
    document.body.innerHTML = '<div id="screen-room"><div id="room-content"></div></div>';
    const runState = { relics: [], addRelic(r) { this.relics.push(r); } };
    let rerollCount = 0;
    renderRelicRewardScreen(runState, () => {}, () => { rerollCount++; });
    const content = document.getElementById('room-content');
    const rerollBtn = content.querySelector('.debug-btn');
    expect(rerollBtn).not.toBeNull();
    expect(rerollBtn.textContent).toBe('Reroll');
    rerollBtn.click();
    expect(rerollCount).toBe(1);
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

  it('shows custom tooltip on hover', () => {
    document.body.innerHTML = '<div id="relic-bar"></div>';
    const runState = { relics: [{ id: 'slammer', name: 'Slammer', desc: 'Push destroys blocked pieces' }] };
    renderRelicBar(runState);
    const bar = document.getElementById('relic-bar');
    const item = bar.querySelector('.relic-bar-item');
    item.dispatchEvent(new Event('mouseenter'));
    const tooltip = document.querySelector('.keyword-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip.style.display).toBe('block');
    expect(tooltip.textContent).toContain('Push destroys blocked pieces');
    item.dispatchEvent(new Event('mouseleave'));
    expect(tooltip.style.display).toBe('none');
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

import { GameState } from '../js/battle_state.js';

describe('Duck Handler relic', () => {
  it('allows moving duck with normal move card', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', name: 'Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    const result = gs.playMoveCard(0, 'e4', 'e5');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it('duck moves like king but cannot capture', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.board[3][4] = makePiece('pawn', 'enemy');
    gs._state.hand = [{ type: 'move', name: 'Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    const result = gs.playMoveCard(0, 'e4', 'e5');
    expect(result.error).toBe('not a legal destination');
  });

  it('allows moving duck with knight move card', () => {
    const gs = new GameState('knight');
    // Clear the board to avoid blocking pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        gs._state.board[r][c] = null;
      }
    }
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'knight', name: 'Knight Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // L-shape knight move from e4 to f6
    const result = gs.playKnightMoveCard(0, 'e4', 'f6');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['f6']?.type).toBe('duck');
  });

  it('allows moving duck with move_together card first move', () => {
    const gs = new GameState('knight');
    // Place a player knight on e4 and a duck on d4
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.board[4][3] = makePiece('knight', 'player');
    gs._state.hand = [{ type: 'move', moveVariant: 'move_together', name: 'Move Together' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // Move duck from e4 to e5 as first move of move_together
    const result = gs.playMoveTogetherFirst(0, 'e4', 'e5');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs._moveTogetherFirstPieceSq).toBe('e5');
  });

  // Duck Handler pattern-aware tests
  it('duck moves in knight pattern with knight move card', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'knight', name: 'Knight Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // e4 to f6 is an L-shape knight move
    const result = gs.playKnightMoveCard(0, 'e4', 'f6');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['f6']?.type).toBe('duck');
  });

  it('duck cannot capture with knight move card', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.board[2][5] = makePiece('pawn', 'enemy');
    gs._state.hand = [{ type: 'move', moveVariant: 'knight', name: 'Knight Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // f6 is occupied by enemy pawn, duck cannot capture
    const result = gs.playKnightMoveCard(0, 'e4', 'f6');
    expect(result.error).toBe('not a legal destination');
  });

  it('duck moves diagonally with bishop move card', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'bishop', name: 'Bishop Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // e4 to g6 is diagonal
    const result = gs.playBishopMoveCard(0, 'e4', 'g6');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['g6']?.type).toBe('duck');
  });

  it('duck moves orthogonally with rook move card', () => {
    const gs = new GameState('knight');
    // Clear the board to avoid blocking pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        gs._state.board[r][c] = null;
      }
    }
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'rook', name: 'Rook Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // e4 to a4 is orthogonal
    const result = gs.playRookMoveCard(0, 'e4', 'a4');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['a4']?.type).toBe('duck');
  });

  it('duck moves in queen pattern with queen move card', () => {
    const gs = new GameState('knight');
    // Clear the board to avoid blocking pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        gs._state.board[r][c] = null;
      }
    }
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'queen', name: 'Queen Move' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // e4 to h4 is straight (queen can do this)
    const result = gs.playQueenMoveCard(0, 'e4', 'h4');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['h4']?.type).toBe('duck');
  });

  it('duck teleports to any empty square with teleport card', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'teleport', name: 'Teleport' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // e4 to a8 (far away empty square)
    const result = gs.playTeleportCard(0, 'e4', 'a8');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['a8']?.type).toBe('duck');
  });

  it('duck can swap with friendly piece using swap card', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.board[3][3] = makePiece('knight', 'player');
    gs._state.hand = [{ type: 'move', moveVariant: 'swap', name: 'Swap' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // Swap duck at e4 with knight at d5
    const result = gs.playSwapMoveCard(0, 'e4', 'd5');
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(gs.toDict().board['d5']?.type).toBe('duck');
    expect(gs.toDict().board['e4']?.type).toBe('knight');
  });

  it('duck blitz gets two king moves with Duck Handler', () => {
    const gs = new GameState('knight');
    gs._state.board[4][4] = makePiece('duck', 'neutral');
    gs._state.hand = [{ type: 'move', moveVariant: 'blitz', name: 'Blitz' }];
    gs.runState = { relics: [{ id: 'duck_handler' }] };
    // First king move: e4 to e5
    const result1 = gs.playBlitzFirstMove(0, 'e4', 'e5');
    expect(result1.error).toBeUndefined();
    expect(result1.ok).toBe(true);
    expect(gs.toDict().board['e5']?.type).toBe('duck');
    // Second king move: e5 to e6
    const result2 = gs.playBlitzSecondMove('e6');
    expect(result2.error).toBeUndefined();
    expect(result2.ok).toBe(true);
    expect(gs.toDict().board['e6']?.type).toBe('duck');
  });
});
