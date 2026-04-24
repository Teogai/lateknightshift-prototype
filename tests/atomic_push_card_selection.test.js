import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as ui from '../js/ui.js';

describe('atomic and push card piece selection', () => {
  beforeEach(() => {
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

    ui.startGame('knight');
    ui.runState.deck = [
      { type: 'move', moveVariant: 'atomic', name: 'Atomic Move' },
      { type: 'move', moveVariant: 'push', name: 'Push Move' },
    ];
    ui.runState.phase = 'battle';
    ui.runState.pendingNode = { type: 'regular', label: 'Battle', icon: '' };
    ui.handleNodeChosen(0);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    ui.resetUiState();
  });

  test('atomic card allows selecting friendly piece', () => {
    const card = { type: 'move', moveVariant: 'atomic', name: 'Atomic Move' };
    ui.handleCardClick(0, card);

    expect(ui.uiState.phase).toBe('card_selected');
    expect(ui.uiState.selectedMoveVariant).toBe('atomic');

    ui.handleSquareClick('f1');

    expect(ui.uiState.phase).toBe('from_selected');
    expect(ui.uiState.fromSq).toBe('f1');
    expect(ui.uiState.legalDests.length).toBeGreaterThan(0);
  });

  test('push card allows selecting friendly piece', () => {
    const card = { type: 'move', moveVariant: 'push', name: 'Push Move' };
    ui.handleCardClick(1, card);

    expect(ui.uiState.phase).toBe('card_selected');
    expect(ui.uiState.selectedMoveVariant).toBe('push');

    ui.handleSquareClick('f1');

    expect(ui.uiState.phase).toBe('from_selected');
    expect(ui.uiState.fromSq).toBe('f1');
    expect(ui.uiState.legalDests.length).toBeGreaterThan(0);
  });
});
