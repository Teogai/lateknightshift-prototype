import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { RunState } from '../js/run.js';
import * as ui from '../js/ui.js';
import { renderPieceRewardScreen } from '../js/rewards.js';

describe('event reward board ui', () => {
  beforeEach(() => {
    // Minimal DOM for ui.js
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
    
    const screenMap = document.createElement('div');
    screenMap.id = 'screen-map';
    screenMap.className = 'hidden';
    
    const pathTrack = document.createElement('div');
    pathTrack.id = 'path-track';
    screenMap.appendChild(pathTrack);
    
    app.appendChild(selectError);
    app.appendChild(screenRoom);
    app.appendChild(screenMap);
    document.body.appendChild(app);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('placing a piece in event room renders board without error', () => {
    // Initialize runState via startGame
    ui.startGame('knight');
    
    // Add a piece card to the deck
    ui.runState.deck.push({ type: 'piece', piece: 'rook', name: 'Place Rook' });

    const node = { type: 'event', label: 'Event', icon: '' };
    
    // This should not throw ReferenceError: CHARACTER_PIECES is not defined
    expect(() => ui.handleRoomEntered(node)).not.toThrow();
    
    const roomContent = document.getElementById('room-content');
    
    // Should render the card grid first
    expect(roomContent.querySelector('.card-scroll-grid')).not.toBeNull();
    
    // Select the card
    const cardBtn = roomContent.querySelector('.card-scroll-grid > *');
    expect(cardBtn).not.toBeNull();
    cardBtn.click();
    
    // Click confirm to trigger square picker
    const confirmBtn = roomContent.querySelector('.confirm-btn');
    expect(confirmBtn).not.toBeNull();
    confirmBtn.click();
    
    // Should render placement board
    const board = roomContent.querySelector('.placement-board');
    expect(board).not.toBeNull();
    
    // Should have 64 squares
    expect(board.querySelectorAll('.sq').length).toBe(64);
  });

  test('all starting piece images render correctly on event placement board', () => {
    ui.startGame('knight');
    ui.runState.deck.push({ type: 'piece', piece: 'rook', name: 'Place Rook' });

    const node = { type: 'event', label: 'Event', icon: '' };
    ui.handleRoomEntered(node);

    const roomContent = document.getElementById('room-content');
    const cardBtn = roomContent.querySelector('.card-scroll-grid > *');
    cardBtn.click();
    const confirmBtn = roomContent.querySelector('.confirm-btn');
    confirmBtn.click();

    const board = roomContent.querySelector('.placement-board');
    const images = board.querySelectorAll('img');

    // Knight character starts with: king (e1), rook (d1), knight (f1), 3 pawns (d2,e2,f2)
    expect(images.length).toBe(6);

    // Board iterates rank 8→1, file a→h. Knight pieces at: d2,e2,f2 (pawns), d1,e1,f1 (rook,king,knight)
    // DOM order: d2(pawn), e2(pawn), f2(pawn), d1(rook), e1(king), f1(knight)
    const expectedSrcs = [
      'Chess_plt60', // d2 pawn
      'Chess_plt60', // e2 pawn
      'Chess_plt60', // f2 pawn
      'Chess_rlt60', // d1 rook
      'Chess_klt60', // e1 king
      'Chess_nlt60', // f1 knight
    ];

    images.forEach((img, i) => {
      expect(img.src).toContain(expectedSrcs[i]);
    });
  });

  test('event room supports all piece card types including king', () => {
    ui.startGame('knight');
    
    // Test each piece type
    const pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    pieces.forEach(piece => {
      // Clear and add new piece card
      ui.runState.deck = [{ type: 'piece', piece, name: `Place ${piece}` }];
      
      const node = { type: 'event', label: 'Event', icon: '' };
      ui.handleRoomEntered(node);
      
      const roomContent = document.getElementById('room-content');
      const cardBtn = roomContent.querySelector('.card-scroll-grid > *');
      expect(cardBtn).not.toBeNull();
      
      // Clicking should not throw
      expect(() => cardBtn.click()).not.toThrow();
      
      // Click confirm to show board
      const confirmBtn = roomContent.querySelector('.confirm-btn');
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
      
      // Board should render
      const board = roomContent.querySelector('.placement-board');
      expect(board).not.toBeNull();
    });
  });
});

describe('treasure reward board ui', () => {
  beforeEach(() => {
    const app = document.createElement('div');
    app.id = 'app';
    
    const screenRoom = document.createElement('div');
    screenRoom.id = 'screen-room';
    screenRoom.className = 'hidden';
    
    const roomContent = document.createElement('div');
    roomContent.id = 'room-content';
    screenRoom.appendChild(roomContent);
    
    app.appendChild(screenRoom);
    document.body.appendChild(app);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('treasure room supports all piece types including king', () => {
    const runState = new RunState('knight');
    
    // Test each piece type
    const pieces = [
      { piece: 'pawn', rarity: 'common', label: 'Pawn' },
      { piece: 'knight', rarity: 'common', label: 'Knight' },
      { piece: 'bishop', rarity: 'uncommon', label: 'Bishop' },
      { piece: 'rook', rarity: 'uncommon', label: 'Rook' },
      { piece: 'queen', rarity: 'rare', label: 'Queen' },
      { piece: 'king', rarity: 'legendary', label: 'King' },
    ];
    
    pieces.forEach(({ piece, rarity, label }) => {
      renderPieceRewardScreen([{ piece, rarity, label }], runState, () => {});
      
      const roomContent = document.getElementById('room-content');
      const btn = roomContent.querySelector('.piece-reward-btn');
      expect(btn).not.toBeNull();
      
      // Select piece
      btn.click();
      
      // Click confirm to show board
      const confirmBtn = roomContent.querySelector('.confirm-btn');
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
      
      // Board should render
      const board = roomContent.querySelector('.placement-board');
      expect(board).not.toBeNull();
      
      // Should have 64 squares
      expect(board.querySelectorAll('.sq').length).toBe(64);
    });
  });

  test('selected placement square has yellow outline', () => {
    const runState = new RunState('knight');
    renderPieceRewardScreen([{ piece: 'rook', rarity: 'uncommon', label: 'Rook' }], runState, () => {});

    const roomContent = document.getElementById('room-content');
    const btn = roomContent.querySelector('.piece-reward-btn');
    btn.click();
    roomContent.querySelector('.confirm-btn').click();

    const board = roomContent.querySelector('.placement-board');
    const targetSq = board.querySelector('.sq.summon-target');
    expect(targetSq).not.toBeNull();

    targetSq.click();
    expect(targetSq.classList.contains('selected')).toBe(true);

    // Verify CSS rule exists that changes outline to yellow when selected
    const cssContent = readFileSync('./css/room.css', 'utf-8');
    expect(cssContent).toContain('.sq.summon-target.selected');
  });
});
