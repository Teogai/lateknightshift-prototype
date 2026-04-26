import { startGame, handleRedraw, handlePromotionChoice, handleUndo, handleDebugMove, handleDebugWin, initPileButtons, hidePieceDetail, restoreGameState, gameState, runState, handleNewGame, handleContinue } from './ui.js';
import { GameState } from './battle_state.js';

// Check if continue is available
try {
  const hasSave = typeof sessionStorage !== 'undefined' && 
                  sessionStorage.getItem('lks_run_state') !== null;
  const continueBtn = document.getElementById('btn-continue');
  if (continueBtn) {
    continueBtn.disabled = !hasSave;
  }
} catch (e) {
  // ignore
}

document.getElementById('btn-new-game').addEventListener('click', handleNewGame);
document.getElementById('btn-continue').addEventListener('click', handleContinue);
document.getElementById('btn-knight').addEventListener('click', () => startGame('knight'));
document.getElementById('btn-redraw').addEventListener('click', handleRedraw);
document.getElementById('btn-undo').addEventListener('click', handleUndo);
document.getElementById('btn-debug-move').addEventListener('click', handleDebugMove);
document.getElementById('btn-debug-win').addEventListener('click', handleDebugWin);
document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('screen-complete').classList.add('hidden');
  document.getElementById('screen-select').classList.remove('hidden');
});
document.querySelectorAll('.promo-btn').forEach(btn => {
  btn.addEventListener('click', () => handlePromotionChoice(btn.dataset.promo));
});
document.getElementById('piece-detail-close').addEventListener('click', hidePieceDetail);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hidePieceDetail();
});

// Save full run state before tab is discarded
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try {
      if (runState?.saveSession) runState.saveSession();
      if (gameState?.saveSession) gameState.saveSession();
    } catch (e) {
      // ignore
    }
  }
});

initPileButtons();
