import { describe, test, expect } from 'vitest';
import { GameState } from '../js/battle_state.js';
import { makePiece } from '../js/engine2/pieces.js';
import { get, set } from '../js/engine2/board.js';
import { generateLegalActions } from '../js/engine2/movegen.js';

function makeState(placements) {
  const state = new GameState('knight', 'pawn_pusher');
  // Clear board
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state._state.board[r][c] = null;
  // Place pieces
  for (const { sq, type, owner } of placements) {
    set(state._state.board, sq, makePiece(type, owner));
  }
  // Disable AI so we can manually control enemy moves
  state._enemyAI = null;
  state._state.hand = [];
  state._state.deck = [];
  state._state.discard = [];
  return state;
}

describe('en passant through battle_state turn flow', () => {
  test('white pawn double-push d2->d4 sets enPassant to d3', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd2', type: 'pawn', owner: 'player' },
    ]);
    // Manually place a move card in hand
    state._state.hand = [{ type: 'move', moveVariant: 'standard' }];
    
    const result = state.playMoveCard(0, 'd2', 'd4');
    expect(result.error).toBeUndefined();
    expect(state._state.enPassant).toBe('d3');
  });

  test('black pawn double-push d7->d5 sets enPassant to d6', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'enemy' },
    ]);
    state.turn = 'enemy'; // force enemy turn
    
    // Manually apply enemy double-push
    state._applyEnemyAction({
      kind: 'move',
      source: 'd7',
      targets: ['d5'],
      piece: get(state._state.board, 'd7'),
    });
    
    expect(state._state.enPassant).toBe('d6');
  });

  test('black can capture en passant to the RIGHT after white double-push', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd2', type: 'pawn', owner: 'player' },
      { sq: 'c4', type: 'pawn', owner: 'enemy' },
    ]);
    
    // White double-push
    state._state.hand = [{ type: 'move', moveVariant: 'standard' }];
    const result1 = state.playMoveCard(0, 'd2', 'd4');
    expect(result1.error).toBeUndefined();
    expect(state._state.enPassant).toBe('d3');
    
    // Enemy turn starts - enPassant should still be available
    const { pendingMoves } = state.startEnemyTurn();
    expect(pendingMoves).toHaveLength(0);
    
    // Black pawn on c4 should be able to capture en passant to d3
    const actions = generateLegalActions(state._state, 'enemy');
    const ep = actions.find(a => a.kind === 'en_passant' && a.source === 'c4');
    expect(ep).toBeDefined();
    expect(ep.targets[0]).toBe('d3');
    
    // Apply the en passant capture manually
    state._applyEnemyAction({
      kind: 'en_passant',
      source: 'c4',
      targets: ['d3'],
      piece: get(state._state.board, 'c4'),
      payload: { captured: 'd4' },
    });
    
    // Verify capture worked
    expect(get(state._state.board, 'c4')).toBeNull();
    expect(get(state._state.board, 'd3').type).toBe('pawn');
    expect(get(state._state.board, 'd3').owner).toBe('enemy');
    expect(get(state._state.board, 'd4')).toBeNull(); // captured pawn gone
  });

  test('black can capture en passant to the LEFT after white double-push', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd2', type: 'pawn', owner: 'player' },
      { sq: 'e4', type: 'pawn', owner: 'enemy' },
    ]);
    
    // White double-push
    state._state.hand = [{ type: 'move', moveVariant: 'standard' }];
    const result1 = state.playMoveCard(0, 'd2', 'd4');
    expect(result1.error).toBeUndefined();
    expect(state._state.enPassant).toBe('d3');
    
    // Enemy turn starts
    const { pendingMoves } = state.startEnemyTurn();
    expect(pendingMoves).toHaveLength(0);
    
    // Black pawn on e4 should be able to capture en passant to d3
    const actions = generateLegalActions(state._state, 'enemy');
    const ep = actions.find(a => a.kind === 'en_passant' && a.source === 'e4');
    expect(ep).toBeDefined();
    expect(ep.targets[0]).toBe('d3');
    
    // Apply the en passant capture
    state._applyEnemyAction({
      kind: 'en_passant',
      source: 'e4',
      targets: ['d3'],
      piece: get(state._state.board, 'e4'),
      payload: { captured: 'd4' },
    });
    
    expect(get(state._state.board, 'e4')).toBeNull();
    expect(get(state._state.board, 'd3').type).toBe('pawn');
    expect(get(state._state.board, 'd4')).toBeNull();
  });

  test('white can capture en passant to the RIGHT after black double-push', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'enemy' },
      { sq: 'c5', type: 'pawn', owner: 'player' },
    ]);
    
    // Black double-push
    state.turn = 'enemy';
    state._applyEnemyAction({
      kind: 'move',
      source: 'd7',
      targets: ['d5'],
      piece: get(state._state.board, 'd7'),
    });
    expect(state._state.enPassant).toBe('d6');
    
    // Finish enemy turn
    state.finishEnemyTurn([], false);
    expect(state.turn).toBe('player');
    
    // White pawn on c5 should be able to capture en passant to d6
    const dests = state.legalDestinationsFor('c5');
    expect(dests).toContain('d6');
    
    // Play the capture
    state._state.hand = [{ type: 'move', moveVariant: 'standard' }];
    const result = state.playMoveCard(0, 'c5', 'd6');
    expect(result.error).toBeUndefined();
    
    // Verify
    expect(get(state._state.board, 'c5')).toBeNull();
    expect(get(state._state.board, 'd6').type).toBe('pawn');
    expect(get(state._state.board, 'd6').owner).toBe('player');
    expect(get(state._state.board, 'd5')).toBeNull(); // captured pawn gone
  });

  test('white can capture en passant to the LEFT after black double-push', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd7', type: 'pawn', owner: 'enemy' },
      { sq: 'e5', type: 'pawn', owner: 'player' },
    ]);
    
    // Black double-push
    state.turn = 'enemy';
    state._applyEnemyAction({
      kind: 'move',
      source: 'd7',
      targets: ['d5'],
      piece: get(state._state.board, 'd7'),
    });
    expect(state._state.enPassant).toBe('d6');
    
    // Finish enemy turn
    state.finishEnemyTurn([], false);
    expect(state.turn).toBe('player');
    
    // White pawn on e5 should be able to capture en passant to d6
    const dests = state.legalDestinationsFor('e5');
    expect(dests).toContain('d6');
    
    // Play the capture
    state._state.hand = [{ type: 'move', moveVariant: 'standard' }];
    const result = state.playMoveCard(0, 'e5', 'd6');
    expect(result.error).toBeUndefined();
    
    expect(get(state._state.board, 'e5')).toBeNull();
    expect(get(state._state.board, 'd6').type).toBe('pawn');
    expect(get(state._state.board, 'd5')).toBeNull();
  });

  test('enPassant expires after opponent moves without capturing', () => {
    const state = makeState([
      { sq: 'e1', type: 'king', owner: 'player' },
      { sq: 'e8', type: 'king', owner: 'enemy' },
      { sq: 'd2', type: 'pawn', owner: 'player' },
      { sq: 'h7', type: 'pawn', owner: 'enemy' },
    ]);
    
    // White double-push
    state._state.hand = [{ type: 'move', moveVariant: 'standard' }];
    state.playMoveCard(0, 'd2', 'd4');
    expect(state._state.enPassant).toBe('d3');
    
    // Enemy makes a different move (not en passant capture)
    state._applyEnemyAction({
      kind: 'move',
      source: 'h7',
      targets: ['h6'],
      piece: get(state._state.board, 'h7'),
    });
    
    // Finish enemy turn
    state.finishEnemyTurn([], false);
    expect(state.turn).toBe('player');
    
    // enPassant should be expired
    expect(state._state.enPassant).toBeNull();
  });
});
