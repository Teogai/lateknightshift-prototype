import { CARD_CATALOG, curseCard } from './cards.js';
import { CARD_RARITY_WEIGHTS, PIECE_RARITY_WEIGHTS, REWARD_CHOICES, PIECE_REWARD_CHOICES } from './config.js';
import { STARTER_DECKS } from './cards.js';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen' };

function weightedSample(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

// Non-starter cards for a given character, grouped by rarity
export function getRewardPool(character) {
  const starterTypes = new Set((STARTER_DECKS[character] || []).map(c => c.type + (c.piece || '')));
  return CARD_CATALOG.filter(({ card }) => {
    const c = card();
    return !starterTypes.has(c.type + (c.piece || ''));
  });
}

// Pick `count` card choices, weighted by rarity, no duplicates by type
export function pickCardChoices(count = REWARD_CHOICES, character = null) {
  const pool = character ? getRewardPool(character) : CARD_CATALOG;
  if (!pool.length) return [];

  const rarityItems = Object.entries(CARD_RARITY_WEIGHTS).map(([rarity, weight]) => ({ rarity, weight }));
  const choices = [];
  const usedTypes = new Set();

  for (let i = 0; i < count; i++) {
    // Filter pool to unused entries
    const remaining = pool.filter(e => {
      const c = e.card();
      return !usedTypes.has(c.type + (c.piece || ''));
    });
    if (!remaining.length) break;

    // Pick a rarity
    const chosenRarity = weightedSample(rarityItems).rarity;
    const byRarity = remaining.filter(e => e.rarity === chosenRarity);
    const candidates = byRarity.length ? byRarity : remaining;
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    const card = entry.card();
    usedTypes.add(card.type + (card.piece || ''));
    choices.push({ card, rarity: entry.rarity });
  }
  return choices;
}

// Pick `count` piece reward choices, weighted by piece rarity, no duplicates
export function pickPieceChoices(count = PIECE_REWARD_CHOICES) {
  const tiers = Object.entries(PIECE_RARITY_WEIGHTS).map(([rarity, { pieces, weight }]) => ({
    rarity, pieces, weight,
  }));

  const choices = [];
  const usedPieces = new Set();

  for (let i = 0; i < count; i++) {
    const remaining = tiers.map(t => ({
      ...t,
      pieces: t.pieces.filter(p => !usedPieces.has(p)),
    })).filter(t => t.pieces.length);
    if (!remaining.length) break;

    const tier = weightedSample(remaining);
    const piece = tier.pieces[Math.floor(Math.random() * tier.pieces.length)];
    usedPieces.add(piece);
    choices.push({ piece, rarity: tier.rarity, label: PIECE_NAMES[piece[0]] || piece });
  }
  return choices;
}

// --- Render functions ---

export function renderCardRewardScreen(choices, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card reward</h2>';
  choices.forEach(({ card, rarity }, i) => {
    const btn = document.createElement('button');
    btn.className = `reward-card-btn rarity-${rarity}`;
    btn.textContent = `${card.name}  (${card.cost})  [${rarity}]`;
    btn.addEventListener('click', () => onChosen(i, card));
    content.appendChild(btn);
  });
}

export function renderPieceRewardScreen(choices, runState, onPlaced) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a piece reward</h2>';
  choices.forEach(({ piece, rarity, label }) => {
    const btn = document.createElement('button');
    btn.className = `piece-reward-btn rarity-${rarity}`;
    btn.textContent = `${label}  [${rarity}]`;
    btn.addEventListener('click', () => {
      renderSquarePicker(piece, rarity, runState, onPlaced);
    });
    content.appendChild(btn);
  });
}

function renderSquarePicker(piece, rarity, runState, onPlaced) {
  const content = document.getElementById('room-content');
  if (!content) return;
  const typeMap = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q' };
  const label = piece.charAt(0).toUpperCase() + piece.slice(1);
  content.innerHTML = `<h2>Place your ${label} — choose a rank 1-2 square</h2>`;

  // Build available squares (ranks 1-2, any file)
  const occupied = new Set(runState.startingPieces.map(sp => sp.square));
  for (let rank = 1; rank <= 2; rank++) {
    for (const file of 'abcdefgh') {
      const sq = file + rank;
      if (occupied.has(sq)) continue;
      const btn = document.createElement('button');
      btn.className = 'reward-card-btn';
      btn.textContent = sq;
      btn.addEventListener('click', () => {
        runState.addStartingPiece({ type: typeMap[piece], color: 'w' }, sq);
        if (onPlaced) onPlaced({ piece, rarity }, sq);
      });
      content.appendChild(btn);
    }
  }
}

export function renderUpgradeScreen(deck, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card to upgrade</h2>';
  deck.forEach((card, i) => {
    if (card.type === 'curse') return;
    const btn = document.createElement('button');
    btn.className = 'reward-card-btn';
    btn.textContent = `${card.name}  (${card.cost})${card.upgraded ? '  [upgraded]' : ''}`;
    btn.addEventListener('click', () => onChosen(i, card));
    content.appendChild(btn);
  });
}

export function renderTransformScreen(deck, character, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card to transform</h2>';
  deck.forEach((card, i) => {
    const btn = document.createElement('button');
    btn.className = 'reward-card-btn';
    btn.textContent = `${card.name}  (${card.cost})`;
    btn.addEventListener('click', () => onChosen(i, card));
    content.appendChild(btn);
  });
}

export function renderShopScreen(deck, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Remove a card from your deck</h2>';
  deck.forEach((card, i) => {
    const btn = document.createElement('button');
    btn.className = 'reward-card-btn';
    btn.textContent = `${card.name}  (${card.cost})  — Remove`;
    btn.addEventListener('click', () => onChosen(i, card));
    content.appendChild(btn);
  });
}

export function renderDefeatScreen(onAddCurse, onRetry) {
  const content = document.getElementById('defeat-content');
  if (!content) return;
  content.innerHTML = '<h2>Defeated!</h2><p>Choose a consequence:</p>';

  const curseBtn = document.createElement('button');
  curseBtn.textContent = 'Add a Curse card to your deck';
  curseBtn.addEventListener('click', onAddCurse);
  content.appendChild(curseBtn);

  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry the battle (use a life)';
  retryBtn.addEventListener('click', onRetry);
  content.appendChild(retryBtn);
}
