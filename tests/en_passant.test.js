import { test, expect } from 'vitest';
import { GameState } from '../js/battle_state.js';
import { makePiece } from '../js/engine2/pieces.js';
import { set } from '../js/engine2/board.js';
import { generateLegalActions } from '../js/engine2/movegen.js';

function setupBoard(bs) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) bs._state.board[r][c] = null;
  set(bs._state.board, 'e1', makePiece('king', 'player'));
  set(bs._state.board, 'e8', makePiece('king', 'enemy'));
  set(bs._state.board, 'b5', makePiece('pawn', 'player'));
  set(bs._state.board, 'a7', makePiece('pawn', 'enemy'));
}

test('en passant survives finishEnemyTurnSequence into player turn', () => {
  const bs = new GameState('knight', 'pawn_pusher');
  setupBoard(bs);

  // Mock enemy AI to force a7→a5 double-push
  bs._enemyAI = {
    selectMove: () => ({
      kind: 'move',
      source: 'a7',
      targets: ['a5']
    })
  };

  // Real game flow: player turn → startEnemyTurn → finishEnemyTurn → finishEnemyTurnSequence
  bs.turn = 'player';
  const { pendingMoves, warnNext, error } = bs.startEnemyTurn();
  expect(error).toBeUndefined();

  // After startEnemyTurn, enPassant should be set (enemy double-pushed)
  expect(bs._state.enPassant).toBe('a6');

  // Finish enemy turn — exact path the real game takes
  bs.finishEnemyTurn(pendingMoves, warnNext);
  bs.finishEnemyTurnSequence(warnNext);

  // BUG: finishEnemyTurnSequence was clearing enPassant here
  // After fix, enPassant must still be 'a6' for player's turn
  expect(bs._state.enPassant).toBe('a6');

  // Player should be able to capture en passant
  bs.turn = 'player';
  const actions = generateLegalActions(bs._state, 'player');
  const ep = actions.find(a =>
    a.source === 'b5' && a.targets[0] === 'a6' && a.kind === 'en_passant'
  );
  expect(ep).toBeDefined();
});