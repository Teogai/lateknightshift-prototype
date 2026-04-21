import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RunState } from '../js/run.js';
import * as ui from '../js/ui.js';

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
    
    // Click the card to trigger square picker
    const cardBtn = roomContent.querySelector('.card-scroll-grid > *');
    expect(cardBtn).not.toBeNull();
    
    cardBtn.click();
    
    // Should render placement board
    const board = roomContent.querySelector('.placement-board');
    expect(board).not.toBeNull();
    
    // Should have 64 squares
    expect(board.querySelectorAll('.sq').length).toBe(64);
  });
});
