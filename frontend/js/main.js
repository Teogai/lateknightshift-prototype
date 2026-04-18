import { startGame, handleEndTurn, handlePromotionChoice } from './ui.js';

document.getElementById('btn-knight').addEventListener('click', () => startGame('knight'));
document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);
document.querySelectorAll('.promo-btn').forEach(btn => {
  btn.addEventListener('click', () => handlePromotionChoice(btn.dataset.promo));
});
