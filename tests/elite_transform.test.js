import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RunState } from '../js/run.js';
import * as ui from '../js/ui.js';
import { pickCharmChoices, pickTransformCard, applyCharmToCard, renderTransformScreen, renderCharmApplyScreen } from '../js/rewards.js';
import { CHARM_CATALOG } from '../js/charms.js';
import { CARD_CATALOG, curseCard } from '../js/cards2/move_cards.js';

describe('elite charm reward', () => {
  beforeEach(() => {
    const app = document.createElement('div');
    app.id = 'app';

    const selectError = document.createElement('div');
    selectError.id = 'select-error';

    // Victory screen
    const screenVictory = document.createElement('div');
    screenVictory.id = 'screen-victory';
    screenVictory.className = 'hidden';
    const victoryMessage = document.createElement('p');
    victoryMessage.id = 'victory-message';
    const btnContinue = document.createElement('button');
    btnContinue.id = 'btn-victory-continue';
    screenVictory.appendChild(victoryMessage);
    screenVictory.appendChild(btnContinue);

    // Room screen
    const screenRoom = document.createElement('div');
    screenRoom.id = 'screen-room';
    screenRoom.className = 'hidden';
    const roomContent = document.createElement('div');
    roomContent.id = 'room-content';
    screenRoom.appendChild(roomContent);

    // Map screen
    const screenMap = document.createElement('div');
    screenMap.id = 'screen-map';
    screenMap.className = 'hidden';

    app.appendChild(selectError);
    app.appendChild(screenVictory);
    app.appendChild(screenRoom);
    app.appendChild(screenMap);
    document.body.appendChild(app);

    vi.spyOn(ui, 'showScreen').mockImplementation((id) => {
      ['screen-victory', 'screen-room', 'screen-map'].forEach(sid => {
        const el = document.getElementById(sid);
        if (el) {
          if (sid === id) el.classList.remove('hidden');
          else el.classList.add('hidden');
        }
      });
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  test('pickCharmChoices returns valid choices from catalog', () => {
    const choices = pickCharmChoices(3);
    expect(choices.length).toBeGreaterThan(0);
    expect(choices.length).toBeLessThanOrEqual(CHARM_CATALOG.length);
    choices.forEach(({ charm, rarity }) => {
      expect(charm.name).toBeDefined();
      expect(charm.desc).toBeDefined();
      expect(['common', 'uncommon', 'rare']).toContain(rarity);
    });
  });

  test('elite battle victory shows charm reward screen', () => {
    ui.startGame('knight');

    // Simulate entering elite room
    const eliteNode = { type: 'elite', enemyKey: 'duelist', label: 'Duelist', icon: '' };
    ui.runState.enterRoom(0);
    ui.runState.pendingNode = eliteNode;

    // Simulate battle won
    ui.handleBattleWon();

    // Victory screen should be visible
    expect(document.getElementById('screen-victory').classList.contains('hidden')).toBe(false);

    // Click continue
    const btnContinue = document.getElementById('btn-victory-continue');
    expect(() => btnContinue.click()).not.toThrow();

    // Room screen should be visible
    expect(document.getElementById('screen-room').classList.contains('hidden')).toBe(false);

    // Should show charm choices
    const roomContent = document.getElementById('room-content');
    const charmBtns = roomContent.querySelectorAll('.charm-reward-btn');
    expect(charmBtns.length).toBeGreaterThan(0);
  });
});

describe('transform room', () => {
  beforeEach(() => {
    const app = document.createElement('div');
    app.id = 'app';

    const selectError = document.createElement('div');
    selectError.id = 'select-error';

    const screenRoom = document.createElement('div');
    screenRoom.id = 'screen-room';
    screenRoom.className = 'hidden';
    const roomContent = document.createElement('div');
    roomContent.id = 'room-content';
    screenRoom.appendChild(roomContent);

    app.appendChild(selectError);
    app.appendChild(screenRoom);
    document.body.appendChild(app);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('pickTransformCard for piece card returns different piece', () => {
    const oldCard = { type: 'piece', piece: 'pawn', name: 'Pawn' };
    const newCard = pickTransformCard(oldCard, 'knight');
    expect(newCard).toBeDefined();
    expect(newCard.type).toBe('piece');
    expect(newCard.piece).not.toBe('pawn');
  });

  test('pickTransformCard for curse returns different curse', () => {
    const oldCard = curseCard();
    const newCard = pickTransformCard(oldCard, 'knight');
    expect(newCard).toBeDefined();
    expect(newCard.type).toBe('curse');
    expect(newCard.name).not.toBe(oldCard.name);
  });

  test('pickTransformCard for move card returns non-piece non-curse', () => {
    const oldCard = { type: 'move', name: 'Move' };
    const newCard = pickTransformCard(oldCard, 'knight');
    expect(newCard).toBeDefined();
    expect(newCard.type).not.toBe('piece');
    expect(newCard.type).not.toBe('curse');
  });

  test('transform preserves charm if valid for new card', () => {
    const charm = CHARM_CATALOG[0].charm;
    const oldCard = { type: 'move', name: 'Move', charm };
    const newCard = pickTransformCard(oldCard, 'knight');
    const result = applyCharmToCard(newCard, charm);
    if (!result.error) {
      expect(result.charm).toBeDefined();
    }
  });

  test('transform room renders card picker', () => {
    ui.startGame('knight');
    const node = { type: 'transform', label: 'Transform', icon: '' };
    expect(() => ui.handleRoomEntered(node)).not.toThrow();

    const roomContent = document.getElementById('room-content');
    expect(roomContent.querySelector('.card-scroll-grid')).not.toBeNull();
  });

  test('transform screen card click invokes callback when called with 2 args', () => {
    const deck = [{ type: 'move', name: 'Move' }];
    const onChosen = vi.fn();
    // Called from ui.js with only 2 args: (deck, callback)
    renderTransformScreen(deck, onChosen);

    const roomContent = document.getElementById('room-content');
    const cardEl = roomContent.querySelector('.card');
    expect(cardEl).not.toBeNull();
    cardEl.click();
    // Confirm button should now be enabled
    const confirmBtn = roomContent.querySelector('.confirm-btn');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn.disabled).toBe(false);
    confirmBtn.click();
    expect(onChosen).toHaveBeenCalledTimes(1);
    expect(onChosen).toHaveBeenCalledWith(0, deck[0]);
  });

  test('transform screen confirm button is disabled until selection', () => {
    const deck = [{ type: 'move', name: 'Move' }];
    const onChosen = vi.fn();
    renderTransformScreen(deck, onChosen);

    const roomContent = document.getElementById('room-content');
    const confirmBtn = roomContent.querySelector('.confirm-btn');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn.disabled).toBe(true);
    
    // Clicking confirm while disabled should not invoke callback
    confirmBtn.click();
    expect(onChosen).not.toHaveBeenCalled();
  });

  test('charm apply screen only shows valid card types', () => {
    const deck = [
      { type: 'move', name: 'Move' },
      { type: 'piece', name: 'Pawn', piece: 'pawn' },
      { type: 'move', name: 'Knight Move', moveVariant: 'knight' },
    ];
    const charm = { id: 'push', name: 'Push', validCardTypes: ['move'] };
    const onChosen = vi.fn();
    renderCharmApplyScreen(deck, charm, onChosen);

    const roomContent = document.getElementById('room-content');
    const cardEls = roomContent.querySelectorAll('.card');
    expect(cardEls.length).toBe(2); // only move cards
    cardEls.forEach(el => {
      expect(el.classList.contains('invalid-charm-target')).toBe(false);
    });
  });
});
