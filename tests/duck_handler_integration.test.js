import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as ui from '../js/ui.js';

describe('Duck Handler integration - real UI flow', () => {
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
    document.body.appendChild(app);

    ui.startGame('knight');
    ui.runState.relics = [{ id: 'duck_handler' }];
    ui.runState.deck = [{ type: 'move', name: 'Move' }];
    ui.runState.phase = 'battle';
    
    // Force cavalry_charge enemy by setting enemyKey on currentNodes[0]
    // before handleNodeChosen overwrites pendingNode
    ui.runState.currentNodes[0].enemyKey = 'cavalry_charge';
    ui.handleNodeChosen(0);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    ui.resetUiState();
  });

  test('standard move card can select duck with Duck Handler relic', () => {
    const board = ui.gameState.toDict().board;
    let duckSq = null;
    for (const [sq, piece] of Object.entries(board)) {
      if (piece.type === 'duck') {
        duckSq = sq;
        break;
      }
    }
    expect(duckSq).toBeDefined();

    const card = { type: 'move', name: 'Move' };
    ui.handleCardClick(0, card);
    expect(ui.uiState.phase).toBe('card_selected');

    // Click the duck - this should trigger the sqToRC bug
    ui.handleSquareClick(duckSq);

    // Should select the duck and show destinations
    expect(ui.uiState.phase).toBe('from_selected');
    expect(ui.uiState.fromSq).toBe(duckSq);
    expect(ui.uiState.legalDests.length).toBeGreaterThan(0);
  });
});
