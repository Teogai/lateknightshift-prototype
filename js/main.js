import { startGame, handleEndTurn, handlePromotionChoice } from './ui.js';

document.getElementById('btn-knight').addEventListener('click', () => startGame('knight'));
document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);
document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('screen-complete').classList.add('hidden');
  document.getElementById('screen-select').classList.remove('hidden');
});
document.querySelectorAll('.promo-btn').forEach(btn => {
  btn.addEventListener('click', () => handlePromotionChoice(btn.dataset.promo));
});
