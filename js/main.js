import { startGame, handleRedraw, handlePromotionChoice, handleUndo, handleDebugMove, handleDebugWin, initPileButtons, hidePieceDetail } from './ui.js';

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
initPileButtons();
