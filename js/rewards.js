import { CARD_CATALOG, curseCard, STARTER_DECKS } from './cards2/move_cards.js';
import { CARD_RARITY_WEIGHTS, PIECE_RARITY_WEIGHTS, REWARD_CHOICES, PIECE_REWARD_CHOICES } from '../config/game.js';
import { makeCardEl } from './ui.js';
import { CHARACTER_PIECES } from './engine2/constants2.js';

const WHITE_PIECES = {
  king:   './img/Chess_klt60.png',
  queen:  './img/Chess_qlt60.png',
  rook:   './img/Chess_rlt60.png',
  bishop: './img/Chess_blt60.png',
  knight: './img/Chess_nlt60.png',
  pawn:   './img/Chess_plt60.png',
};
const PIECE_FULL_NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

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
function cardKey(c) {
  return c.type + (c.piece || '') + (c.moveVariant || '');
}

export function getRewardPool(character) {
  const starterTypes = new Set((STARTER_DECKS[character] || []).map(cardKey));
  return CARD_CATALOG.filter(({ card }) => {
    const c = card();
    return !starterTypes.has(cardKey(c));
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
      return !usedTypes.has(cardKey(c));
    });
    if (!remaining.length) break;

    // Pick a rarity
    const chosenRarity = weightedSample(rarityItems).rarity;
    const byRarity = remaining.filter(e => e.rarity === chosenRarity);
    const candidates = byRarity.length ? byRarity : remaining;
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    const card = entry.card();
    usedTypes.add(cardKey(card));
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

export function renderCardRewardScreen(choices, onChosen, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card reward</h2>';
  const row = document.createElement('div');
  row.className = 'card-choices';
  choices.forEach(({ card, rarity }, i) => {
    const el = makeCardEl({ ...card, rarity }, { onClick: () => onChosen(i, card) });
    row.appendChild(el);
  });
  content.appendChild(row);

  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.textContent = 'Debug: Reroll';
    rerollBtn.className = 'debug-btn';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderPieceRewardScreen(choices, runState, onPlaced) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a piece reward</h2>';
  const row = document.createElement('div');
  row.className = 'piece-choices';
  choices.forEach(({ piece, rarity, label }) => {
    const btn = document.createElement('button');
    btn.className = `piece-reward-btn rarity-${rarity}`;
    btn.textContent = `${label}\n[${rarity}]`;
    btn.addEventListener('click', () => {
      renderSquarePicker(piece, rarity, runState, onPlaced);
    });
    row.appendChild(btn);
  });
  content.appendChild(row);
}

function renderSquarePicker(piece, rarity, runState, onPlaced) {
  const content = document.getElementById('room-content');
  if (!content) return;
  const typeMap = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q' };
  const label = piece.charAt(0).toUpperCase() + piece.slice(1);
  content.innerHTML = `<h2>Place your ${label} — click a rank 1–2 square</h2>`;

  const occupied = new Map();
  for (const { type, color, sq } of CHARACTER_PIECES[runState.character]) {
    if (color === 'w') occupied.set(sq, { type, color });
  }
  for (const { piece, square } of runState.startingPieces) {
    occupied.set(square, piece);
  }

  const boardEl = document.createElement('div');
  boardEl.className = 'placement-board';

  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const file = 'abcdefgh'[fileIdx];
      const sq = file + rank;
      const isLight = (rank + fileIdx) % 2 === 0;
      const div = document.createElement('div');
      div.className = 'sq ' + (isLight ? 'light' : 'dark');

      const placedPiece = occupied.get(sq);
      if (placedPiece) {
        const img = document.createElement('img');
        img.src = WHITE_PIECES[PIECE_FULL_NAME[placedPiece.type] || placedPiece.type];
        img.className = 'piece-img';
        div.appendChild(img);
      }

      if (rank <= 2 && !placedPiece) {
        div.classList.add('summon-target');
        div.addEventListener('click', () => {
          runState.addStartingPiece({ type: typeMap[piece], color: 'w' }, sq);
          if (onPlaced) onPlaced({ piece, rarity }, sq);
        });
      } else if (rank > 2) {
        div.classList.add('sq-disabled');
      }

      boardEl.appendChild(div);
    }
  }

  content.appendChild(boardEl);
}

export function renderUpgradeScreen(deck, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card to upgrade</h2>';
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  deck.forEach((card, i) => {
    if (card.type === 'curse') return;
    const el = makeCardEl(card, { onClick: () => onChosen(i, card) });
    if (card.upgraded) el.classList.add('already-upgraded');
    grid.appendChild(el);
  });
  content.appendChild(grid);
}

export function renderTransformScreen(deck, character, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card to transform</h2>';
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  deck.forEach((card, i) => {
    const el = makeCardEl(card, { onClick: () => onChosen(i, card) });
    grid.appendChild(el);
  });
  content.appendChild(grid);
}

export function renderTransformResultScreen(oldCard, newCard, onContinue) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Card Transformed</h2>';

  const row = document.createElement('div');
  row.className = 'transform-result-row';

  row.appendChild(makeCardEl(oldCard));

  const arrow = document.createElement('span');
  arrow.className = 'transform-arrow';
  arrow.textContent = '→';
  row.appendChild(arrow);

  row.appendChild(makeCardEl(newCard));
  content.appendChild(row);

  const btn = document.createElement('button');
  btn.className = 'reward-card-btn';
  btn.textContent = 'Continue';
  btn.addEventListener('click', onContinue);
  content.appendChild(btn);
}

export function renderShopScreen(deck, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Remove a card from your deck</h2>';
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  deck.forEach((card, i) => {
    const el = makeCardEl(card, { onClick: () => onChosen(i, card) });
    grid.appendChild(el);
  });
  content.appendChild(grid);
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
