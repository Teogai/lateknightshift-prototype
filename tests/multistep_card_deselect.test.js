import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ui from '../js/ui.js';

describe('multi-step card deselect bug', () => {
  beforeEach(() => {
    // Minimal DOM for ui.js
    const app = document.createElement('div');
    app.id = 'app';

    const actionHint = document.createElement('div');
    actionHint.id = 'action-hint';

    const board = document.createElement('div');
    board.id = 'board';

    const hand = document.createElement('div');
    hand.id = 'hand';

    const statusBar = document.createElement('div');
    statusBar.id = 'status-bar';

    const btnDeck = document.createElement('button');
    btnDeck.id = 'btn-deck';

    const btnDiscard = document.createElement('button');
    btnDiscard.id = 'btn-discard';

    const btnRedraw = document.createElement('button');
    btnRedraw.id = 'btn-redraw';

    const redrawCountdown = document.createElement('span');
    redrawCountdown.id = 'redraw-countdown';

    const selectError = document.createElement('div');
    selectError.id = 'select-error';

    const screenGame = document.createElement('div');
    screenGame.id = 'screen-game';

    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    screenGame.appendChild(sidebar);

    const pileModal = document.createElement('div');
    pileModal.id = 'pile-modal';
    pileModal.className = 'hidden';

    const pileTitle = document.createElement('div');
    pileTitle.id = 'pile-title';

    const pileGrid = document.createElement('div');
    pileGrid.id = 'pile-grid';

    const pileClose = document.createElement('button');
    pileClose.id = 'pile-close';

    pileModal.appendChild(pileTitle);
    pileModal.appendChild(pileGrid);
    pileModal.appendChild(pileClose);

    app.appendChild(actionHint);
    app.appendChild(board);
    app.appendChild(hand);
    app.appendChild(statusBar);
    app.appendChild(btnDeck);
    app.appendChild(btnDiscard);
    app.appendChild(btnRedraw);
    app.appendChild(redrawCountdown);
    app.appendChild(selectError);
    app.appendChild(screenGame);
    app.appendChild(pileModal);
    document.body.appendChild(app);

    // Start game and enter battle to create gameState
    ui.startGame('knight');
    ui.runState.deck = [
      { type: 'move', moveVariant: 'move_together', name: 'Move Together' },
      { type: 'move', moveVariant: 'blitz', name: 'Blitz' },
    ];
    ui.runState.phase = 'battle';
    ui.runState.pendingNode = { type: 'regular', label: 'Battle', icon: '' };
    ui.handleNodeChosen(0);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    ui.resetUiState();
  });

  test('clicking same card during move_together_second_piece should not deselect', () => {
    const spy = vi.spyOn(ui, 'resetUiState');
    ui.uiState.phase = 'move_together_second_piece';
    ui.uiState.selectedCardIndex = 0;

    const card = { type: 'move', moveVariant: 'move_together' };
    ui.handleCardClick(0, card);

    expect(spy).not.toHaveBeenCalled();
    expect(ui.uiState.phase).not.toBe('idle');
    expect(ui.uiState.phase).toBe('move_together_second_piece');
    expect(document.getElementById('action-hint').textContent).toBe('Complete current card first');
    spy.mockRestore();
  });

  test('clicking same card during blitz_second_selected should not deselect', () => {
    const spy = vi.spyOn(ui, 'resetUiState');
    ui.uiState.phase = 'blitz_second_selected';
    ui.uiState.selectedCardIndex = 1;

    const card = { type: 'move', moveVariant: 'blitz' };
    ui.handleCardClick(1, card);

    expect(spy).not.toHaveBeenCalled();
    expect(ui.uiState.phase).not.toBe('idle');
    expect(ui.uiState.phase).toBe('blitz_second_selected');
    expect(document.getElementById('action-hint').textContent).toBe('Complete current card first');
    spy.mockRestore();
  });

  test('clicking same card during move_together_first_selected should not deselect', () => {
    const spy = vi.spyOn(ui, 'resetUiState');
    ui.uiState.phase = 'move_together_first_selected';
    ui.uiState.selectedCardIndex = 0;

    const card = { type: 'move', moveVariant: 'move_together' };
    ui.handleCardClick(0, card);

    expect(spy).not.toHaveBeenCalled();
    expect(ui.uiState.phase).not.toBe('idle');
    expect(ui.uiState.phase).toBe('move_together_first_selected');
    spy.mockRestore();
  });

  test('clicking same card during blitz_first_selected should not deselect', () => {
    const spy = vi.spyOn(ui, 'resetUiState');
    ui.uiState.phase = 'blitz_first_selected';
    ui.uiState.selectedCardIndex = 1;

    const card = { type: 'move', moveVariant: 'blitz' };
    ui.handleCardClick(1, card);

    expect(spy).not.toHaveBeenCalled();
    expect(ui.uiState.phase).not.toBe('idle');
    expect(ui.uiState.phase).toBe('blitz_first_selected');
    spy.mockRestore();
  });
});
