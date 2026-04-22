import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { RunState } from '../js/run.js';
import * as ui from '../js/ui.js';
import { renderPieceRewardScreen } from '../js/rewards.js';

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