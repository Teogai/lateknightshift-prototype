import { CARD_CATALOG, curseCard, STARTER_DECKS } from './cards2/move_cards.js';
import { CARD_RARITY_WEIGHTS, PIECE_RARITY_WEIGHTS, REWARD_CHOICES, PIECE_REWARD_CHOICES, RELIC_REWARD_CHOICES } from '../config/game.js';
import { pickRelicChoices } from './relics.js';
import { CHARM_CATALOG } from './charms.js';
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
export function cardKey(c) {
  return c.type + (c.piece || '') + (c.moveVariant || '') + (c.actionType || '');
}

export function getRewardPool(character) {
  const starterTypes = new Set((STARTER_DECKS[character] || []).map(cardKey));
  return CARD_CATALOG.filter(({ card }) => {
    const c = card();
    return !starterTypes.has(cardKey(c)) && c.inRewardPool !== false;
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
    // Filter pool to unused entries, exclude piece cards
    const remaining = pool.filter(e => {
      const c = e.card();
      return c.type !== 'piece' && c.type !== 'curse' && !usedTypes.has(cardKey(c));
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

// Pick `count` piece card choices, weighted by rarity, no duplicates by piece
export function pickPieceCardChoices(count = REWARD_CHOICES) {
  const pool = CARD_CATALOG.filter(e => e.card().type === 'piece');
  if (!pool.length) return [];

  const rarityItems = Object.entries(CARD_RARITY_WEIGHTS).map(([rarity, weight]) => ({ rarity, weight }));
  const choices = [];
  const usedPieces = new Set();

  for (let i = 0; i < count; i++) {
    // Filter pool to unused pieces
    const remaining = pool.filter(e => {
      const c = e.card();
      return !usedPieces.has(c.piece);
    });
    if (!remaining.length) break;

    // Pick a rarity
    const chosenRarity = weightedSample(rarityItems).rarity;
    const byRarity = remaining.filter(e => e.rarity === chosenRarity);
    const candidates = byRarity.length ? byRarity : remaining;
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    const card = entry.card();
    usedPieces.add(card.piece);
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

// Pick `count` charm choices, weighted by rarity, no duplicates
export function pickCharmChoices(count = REWARD_CHOICES) {
  const pool = CHARM_CATALOG;
  if (!pool.length) return [];

  const rarityItems = Object.entries(CARD_RARITY_WEIGHTS).map(([rarity, weight]) => ({ rarity, weight }));
  const choices = [];
  const usedIds = new Set();

  for (let i = 0; i < count; i++) {
    const remaining = pool.filter(e => !usedIds.has(e.charm.id));
    if (!remaining.length) break;

    const chosenRarity = weightedSample(rarityItems).rarity;
    const byRarity = remaining.filter(e => e.rarity === chosenRarity);
    const candidates = byRarity.length ? byRarity : remaining;
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(entry.charm.id);
    choices.push({ charm: { ...entry.charm }, rarity: entry.rarity });
  }
  return choices;
}

// Pick a single card to transform into, following type-category rules
export function pickTransformCard(oldCard, character) {
  const pool = character ? getRewardPool(character) : CARD_CATALOG;
  const rarityItems = Object.entries(CARD_RARITY_WEIGHTS).map(([rarity, weight]) => ({ rarity, weight }));

  let candidates;
  if (oldCard.type === 'piece') {
    // Piece → different piece only
    candidates = pool.filter(e => {
      const c = e.card();
      return c.type === 'piece' && c.piece !== oldCard.piece;
    });
  } else if (oldCard.type === 'curse') {
    // Curse → different curse only
    candidates = CARD_CATALOG.filter(e => {
      const c = e.card();
      return c.type === 'curse' && c.name !== oldCard.name;
    });
  } else {
    // Other → non-piece, non-curse, not same card, not starter
    const oldKey = cardKey(oldCard);
    candidates = pool.filter(e => {
      const c = e.card();
      return c.type !== 'piece' && c.type !== 'curse' && cardKey(c) !== oldKey;
    });
  }

  if (!candidates.length) {
    // Fallback: any card from full catalog that matches type category
    if (oldCard.type === 'piece') {
      candidates = CARD_CATALOG.filter(e => e.card().type === 'piece' && e.card().piece !== oldCard.piece);
    } else if (oldCard.type === 'curse') {
      candidates = CARD_CATALOG.filter(e => {
        const c = e.card();
        return c.type === 'curse' && c.name !== oldCard.name;
      });
    } else {
      candidates = CARD_CATALOG.filter(e => {
        const c = e.card();
        return c.type !== 'piece' && c.type !== 'curse' && cardKey(c) !== cardKey(oldCard);
      });
    }
  }

  if (!candidates.length) {
    // Ultimate fallback: random card from catalog
    const entry = CARD_CATALOG[Math.floor(Math.random() * CARD_CATALOG.length)];
    return entry.card();
  }

  const chosenRarity = weightedSample(rarityItems).rarity;
  const byRarity = candidates.filter(e => e.rarity === chosenRarity);
  const poolToUse = byRarity.length ? byRarity : candidates;
  const entry = poolToUse[Math.floor(Math.random() * poolToUse.length)];
  return entry.card();
}

export function applyCharmToCard(card, charm) {
  if (!charm.validCardTypes.includes(card.type)) {
    return { error: `Cannot apply ${charm.name} to ${card.type} card` };
  }
  return { ...card, charm: { ...charm } };
}

// --- Helper ---

function createConfirmButton(text = 'Confirm') {
  const btn = document.createElement('button');
  btn.className = 'confirm-btn';
  btn.textContent = text;
  btn.disabled = true;
  return btn;
}

// --- Render functions ---

export function renderCardRewardScreen(choices, onChosen, onReroll, title = 'Choose a card reward') {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = `<h2>${title}</h2>`;
  const row = document.createElement('div');
  row.className = 'card-choices';
  let selectedEl = null;
  let selectedCard = null;
  let selectedIndex = null;

  choices.forEach(({ card, rarity }, i) => {
    const el = makeCardEl({ ...card, rarity });
    el.addEventListener('click', () => {
      if (selectedEl) selectedEl.classList.remove('selected');
      selectedEl = el;
      selectedEl.classList.add('selected');
      selectedCard = card;
      selectedIndex = i;
      confirmBtn.disabled = false;
    });
    row.appendChild(el);
  });
  content.appendChild(row);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedCard !== null) onChosen(selectedIndex, selectedCard);
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderRelicRewardScreen(runState, onDone, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a Relic</h2>';

  const choices = pickRelicChoices(RELIC_REWARD_CHOICES, runState);
  if (choices.length === 0) {
    content.innerHTML += '<p>No relics available.</p>';
    const btn = document.createElement('button');
    btn.textContent = 'Continue';
    btn.addEventListener('click', onDone);
    content.appendChild(btn);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'relic-grid';

  let selectedEl = null;
  let selectedRelic = null;

  for (const relic of choices) {
    const el = document.createElement('div');
    el.className = 'relic-choice';
    el.innerHTML = `
      <div class="relic-name">${relic.name}</div>
      <div class="relic-desc">${relic.desc}</div>
    `;
    el.addEventListener('click', () => {
      if (selectedEl) selectedEl.classList.remove('selected');
      selectedEl = el;
      selectedEl.classList.add('selected');
      selectedRelic = relic;
      confirmBtn.disabled = false;
    });
    grid.appendChild(el);
  }

  content.appendChild(grid);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedRelic) {
      runState.addRelic({ ...selectedRelic });
      onDone();
    }
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderPieceRewardScreen(choices, runState, onPlaced, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a piece reward</h2>';
  const row = document.createElement('div');
  row.className = 'piece-choices';
  let selectedBtn = null;
  let selectedChoice = null;

  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = `piece-reward-btn rarity-${choice.rarity}`;
    btn.textContent = `${choice.label}\n[${choice.rarity}]`;
    btn.addEventListener('click', () => {
      if (selectedBtn) selectedBtn.classList.remove('selected');
      selectedBtn = btn;
      selectedBtn.classList.add('selected');
      selectedChoice = choice;
      confirmBtn.disabled = false;
    });
    row.appendChild(btn);
  });
  content.appendChild(row);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedChoice) renderSquarePicker(selectedChoice.piece, selectedChoice.rarity, runState, onPlaced);
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

function renderSquarePicker(piece, rarity, runState, onPlaced) {
  const content = document.getElementById('room-content');
  if (!content) return;
  const typeMap = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
  const label = piece.charAt(0).toUpperCase() + piece.slice(1);
  content.innerHTML = `<h2>Place your ${label} — select a rank 1–2 square</h2>`;

  const occupied = new Map();
  for (const { type, color, sq } of CHARACTER_PIECES[runState.character]) {
    if (color === 'w') occupied.set(sq, { type, color });
  }
  for (const { piece, square } of runState.startingPieces) {
    occupied.set(square, piece);
  }

  const boardEl = document.createElement('div');
  boardEl.className = 'placement-board';
  let selectedSq = null;
  let selectedDiv = null;

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
          if (selectedDiv) selectedDiv.classList.remove('selected');
          selectedDiv = div;
          selectedDiv.classList.add('selected');
          selectedSq = sq;
          confirmBtn.disabled = false;
        });
      } else if (rank > 2) {
        div.classList.add('sq-disabled');
      }

      boardEl.appendChild(div);
    }
  }

  content.appendChild(boardEl);

  const confirmBtn = createConfirmButton('Confirm Placement');
  confirmBtn.addEventListener('click', () => {
    if (selectedSq) {
      runState.addStartingPiece({ type: typeMap[piece], color: 'w' }, selectedSq);
      if (onPlaced) onPlaced({ piece, rarity }, selectedSq);
    }
  });
  content.appendChild(confirmBtn);
}

export function renderUpgradeScreen(deck, onChosen, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card to upgrade</h2>';
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  let selectedEl = null;
  let selectedCard = null;
  let selectedIndex = null;

  deck.forEach((card, i) => {
    if (card.type === 'curse') return;
    const el = makeCardEl(card);
    if (card.upgraded) el.classList.add('already-upgraded');
    el.addEventListener('click', () => {
      if (selectedEl) selectedEl.classList.remove('selected');
      selectedEl = el;
      selectedEl.classList.add('selected');
      selectedCard = card;
      selectedIndex = i;
      confirmBtn.disabled = false;
    });
    grid.appendChild(el);
  });
  content.appendChild(grid);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedCard !== null) onChosen(selectedIndex, selectedCard);
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderTransformScreen(deck, onChosen, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a card to transform</h2>';
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  let selectedEl = null;
  let selectedCard = null;
  let selectedIndex = null;

  deck.forEach((card, i) => {
    const el = makeCardEl(card);
    el.addEventListener('click', () => {
      if (selectedEl) selectedEl.classList.remove('selected');
      selectedEl = el;
      selectedEl.classList.add('selected');
      selectedCard = card;
      selectedIndex = i;
      confirmBtn.disabled = false;
    });
    grid.appendChild(el);
  });
  content.appendChild(grid);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedCard !== null) onChosen(selectedIndex, selectedCard);
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
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

export function renderShopScreen(deck, onChosen, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Remove a card from your deck</h2>';
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  let selectedEl = null;
  let selectedCard = null;
  let selectedIndex = null;

  deck.forEach((card, i) => {
    const el = makeCardEl(card);
    el.addEventListener('click', () => {
      if (selectedEl) selectedEl.classList.remove('selected');
      selectedEl = el;
      selectedEl.classList.add('selected');
      selectedCard = card;
      selectedIndex = i;
      confirmBtn.disabled = false;
    });
    grid.appendChild(el);
  });
  content.appendChild(grid);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedCard !== null) onChosen(selectedIndex, selectedCard);
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderDefeatScreen(onAddCurse, onRetry, onReroll) {
  const content = document.getElementById('defeat-content');
  if (!content) return;
  content.innerHTML = '<h2>Defeated!</h2><p>Choose a consequence:</p>';

  let selectedBtn = null;
  let selectedAction = null;

  const curseBtn = document.createElement('button');
  curseBtn.className = 'defeat-btn';
  curseBtn.textContent = 'Add a Curse card to your deck';
  curseBtn.addEventListener('click', () => {
    if (selectedBtn) selectedBtn.classList.remove('selected');
    selectedBtn = curseBtn;
    selectedBtn.classList.add('selected');
    selectedAction = 'curse';
    confirmBtn.disabled = false;
  });
  content.appendChild(curseBtn);

  const retryBtn = document.createElement('button');
  retryBtn.className = 'defeat-btn';
  retryBtn.textContent = 'Retry the battle (use a life)';
  retryBtn.addEventListener('click', () => {
    if (selectedBtn) selectedBtn.classList.remove('selected');
    selectedBtn = retryBtn;
    selectedBtn.classList.add('selected');
    selectedAction = 'retry';
    confirmBtn.disabled = false;
  });
  content.appendChild(retryBtn);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedAction === 'curse') onAddCurse();
    else if (selectedAction === 'retry') onRetry();
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderCharmRewardScreen(choices, onChosen, onReroll) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = '<h2>Choose a charm</h2>';
  const row = document.createElement('div');
  row.className = 'charm-choices';
  let selectedBtn = null;
  let selectedCharm = null;
  let selectedIndex = null;

  choices.forEach(({ charm, rarity }, i) => {
    const btn = document.createElement('button');
    btn.className = `charm-reward-btn rarity-${rarity}`;
    btn.innerHTML = `<strong>${charm.name}</strong><br><small>${charm.desc}</small><br>[${rarity}]`;
    btn.addEventListener('click', () => {
      if (selectedBtn) selectedBtn.classList.remove('selected');
      selectedBtn = btn;
      selectedBtn.classList.add('selected');
      selectedCharm = charm;
      selectedIndex = i;
      confirmBtn.disabled = false;
    });
    row.appendChild(btn);
  });
  content.appendChild(row);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedCharm !== null) onChosen(selectedIndex, selectedCharm);
  });
  content.appendChild(confirmBtn);

  // Debug reroll button
  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}

export function renderCharmApplyScreen(deck, charm, onChosen) {
  const content = document.getElementById('room-content');
  if (!content) return;
  content.innerHTML = `<h2>Apply ${charm.name} to a card</h2><p>${charm.desc}</p><p>Valid for: ${charm.validCardTypes.join(', ')} cards</p>`;
  const grid = document.createElement('div');
  grid.className = 'card-scroll-grid';
  let selectedEl = null;
  let selectedCard = null;
  let selectedIndex = null;

  deck.forEach((card, i) => {
    if (card.type === 'curse') return;
    if (!charm.validCardTypes.includes(card.type)) return;
    const el = makeCardEl(card);
    if (card.charm) el.classList.add('already-charmed');
    el.addEventListener('click', () => {
      if (selectedEl) selectedEl.classList.remove('selected');
      selectedEl = el;
      selectedEl.classList.add('selected');
      selectedCard = card;
      selectedIndex = i;
      confirmBtn.disabled = false;
    });
    grid.appendChild(el);
  });
  content.appendChild(grid);

  const confirmBtn = createConfirmButton('Confirm');
  confirmBtn.addEventListener('click', () => {
    if (selectedCard !== null) onChosen(selectedIndex, selectedCard);
  });
  content.appendChild(confirmBtn);
}
