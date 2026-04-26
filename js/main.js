import { startGame, handleRedraw, handlePromotionChoice, handleUndo, handleDebugMove, handleDebugWin, initPileButtons, hidePieceDetail, restoreGameState, gameState } from './ui.js';
import { GameState } from './battle_state.js';

// Restore battle state if page was refreshed after sleep
try {
  const saved = GameState.loadSession();
  if (saved) {
    restoreGameState(saved);
  }
} catch (e) {
  console.log('[main] no saved state to restore');
}

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

// Save battle state before tab is discarded
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try {
      if (gameState?.saveSession) gameState.saveSession();
    } catch (e) {
      // ignore
    }
  }
});

initPileButtons();
