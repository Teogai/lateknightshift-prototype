import { GameState, knightAttacks, matchesPattern, VALID_ENEMIES, PIECE_VALUES } from './battle_state.js';
import { sqToRC, rcToSq, inBounds } from './engine2/board.js';
import { CHARACTER_PIECES } from './engine2/constants2.js';
import { RunState } from './run.js';
import { FIXED_PATH } from './map.js';
import {
  renderCardRewardScreen, renderPieceRewardScreen, renderUpgradeScreen,
  renderTransformScreen, renderTransformResultScreen, renderShopScreen, renderDefeatScreen,
  renderCharmRewardScreen, renderCharmApplyScreen, renderRelicRewardScreen,
  pickCardChoices, pickPieceChoices, pickPieceCardChoices, pickCharmChoices, pickTransformCard, applyCharmToCard,
} from './rewards.js';
import { ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, BOSS_ENEMY } from './enemies2.js';
import { curseCard, bishopMoveCard, rookMoveCard, queenMoveCard } from './cards2/move_cards.js';

const PIECES = {
  white: {
    king:   './img/Chess_klt60.png',
    queen:  './img/Chess_qlt60.png',
    rook:   './img/Chess_rlt60.png',
    bishop: './img/Chess_blt60.png',
    knight: './img/Chess_nlt60.png',
    pawn:   './img/Chess_plt60.png',
  },
  black: {
    king:   './img/Chess_kdt60.png',
    queen:  './img/Chess_qdt60.png',
    rook:   './img/Chess_rdt60.png',
    bishop: './img/Chess_bdt60.png',
    knight: './img/Chess_ndt60.png',
    pawn:   './img/Chess_pdt60.png',
  },
  neutral: {
    duck:   './img/duck.png',
  },
};

const KEYWORD_REGISTRY = {
  duck:       { color: '#ffcc44', desc: 'Duck: cannot be captured.' },
  pawn:       { color: '#dddddd', desc: 'Pawn: moves forward, captures diagonal.' },
  knight:     { color: '#dddddd', desc: 'Knight: jumps in L-shape.' },
  bishop:     { color: '#dddddd', desc: 'Bishop: moves diagonally.' },
  rook:       { color: '#dddddd', desc: 'Rook: moves straight.' },
  queen:      { color: '#dddddd', desc: 'Queen: moves diagonal or straight.' },
  king:       { color: '#ffdd44', desc: 'King: moves 1 square. Lose if captured.' },
  piece:      { color: '#dddddd', desc: 'Any chess piece.' },
  stun:       { color: '#ff6666', desc: 'Stun: cannot move for 2 turns.' },
  ghost:      { color: '#aa88ff', desc: 'Ghost: does not block sliding moves.' },
  shield:     { color: '#44aaff', desc: 'Shield: blocks first capture.' },
  frozen:     { color: '#88ccff', desc: 'Frozen: cannot move.' },
  wounded:    { color: '#ff4444', desc: 'Wounded: from damage tiles.' },
  uncapturable: { color: '#aaaaaa', desc: 'Uncapturable: cannot be taken.' },
  push:       { color: '#ff8844', desc: 'Push: after moving, push all adjacent pieces 1 square away.' },
  atomic:     { color: '#ff4444', desc: 'Atomic: piece explodes in a 3x3 area on capture.' },
  knight_power: { color: '#66cc66', desc: 'Knight Power: can move like a knight for 1 move.' },
  bishop_power: { color: '#aa66dd', desc: 'Bishop Power: can move like a bishop for 1 move.' },
  rook_power:   { color: '#dd4444', desc: 'Rook Power: can move like a rook for 1 move.' },
  queen_power:  { color: '#ffcc00', desc: 'Queen Power: can move like a queen for 1 move.' },
  king_power:   { color: '#ffaa00', desc: 'King Power: can move like a king for 1 move.' },
};

export const STATUS_BADGE_COLORS = {
  stunned: '#ff6666',
  ghost: '#aa88ff',
  shielded: '#44aaff',
  frozen: '#88ccff',
  wounded: '#ff4444',
  knight_power: '#66cc66',
  bishop_power: '#aa66dd',
  rook_power: '#dd4444',
  queen_power: '#ffcc00',
  king_power: '#ffaa00',
  uncapturable: '#aaaaaa',
};

let _tooltipEl = null;
function _ensureTooltip() {
  if (_tooltipEl) return _tooltipEl;
  const el = document.createElement('div');
  el.className = 'keyword-tooltip';
  el.style.position = 'fixed';
  el.style.display = 'none';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '200';
  document.body.appendChild(el);
  _tooltipEl = el;
  return el;
}

function _showTooltip(text, color, targetRect) {
  const tip = _ensureTooltip();
  tip.textContent = text;
  tip.style.display = 'block';
  tip.style.borderColor = color;
  const x = targetRect.right + 8;
  const y = targetRect.top;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

function _hideTooltip() {
  if (_tooltipEl) _tooltipEl.style.display = 'none';
}

let _tooltipTarget = null;
function _parseCardDesc(desc, container) {
  if (!desc) return;
  const regex = /\{([\w ]+)\}/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(desc)) !== null) {
    const before = desc.slice(lastIdx, match.index);
    if (before) container.appendChild(document.createTextNode(before));
    const rawKey = match[1];
    const key = rawKey.toLowerCase().replace(/\s+/g, '_');
    const info = KEYWORD_REGISTRY[key];
    const span = document.createElement('span');
    span.className = 'keyword' + (info ? ` keyword-${key}` : '');
    if (info) span.style.color = info.color;
    span.textContent = rawKey.toLowerCase();
    if (info) {
      span.addEventListener('mouseenter', () => {
        _tooltipTarget = span;
        const rect = span.getBoundingClientRect();
        _showTooltip(info.desc, info.color, rect);
      });
      span.addEventListener('mouseleave', () => {
        _tooltipTarget = null;
        _hideTooltip();
      });
      span.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        _tooltipTarget = span;
        const rect = span.getBoundingClientRect();
        _showTooltip(info.desc, info.color, rect);
      }, { passive: true });
    }
    container.appendChild(span);
    lastIdx = regex.lastIndex;
  }
  const after = desc.slice(lastIdx);
  if (after) container.appendChild(document.createTextNode(after));
}

// Global touch/click listener to dismiss keyword tooltip when tapping outside
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', (e) => {
    if (_tooltipTarget && !_tooltipTarget.contains(e.target)) {
      _tooltipTarget = null;
      _hideTooltip();
    }
  }, { passive: true });
  document.addEventListener('click', (e) => {
    if (_tooltipTarget && !_tooltipTarget.contains(e.target)) {
      _tooltipTarget = null;
      _hideTooltip();
    }
  });
}

const ALL_SCREENS = ['screen-select', 'screen-map', 'screen-game', 'screen-room', 'screen-defeat', 'screen-victory', 'screen-complete'];

export let gameState = null;
export let runState = null;
let currentEnemyKey = null;

export const uiState = {
  phase: 'idle',
  selectedCardIndex: null,
  selectedCardType: null,
  selectedMoveVariant: null,
  selectedPieceType: null,
  fromSq: null,
  pendingPromos: [],
  knightTargets: [],
  legalDests: [],
  powerDests: [],
  summonTargets: [],
  geometricTargets: [],
  pawnBoostTargets: [],
  gameOverHandled: false,
  debugMove: false,
  debugDests: [],
};

export function resetUiState() {
  uiState.phase = 'idle';
  uiState.selectedCardIndex = null;
  uiState.selectedCardType = null;
  uiState.selectedMoveVariant = null;
  uiState.selectedPieceType = null;
  uiState.fromSq = null;
  uiState.pendingPromos = [];
  uiState.knightTargets = [];
  uiState.legalDests = [];
      uiState.powerDests = [];
  uiState.powerDests = [];
  uiState.summonTargets = [];
  uiState.geometricTargets = [];
  uiState.pawnBoostTargets = [];
  uiState.gameOverHandled = false;
  uiState.debugMove = false;
  uiState.debugDests = [];
}

export function renderRelicBar(runState) {
  const bar = document.getElementById('relic-bar');
  if (!bar) return;
  bar.innerHTML = '';
  if (!runState?.relics?.length) return;

  for (const relic of runState.relics) {
    const el = document.createElement('div');
    el.className = 'relic-bar-item';
    el.innerHTML = `<span class="relic-bar-label">${relic.name}</span>`;
    el.addEventListener('mouseenter', () => {
      const rect = el.getBoundingClientRect();
      _showTooltip(relic.desc, '#ffdd44', rect);
    });
    el.addEventListener('mouseleave', () => {
      _hideTooltip();
    });
    bar.appendChild(el);
  }
}

export function showScreen(id) {
  ALL_SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) {
      if (s === id) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
  renderRelicBar(runState);
}

export function setHint(text) {
  document.getElementById('action-hint').textContent = text;
}

export function render() {
  renderBoard();
  renderHand();
  renderStatus();
  checkGameOver();
}

export function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const d = gameState ? gameState.toDict() : null;
  const lastFrom = d?.last_move?.from;
  const lastTo   = d?.last_move?.to;
  const inCheck  = d?.in_check;
  const attackerSq = d?.check_attacker_sq;
  const enemyInCheck = d?.enemy_in_check;
  const enemyAttackerSq = d?.enemy_check_attacker_sq;
  const board = d?.board || {};

  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const sqName = 'abcdefgh'[file] + (rank + 1);
      const isLight = (rank + file) % 2 === 0;
      const div = document.createElement('div');
      div.className = 'sq ' + (isLight ? 'light' : 'dark');
      div.dataset.sq = sqName;

      if (sqName === lastFrom) div.classList.add('last-move-from');
      if (sqName === lastTo)   div.classList.add('last-move-to');

      if (inCheck) {
        const p = board[sqName];
        if (p && p.type === 'king' && p.color === 'white') div.classList.add('in-check');
        if (sqName === attackerSq) div.classList.add('check-attacker');
      }
      if (enemyInCheck) {
        const p = board[sqName];
        if (p && p.type === 'king' && p.color === 'black') div.classList.add('in-check');
        if (sqName === enemyAttackerSq) div.classList.add('check-attacker');
      }

      if ((uiState.phase === 'from_selected' || uiState.phase === 'knight_from_selected' || uiState.phase === 'geometric_from_selected' || uiState.phase === 'pawn_boost_from_selected' || uiState.phase === 'debug_from_selected' || uiState.phase === 'move_duck_from_selected' || uiState.phase === 'sacrifice_target_selected') && uiState.fromSq === sqName) {
        div.classList.add('selected-from');
      }
      if (uiState.knightTargets.includes(sqName))   div.classList.add('knight-target');
      if (uiState.legalDests.includes(sqName))      div.classList.add('legal-dest');
      if (uiState.powerDests.includes(sqName))      div.classList.add('power-dest');
      if (uiState.summonTargets.includes(sqName))   div.classList.add('summon-target');
      if (uiState.geometricTargets.includes(sqName)) div.classList.add('legal-dest');
      if (uiState.pawnBoostTargets.includes(sqName)) div.classList.add('legal-dest');
      if (uiState.debugDests.includes(sqName))      div.classList.add('legal-dest');

      const piece = board[sqName];
      if (piece) {
        const img = document.createElement('img');
        const imageData = PIECES[piece.color];
        img.src = imageData ? imageData[piece.type] : '';
        img.className = 'piece-img';
        img.alt = piece.color + ' ' + piece.type;
        div.appendChild(img);
        // Status badges
        if (piece.tags && piece.tags.length > 0) {
          const badges = document.createElement('div');
          badges.className = 'piece-status-badges';
          for (const tag of piece.tags) {
            const color = STATUS_BADGE_COLORS[tag];
            if (!color) continue;
            const dot = document.createElement('span');
            dot.className = 'status-badge';
            dot.style.backgroundColor = color;
            dot.title = tag;
            badges.appendChild(dot);
          }
          if (badges.children.length > 0) div.appendChild(badges);
        }
      }
      div.addEventListener('click', () => handleSquareClick(sqName));
      boardEl.appendChild(div);
    }
  }
}

const CARD_ART_COLORS = {
  move: '#3a5a8a',
  curse: '#5a1a7a',
};
function cardArtColor(card) {
  if (card.type === 'piece') {
    return '#e8e8e8';
  }
  return CARD_ART_COLORS[card.type] || '#3a3a3a';
}

export function makeCardEl(card, { onClick } = {}) {
  const div = document.createElement('div');
  div.className = 'card';
  if (card.type === 'curse') {
    div.classList.add('curse-card');
    div.setAttribute('aria-disabled', 'true');
  } else {
    const rarityMap = { uncommon: 'rarity-uncommon', rare: 'rarity-rare' };
    if (card.rarity && rarityMap[card.rarity]) div.classList.add(rarityMap[card.rarity]);
    if (onClick) div.addEventListener('click', onClick);
  }
  const art = document.createElement('div');
  art.className = 'card-art';
  art.style.background = cardArtColor(card);
  if (card.image) {
    const cardImg = document.createElement('img');
    cardImg.src = card.image;
    cardImg.className = 'card-art-img';
    cardImg.alt = card.name;
    cardImg.onerror = () => {
      if (cardImg.parentNode) cardImg.remove();
    };
    art.appendChild(cardImg);
  }
  div.appendChild(art);
  const name = document.createElement('div');
  name.className = 'card-name' + (card.upgraded ? ' upgraded' : '');
  name.textContent = card.name;
  div.appendChild(name);
  if (card.desc) {
    const descEl = document.createElement('div');
    descEl.className = 'card-desc';
    _parseCardDesc(card.desc, descEl);
    div.appendChild(descEl);
  }
  if (card.charm) {
    const badge = document.createElement('div');
    badge.className = 'charm-badge';
    _parseCardDesc(`{${card.charm.id}}`, badge);
    div.appendChild(badge);
  }
  if (card.type === 'curse') {
    const unplayable = document.createElement('div');
    unplayable.className = 'card-cost';
    unplayable.textContent = 'Unplayable';
    div.appendChild(unplayable);
  }
  return div;
}

function sortCardsByType(cards) {
  const typeOrder = { move: 0, piece: 1, curse: 2 };
  return [...cards].sort((a, b) => {
    const typeA = typeOrder[a.type] ?? 99;
    const typeB = typeOrder[b.type] ?? 99;
    if (typeA !== typeB) return typeA - typeB;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export function renderHand() {
  const handEl = document.getElementById('hand');
  handEl.innerHTML = '';
  if (!gameState) return;
  const d = gameState.toDict();
  d.hand.forEach((card, idx) => {
    const onClick = card.type !== 'curse'
      ? () => handleCardClick(idx, card)
      : undefined;
    const div = makeCardEl(card, { onClick });
    if (card.type !== 'curse') {
      if (idx === uiState.selectedCardIndex) div.classList.add('selected');
    }
    handEl.appendChild(div);
  });
}

export function renderStatus() {
  if (!gameState) return;
  const d = gameState.toDict();
  const statusEl = document.getElementById('status-bar');
  statusEl.className = '';
  if (d.turn === 'player') {
    let msg = d.in_check ? 'Your turn — CHECK!' : 'Your turn';
    if (d.enemy_will_double_move) msg += '  ⚠ The Duelist is preparing a double move!';
    statusEl.textContent = msg;
    statusEl.classList.add('your-turn');
  } else if (d.turn === 'enemy') {
    statusEl.textContent = 'Enemy thinking…';
    statusEl.classList.add('enemy-turn');
  } else if (d.turn === 'player_won') {
    statusEl.textContent = 'You win!';
    statusEl.classList.add('game-over');
  } else if (d.turn === 'enemy_won') {
    statusEl.textContent = 'Game over.';
    statusEl.classList.add('game-over');
  }
  const btnDeck = document.getElementById('btn-deck');
  const btnDiscard = document.getElementById('btn-discard');
  if (btnDeck) btnDeck.textContent = `Deck (${d.deck_size})`;
  if (btnDiscard) btnDiscard.textContent = `Discard (${d.discard_size})`;
  const btnRedraw = document.getElementById('btn-redraw');
  if (btnRedraw) {
    btnRedraw.disabled = d.turn !== 'player';
    document.getElementById('redraw-countdown').textContent = d.redraw_countdown;
    if (d.redraw_countdown === 0) {
      btnRedraw.classList.add('ready');
    } else {
      btnRedraw.classList.remove('ready');
    }
  }
}

function showPileModal(title, cards) {
  const modal = document.getElementById('pile-modal');
  const titleEl = document.getElementById('pile-title');
  const grid = document.getElementById('pile-grid');

  titleEl.textContent = title;
  grid.innerHTML = '';

  cards.forEach(card => {
    const el = makeCardEl(card);
    el.style.cursor = 'default';
    grid.appendChild(el);
  });

  modal.classList.remove('hidden');
}

function hidePileModal() {
  document.getElementById('pile-modal').classList.add('hidden');
}

export function initPileButtons() {
  const btnDeck = document.getElementById('btn-deck');
  const btnDiscard = document.getElementById('btn-discard');
  const btnClose = document.getElementById('pile-close');
  const modal = document.getElementById('pile-modal');

  if (btnDeck) {
    btnDeck.addEventListener('click', () => {
      if (!gameState) return;
      const d = gameState.toDict();
      const sorted = sortCardsByType(d.deck);
      showPileModal(`Deck (${d.deck.length} cards)`, sorted);
    });
  }

  if (btnDiscard) {
    btnDiscard.addEventListener('click', () => {
      if (!gameState) return;
      const d = gameState.toDict();
      const ordered = [...d.discard].reverse();
      showPileModal(`Discard Pile (${d.discard.length} cards)`, ordered);
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', hidePileModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hidePileModal();
    });
  }
}

function checkGameOver() {
  if (!gameState || uiState.gameOverHandled) return;
  const d = gameState.toDict();
  if (d.turn !== 'player_won' && d.turn !== 'enemy_won') return;
  uiState.gameOverHandled = true;
  setTimeout(() => {
    if (d.turn === 'player_won') handleBattleWon();
    else handleBattleDefeated();
  }, 600);
}

/**
 * Centralized post-action handler.
 * Checks for pawn promotions after any board-changing action.
 * If player pawns need promotion, shows modal.
 * Otherwise proceeds to enemy turn.
 */
function handlePostAction() {
  const promoResult = gameState.checkPromotions();
  if (promoResult.playerPromos.length > 0) {
    uiState.pendingPromos = promoResult.playerPromos.map(s => ({ sq: s, cardType: null }));
    showNextPromo();
  } else {
    resetUiState(); setHint(''); render();
    playoutEnemyTurn();
  }
}

// Play out enemy turn moves one at a time with renders between each
async function playoutEnemyTurn() {
  // Wait for the browser to paint the player's move before starting enemy sequence
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 200);
    });
  });

  const seq = gameState.executeEnemyTurnSequence();
  if (seq.error) {
    console.error('[playoutEnemyTurn] error:', seq.error);
    return;
  }

  // First move is already executed by startEnemyTurn, render it
  render();

  // If game ended on first move or no remaining moves, finish sequence
  if (seq.gameEnded || seq.remainingMoves.length === 0) {
    gameState.finishEnemyTurnSequence(seq.warnNext);
    render();
    return;
  }

  // Execute remaining moves one by one with a small render delay
  for (const move of seq.remainingMoves) {
    // Wait a frame for visual pacing
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = gameState.executeNextEnemyMove(move);
    render();

    if (result.gameEnded) break;
  }

  // Finish the turn (set turn back to player, update redraw countdown)
  gameState.finishEnemyTurnSequence(seq.warnNext);
  render();
}

function pickEnemy(nodeType) {
  const key = runState?.pendingNode?.enemyKey;
  if (key) return key;
  if (nodeType === 'elite') return ELITE_ENEMY;
  if (nodeType === 'boss')  return BOSS_ENEMY;
  return REGULAR_ENEMIES[Math.floor(Math.random() * REGULAR_ENEMIES.length)];
}

function showBattleReward() {
  if (!runState) return;
  const nodeType = runState.pendingNode?.type;

  if (nodeType === 'elite') {
    // Elite gives charm reward
    const showCharmReward = () => {
      const choices = pickCharmChoices(3);
      renderCharmRewardScreen(choices, (i, charm) => {
        renderCharmApplyScreen(runState.deck, charm, (deckIdx) => {
          const card = runState.deck[deckIdx];
          const result = applyCharmToCard(card, charm);
          if (result.error) {
            alert(result.error);
            return;
          }
          runState.deck[deckIdx] = result;
          advanceAfterRoom();
        });
      }, showCharmReward);
    };
    runState.phase = 'room';
    showScreen('screen-room');
    showCharmReward();
  } else if (nodeType === 'treasure') {
    const showTreasureReward = () => {
      const choices = pickPieceChoices(3);
      renderPieceRewardScreen(choices, runState, () => advanceAfterRoom(), showTreasureReward);
    };
    runState.phase = 'room';
    showScreen('screen-room');
    showTreasureReward();
  } else {
    const showCardReward = () => {
      const choices = pickCardChoices(3, runState.character);
      renderCardRewardScreen(choices, (i, card) => {
        runState.addRewardCard(card);
        advanceAfterRoom();
      }, showCardReward);
    };
    runState.phase = 'room';
    showScreen('screen-room');
    showCardReward();
  }
}

export function handleBattleWon() {
  if (!runState) return;
  const enemyDef = currentEnemyKey ? ENEMIES[currentEnemyKey] : null;
  const enemyName = enemyDef?.name ?? 'the enemy';
  showScreen('screen-victory');
  document.getElementById('victory-message').textContent = `You defeated ${enemyName}!`;
  document.getElementById('btn-victory-continue').onclick = showBattleReward;
}

export function handleBattleDefeated() {
  if (!runState) return;
  runState.recordDefeat();
  if (runState.isDefeated()) {
    showScreen('screen-select');
    return;
  }
  showScreen('screen-defeat');
  renderDefeatScreen(
    () => {
      // Add curse card
      runState.addRewardCard(curseCard());
      startBattle(runState.pendingNode?.type || 'monster');
    },
    () => {
      // Retry — use a life (already recorded above)
      startBattle(runState.pendingNode?.type || 'monster');
    },
  );
}

const NODE_TYPE_LABELS = { monster: 'Normal Enemy', elite: 'Elite Enemy', boss: 'Boss' };

function renderSidebar(enemyKey, nodeType) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const enemy = ENEMIES[enemyKey];
  if (!enemy) { sidebar.innerHTML = ''; return; }

  const panel = document.createElement('div');
  panel.className = 'enemy-panel';

  const nameEl = document.createElement('div');
  nameEl.className = 'enemy-panel-name';
  nameEl.textContent = enemy.name;
  panel.appendChild(nameEl);

  const typeLabel = NODE_TYPE_LABELS[nodeType];
  if (typeLabel) {
    const badge = document.createElement('div');
    badge.className = 'enemy-type-badge';
    badge.dataset.type = nodeType;
    badge.textContent = typeLabel;
    panel.appendChild(badge);
  }

  const divider = document.createElement('hr');
  divider.className = 'enemy-panel-divider';
  panel.appendChild(divider);

  const abilityName = document.createElement('div');
  abilityName.className = 'ability-name';
  abilityName.textContent = enemy.specialAbility.name;
  panel.appendChild(abilityName);

  const abilityDesc = document.createElement('div');
  abilityDesc.className = 'ability-desc';
  abilityDesc.textContent = enemy.specialAbility.description;
  panel.appendChild(abilityDesc);

  sidebar.innerHTML = '';
  sidebar.appendChild(panel);
}

function startBattle(nodeType) {
  const enemy = pickEnemy(nodeType);
  currentEnemyKey = enemy;
  gameState = new GameState(
    runState.character,
    enemy,
    runState.deck,
    runState.startingPieces,
    runState,
  );
  resetUiState();
  showScreen('screen-game');
  renderSidebar(enemy, nodeType);
  render();
}

function advanceAfterRoom() {
  const nextFloor = runState.currentFloor + 1;
  if (nextFloor > 16) {
    runState.phase = 'complete';
    showScreen('screen-complete');
    document.getElementById('complete-message').textContent =
      `You defeated the Boss Duelist and completed the run on floor ${runState.currentFloor}!`;
    return;
  }
  runState.advanceToFloor(nextFloor);
  runState.phase = 'map';
  showScreen('screen-map');
  renderPathTrack(runState, handleNodeChosen);
}

function renderPathTrack(rs, onEnter) {
  const header = document.getElementById('map-header');
  const content = document.getElementById('map-content');
  if (!header || !content) return;

  header.textContent = `Lives: ${rs.lives}`;
  content.innerHTML = '';

  const track = document.createElement('div');
  track.className = 'path-track';

  FIXED_PATH.forEach((pathNode, i) => {
    const floor = i + 1;
    const isCurrent = floor === rs.currentFloor;
    const isDone = floor < rs.currentFloor;

    const cell = document.createElement('div');
    cell.className = 'path-cell';

    const nodeEl = document.createElement('div');
    nodeEl.className = 'path-node' + (isDone ? ' done' : isCurrent ? ' current' : ' future');
    nodeEl.dataset.type = pathNode.type;

    const floorNum = document.createElement('span');
    floorNum.className = 'path-floor-num';
    floorNum.textContent = floor;

    const icon = document.createElement('span');
    icon.className = 'path-node-icon';
    icon.textContent = isDone ? '✓' : pathNode.icon;

    const label = document.createElement('span');
    label.className = 'path-node-label';
    label.textContent = pathNode.label;

    const COMBAT_TYPE_LABELS = { monster: 'Normal Enemy', elite: 'Elite Enemy', boss: 'Boss' };
    const typeText = COMBAT_TYPE_LABELS[pathNode.type];
    const typeSpan = typeText ? document.createElement('span') : null;
    if (typeSpan) {
      typeSpan.className = 'path-node-type';
      typeSpan.textContent = typeText;
    }

    nodeEl.appendChild(floorNum);
    nodeEl.appendChild(icon);
    nodeEl.appendChild(label);
    if (typeSpan) nodeEl.appendChild(typeSpan);
    cell.appendChild(nodeEl);

    if (isCurrent) {
      const enterBtn = document.createElement('button');
      enterBtn.className = 'path-enter-btn';
      enterBtn.textContent = 'Enter';
      enterBtn.addEventListener('click', () => onEnter(0));
      cell.appendChild(enterBtn);
    }

    if (i < FIXED_PATH.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'path-connector' + (isDone ? ' done' : '');
      track.appendChild(cell);
      track.appendChild(connector);
    } else {
      track.appendChild(cell);
    }
  });

  content.appendChild(track);

  // Debug: floor selector
  const debugContainer = document.getElementById('map-debug');
  if (debugContainer) {
    debugContainer.innerHTML = '';
    const debugDiv = document.createElement('div');
    debugDiv.style.marginTop = '1.5rem';
    debugDiv.style.padding = '0.75rem';
    debugDiv.style.border = '1px solid #663333';
    debugDiv.style.borderRadius = '4px';
    debugDiv.style.backgroundColor = '#1a1a1a';
    
    const label = document.createElement('label');
    label.textContent = 'Debug Floor: ';
    label.style.color = '#cc8888';
    label.style.fontSize = '0.85rem';
    label.style.marginRight = '0.5rem';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '16';
    input.value = rs.currentFloor;
    input.style.width = '60px';
    input.style.padding = '0.3rem';
    input.style.marginRight = '0.5rem';
    
    const button = document.createElement('button');
    button.textContent = 'Jump';
    button.className = 'debug-btn';
    button.addEventListener('click', () => {
      const floor = parseInt(input.value, 10);
      if (floor >= 1 && floor <= 16) {
        handleDebugFloor(floor);
      }
    });
    
    debugDiv.appendChild(label);
    debugDiv.appendChild(input);
    debugDiv.appendChild(button);
    debugContainer.appendChild(debugDiv);
  }

  // Scroll current floor into view
  requestAnimationFrame(() => {
    const currentCell = track.querySelector('.path-node.current');
    if (currentCell) currentCell.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
}

export function handleNodeChosen(index) {
  runState.enterRoom(index);
  const node = runState.pendingNode;

  if (runState.phase === 'battle') {
    startBattle(node.type);
  } else {
    handleRoomEntered(node);
  }
}

export function handleRoomEntered(node) {
  showScreen('screen-room');
  if (node.type === 'piece_reward') {
    const showPieceReward = () => {
      const choices = pickPieceCardChoices(3);
      renderCardRewardScreen(choices, (i, card) => {
        runState.addRewardCard(card);
        advanceAfterRoom();
      }, showPieceReward, 'Choose a piece reward');
    };
    showPieceReward();
  } else if (node.type === 'transform') {
    const showTransform = () => {
      renderTransformScreen(runState.deck, (deckIdx, oldCard) => {
        const newCard = pickTransformCard(oldCard, runState.character);
        // Handle charm retention
        let finalCard = newCard;
        if (oldCard.charm) {
          const result = applyCharmToCard(newCard, oldCard.charm);
          if (!result.error) {
            finalCard = result;
          }
        }
        renderTransformResultScreen(oldCard, finalCard, () => {
          runState.transformCard(deckIdx, finalCard);
          advanceAfterRoom();
        });
      }, showTransform);
    };
    showTransform();
  } else if (node.type === 'treasure') {
    const showTreasure = () => {
      const choices = pickPieceChoices(3);
      renderPieceRewardScreen(choices, runState, () => advanceAfterRoom(), showTreasure);
    };
    showTreasure();
  } else if (node.type === 'relic') {
    const showRelic = () => {
      renderRelicRewardScreen(runState, () => advanceAfterRoom(), showRelic);
    };
    showRelic();
  }
}

export function handleCardClick(index, card) {
  if (!gameState || gameState.toDict().turn !== 'player') return;
  // Block switching/deselecting cards during multi-step flows
  const multiStepPhases = ['blitz_first_selected', 'blitz_second_selected', 'move_together_first_selected', 'move_together_second_piece', 'move_together_second_from_selected'];
  if (multiStepPhases.includes(uiState.phase)) {
    setHint('Complete current card first');
    return;
  }
  if (uiState.phase !== 'idle' && uiState.selectedCardIndex === index) {
    resetUiState(); setHint(''); render(); return;
  }
  const d = gameState.toDict();
  resetUiState();
  uiState.phase = 'card_selected';
  uiState.selectedCardIndex = index;
  uiState.selectedCardType = card.type;
  uiState.selectedMoveVariant = card.moveVariant || null;
  uiState.selectedPieceType = card.piece || null;
  if (card.type === 'move' && !card.moveVariant) {
    setHint('Click a friendly piece to move');
  } else if (card.type === 'move' && card.moveVariant === 'knight') {
    setHint('Knight Move: click a friendly piece to teleport');
  } else if (card.type === 'move' && card.moveVariant === 'bishop') {
    setHint('Bishop Move: click a friendly piece to move diagonally');
  } else if (card.type === 'move' && card.moveVariant === 'rook') {
    setHint('Rook Move: click a friendly piece to move in a straight line');
  } else if (card.type === 'move' && card.moveVariant === 'queen') {
    setHint('Queen Move: click a friendly piece to move diagonally or straight');
  } else if (card.type === 'move' && card.moveVariant === 'pawn_boost') {
    setHint('Pawn Boost: click a friendly pawn to slide forward');
  } else if (card.type === 'move' && card.moveVariant === 'atomic') {
    setHint('Atomic Move: click a friendly piece to move and explode on capture');
  } else if (card.type === 'move' && card.moveVariant === 'push') {
    setHint('Push Move: click a friendly piece to move and push adjacent pieces');
  } else if (card.type === 'piece') {
    if (card.piece === 'duck') {
      uiState.phase = 'summon_duck_selected';
      uiState.summonTargets = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sqName = rcToSq(r, c);
          if (!d.board[sqName]) uiState.summonTargets.push(sqName);
        }
      }
      setHint('Click any empty square to place duck');
    } else {
      const validRanks = ['1', '2'];
      uiState.summonTargets = 'abcdefgh'.split('').flatMap(f =>
        validRanks.map(r => f + r)
      ).filter(sq => !d.board[sq]);
      setHint(`Click a highlighted square to place ${card.piece}`);
    }
  } else if (card.type === 'move' && card.moveVariant === 'duck') {
    uiState.phase = 'move_duck_selected';
    setHint('Click a duck to move');
  } else if (card.type === 'action' && card.actionType === 'stun') {
    uiState.phase = 'stun_selected';
    setHint('Click any piece to stun');
  } else if (card.type === 'action' && card.actionType === 'shield') {
    uiState.phase = 'shield_selected';
    setHint('Click any piece to shield');
  } else if (card.type === 'action' && card.actionType === 'sacrifice') {
    uiState.phase = 'sacrifice_selected';
    setHint('Click a friendly piece to sacrifice');
  } else if (card.type === 'action' && card.actionType === 'unblock') {
    uiState.phase = 'unblock_selected';
    setHint('Click any piece to make ghost');
  } else if (card.type === 'move' && card.moveVariant === 'swap') {
    uiState.phase = 'swap_move_selected';
    setHint('Click a friendly piece to swap');
  } else if (card.type === 'move' && card.moveVariant === 'teleport') {
    uiState.phase = 'teleport_selected';
    setHint('Teleport: click a friendly piece');
  } else if (card.type === 'action' && card.actionType === 'snap') {
    uiState.phase = 'snap_selected';
    setHint('Snap: click a friendly piece');
  } else if (card.type === 'action' && card.actionType?.endsWith('_power')) {
    uiState.phase = 'power_selected';
    setHint(`Power: click a friendly piece to apply ${card.actionType.replace('_power', '')} power`);
  } else if (card.type === 'move' && card.moveVariant === 'blitz') {
    uiState.phase = 'blitz_selected';
    setHint('Blitz: click a friendly piece');
  } else if (card.type === 'move' && card.moveVariant === 'move_together') {
    uiState.phase = 'move_together_selected';
    setHint('Move Together: click first friendly piece');
  }
  render();
}

function showNextPromo() {
  if (uiState.pendingPromos.length === 0) {
    resetUiState(); render(); return;
  }
  document.getElementById('promotion-modal').classList.remove('hidden');
}

// ─── piece detail panel ───────────────────────────────────────────────────────

function renderPieceDetailMoves(sq, legalMoves) {
  const container = document.getElementById('piece-detail-moves');
  container.innerHTML = '';
  const legalSet = new Set(legalMoves);
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const sqName = 'abcdefgh'[file] + (rank + 1);
      const isLight = (rank + file) % 2 === 0;
      const div = document.createElement('div');
      div.className = 'piece-detail-move-sq ' + (isLight ? 'light' : 'dark');
      if (sqName === sq) {
        div.classList.add('current');
        div.textContent = '●';
      } else if (legalSet.has(sqName)) {
        div.classList.add('legal');
        div.textContent = '◆';
      }
      container.appendChild(div);
    }
  }
}

export function showPieceDetail(sq) {
  const d = gameState ? gameState.toDict() : null;
  const piece = d?.board[sq];
  if (!piece) return;

  const panel = document.getElementById('piece-detail');
  const img = document.getElementById('piece-detail-img');
  const name = document.getElementById('piece-detail-name');
  const value = document.getElementById('piece-detail-value');
  const status = document.getElementById('piece-detail-status');

  const imageData = PIECES[piece.color];
  img.src = imageData ? imageData[piece.type] : '';
  img.alt = piece.color + ' ' + piece.type;

  const ownerLabel = piece.color === 'white' ? 'Player' : piece.color === 'black' ? 'Enemy' : 'Neutral';
  name.textContent = ownerLabel + ' ' + piece.type;

  const val = PIECE_VALUES[piece.type] ?? 0;
  value.textContent = 'Value: ' + val;

  status.innerHTML = '';
  if (piece.tags && piece.tags.length > 0) {
    for (const tag of piece.tags) {
      const span = document.createElement('span');
      span.className = 'piece-detail-status-tag';
      span.textContent = tag;
      const color = STATUS_BADGE_COLORS[tag];
      if (color) span.style.backgroundColor = color;
      status.appendChild(span);
    }
  }

  const legalMoves = gameState.legalMovesForPiece(sq);
  renderPieceDetailMoves(sq, legalMoves);

  panel.classList.remove('hidden');
  uiState.pieceDetailSq = sq;
}

export function hidePieceDetail() {
  const panel = document.getElementById('piece-detail');
  panel.classList.add('hidden');
  uiState.pieceDetailSq = null;
}

/** Generate king-like destination squares for a duck (no captures). */
function duckDestsFor(board, sq, moveVariant = null) {
  const moves = [];

  if (!moveVariant || moveVariant === 'blitz' || moveVariant === 'move_together') {
    // Normal/blitz/move_together: king-like moves (1 square, no capture)
    const [r, c] = sqToRC(sq);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const nsq = rcToSq(nr, nc);
        if (!board[nsq]) moves.push(nsq);
      }
    }
  } else if (moveVariant === 'knight') {
    // Knight: L-shape moves to empty squares
    moves.push(...knightAttacks(sq).filter(nsq => !board[nsq]));
  } else if (moveVariant === 'bishop' || moveVariant === 'rook' || moveVariant === 'queen') {
    // Geometric moves to empty squares
    const patternMap = { bishop: 'b', rook: 'r', queen: 'q' };
    const pattern = patternMap[moveVariant];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const nsq = rcToSq(r, c);
        if (nsq === sq) continue;
        if (board[nsq]) continue;
        if (matchesPattern(board, sq, nsq, pattern)) {
          moves.push(nsq);
        }
      }
    }
  } else if (moveVariant === 'teleport') {
    // Teleport: any empty square
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const nsq = rcToSq(r, c);
        if (nsq !== sq && !board[nsq]) moves.push(nsq);
      }
    }
  } else if (moveVariant === 'swap') {
    // Swap: friendly pieces (not empty squares)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const nsq = rcToSq(r, c);
        if (nsq === sq) continue;
        const piece = board[nsq];
        if (piece && piece.color === 'white') moves.push(nsq);
      }
    }
  }

  return moves;
}

export function handleSquareClick(sq) {
  const d = gameState ? gameState.toDict() : null;

  // Debug move mode: intercept clicks before idle check
  if (uiState.debugMove && uiState.phase === 'idle') {
    const piece = d?.board[sq];
    if (piece && piece.color === 'white') {
      uiState.phase = 'debug_from_selected';
      uiState.fromSq = sq;
      // debugDests = all 64 squares except fromSq
      uiState.debugDests = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const dest = 'abcdefgh'[c] + (r + 1);
          if (dest !== sq) uiState.debugDests.push(dest);
        }
      }
      setHint('Click a destination square (or same piece to cancel)');
      render();
      return;
    }
  }

  // Debug move destination phase
  if (uiState.phase === 'debug_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'idle';
      uiState.fromSq = null;
      uiState.debugDests = [];
      setHint('');
      render();
      return;
    }
    const result = gameState.debugMovePiece(uiState.fromSq, sq);
    if (result.error) {
      setHint(result.error);
      return;
    }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'idle') {
    const piece = d?.board[sq];
    if (piece) {
      showPieceDetail(sq);
    } else {
      hidePieceDetail();
    }
    return;
  }

  if (uiState.phase === 'card_selected') {
    if (uiState.selectedCardType === 'move' && !uiState.selectedMoveVariant) {
      const piece = d.board[sq];
      const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
      if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
        if (hasDuckHandler && piece.type === 'duck') {
          // Generate king-like moves for duck (no captures)
          const [r, c] = sqToRC(sq);
          const moves = [];
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (!inBounds(nr, nc)) continue;
              const nsq = rcToSq(nr, nc);
              if (!d.board[nsq]) moves.push(nsq);
            }
          }
          uiState.legalDests = moves;
        } else {
          uiState.legalDests = gameState.legalDestinationsFor(sq);
          uiState.powerDests = gameState.powerDestsFor(sq);
        }
        uiState.phase = 'from_selected';
        uiState.fromSq = sq;
        setHint('Click a highlighted square to move to');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'move' && uiState.selectedMoveVariant === 'knight') {
      const piece = d.board[sq];
      const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
      if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
        uiState.phase = 'knight_from_selected';
        uiState.fromSq = sq;
        if (hasDuckHandler && piece.type === 'duck') {
          uiState.knightTargets = duckDestsFor(d.board, sq, 'knight');
        } else {
          uiState.knightTargets = knightAttacks(sq).filter(t => {
            const p = d.board[t];
            return !p || p.color === 'black';
          });
        }
        setHint('Click a highlighted square to teleport');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'move' && ['bishop', 'rook', 'queen'].includes(uiState.selectedMoveVariant)) {
      const piece = d.board[sq];
      const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
      if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
        const patternMap = { bishop: 'b', rook: 'r', queen: 'q' };
        uiState.phase = 'geometric_from_selected';
        uiState.fromSq = sq;
        if (hasDuckHandler && piece.type === 'duck') {
          uiState.geometricTargets = duckDestsFor(d.board, sq, uiState.selectedMoveVariant);
        } else {
          uiState.geometricTargets = gameState.geometricDestsFor(sq, patternMap[uiState.selectedMoveVariant]);
        }
        setHint('Click a highlighted square to move to');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'move' && uiState.selectedMoveVariant === 'pawn_boost') {
      const piece = d.board[sq];
      if (piece && piece.color === 'white' && piece.type === 'pawn') {
        uiState.phase = 'pawn_boost_from_selected';
        uiState.fromSq = sq;
        uiState.pawnBoostTargets = gameState.pawnBoostDestsFor(sq);
        setHint('Click a highlighted square to boost to');
        render();
      } else {
        setHint('Pick a friendly pawn');
      }
    } else if (uiState.selectedCardType === 'move' && ['atomic', 'push'].includes(uiState.selectedMoveVariant)) {
      const piece = d.board[sq];
      if (piece && piece.color === 'white') {
        uiState.phase = 'from_selected';
        uiState.fromSq = sq;
        uiState.legalDests = gameState.legalDestinationsFor(sq);
        setHint('Click a highlighted square to move to');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'piece') {
      if (uiState.summonTargets.length && !uiState.summonTargets.includes(sq)) {
        setHint('Invalid placement square'); return;
      }
      if (d.board[sq]) { setHint('Square is occupied'); return; }
      const result = gameState.playPieceCard(uiState.selectedCardIndex, uiState.selectedPieceType, sq);
      if (result.error) { setHint(result.error); return; }
      handlePostAction();
    }
    return;
  }

  if (uiState.phase === 'from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'card_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Click a friendly piece to move');
      render(); return;
    }
    const result = gameState.playMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'knight_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'card_selected';
      uiState.fromSq = null;
      uiState.knightTargets = [];
      setHint('Knight Move: click a friendly piece to teleport');
      render(); return;
    }
    if (!uiState.knightTargets.includes(sq)) {
      setHint('Not a valid knight-jump square'); return;
    }
    const result = gameState.playKnightMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
  }

  if (uiState.phase === 'geometric_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'card_selected';
      uiState.fromSq = null;
      uiState.geometricTargets = [];
      setHint('Click a friendly piece');
      render(); return;
    }
    if (!uiState.geometricTargets.includes(sq)) {
      setHint('Not a valid destination for this card'); return;
    }
    const playFn = {
      bishop: () => gameState.playBishopMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq),
      rook:   () => gameState.playRookMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq),
      queen:  () => gameState.playQueenMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq),
    }[uiState.selectedMoveVariant];
    const result = playFn();
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
  }

  if (uiState.phase === 'pawn_boost_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'card_selected';
      uiState.fromSq = null;
      uiState.pawnBoostTargets = [];
      setHint('Pawn Boost: click a friendly pawn to slide forward');
      render(); return;
    }
    if (!uiState.pawnBoostTargets.includes(sq)) {
      setHint('Not a valid destination for pawn boost'); return;
    }
    const result = gameState.playPawnBoostCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
  }

  if (uiState.phase === 'summon_duck_selected') {
    if (!uiState.summonTargets.includes(sq)) {
      setHint('Invalid square'); return;
    }
    if (d.board[sq]) { setHint('Square occupied'); return; }
    const result = gameState.playSummonDuckCard(uiState.selectedCardIndex, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'move_duck_selected') {
    const piece = d.board[sq];
    if (piece && piece.type === 'duck') {
      uiState.fromSq = sq;
      uiState.phase = 'move_duck_from_selected';
      uiState.legalDests = [];
      uiState.powerDests = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const dest = 'abcdefgh'[c] + (r + 1);
          if (!d.board[dest]) uiState.legalDests.push(dest);
        }
      }
      setHint('Click a square to move duck to');
      render();
    } else {
      setHint('Pick a duck');
    }
    return;
  }

  if (uiState.phase === 'move_duck_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'move_duck_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Click a duck to move');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Invalid destination'); return;
    }
    const result = gameState.playMoveDuckCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'stun_selected') {
    const piece = d.board[sq];
    if (piece) {
      const result = gameState.playStunCard(uiState.selectedCardIndex, sq);
      if (result.error) { setHint(result.error); return; }
      handlePostAction();
    } else {
      setHint('Pick a piece');
    }
    return;
  }

  if (uiState.phase === 'shield_selected') {
    const piece = d.board[sq];
    if (piece) {
      const result = gameState.playShieldCard(uiState.selectedCardIndex, sq);
      if (result.error) { setHint(result.error); return; }
      handlePostAction();
    } else {
      setHint('Pick a piece');
    }
    return;
  }

  if (uiState.phase === 'sacrifice_selected') {
    const piece = d.board[sq];
    if (piece && piece.color === 'white') {
      uiState.fromSq = sq;
      uiState.phase = 'sacrifice_target_selected';
      const sacrificedVal = PIECE_VALUES[piece.type] ?? 0;
      uiState.legalDests = [];
      uiState.powerDests = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const dest = 'abcdefgh'[c] + (r + 1);
          const enemy = d.board[dest];
          if (enemy && enemy.color === 'black') {
            const enemyVal = PIECE_VALUES[enemy.type] ?? 0;
            if (enemyVal < sacrificedVal) uiState.legalDests.push(dest);
          }
        }
      }
      if (uiState.legalDests.length === 0) {
        setHint('No weaker enemy pieces');
        resetUiState(); render(); return;
      }
      setHint('Click a weaker enemy piece to destroy');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'sacrifice_target_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'sacrifice_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Click a friendly piece to sacrifice');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Invalid target'); return;
    }
    const result = gameState.playSacrificeCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'unblock_selected') {
    const piece = d.board[sq];
    if (piece) {
      const result = gameState.playUnblockCard(uiState.selectedCardIndex, sq);
      if (result.error) { setHint(result.error); return; }
      handlePostAction();
    } else {
      setHint('Pick a piece');
    }
    return;
  }

  if (uiState.phase === 'swap_move_selected') {
    const piece = d.board[sq];
    const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
    if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
      uiState.fromSq = sq;
      uiState.phase = 'swap_move_target_selected';
      if (hasDuckHandler && piece.type === 'duck') {
        uiState.legalDests = duckDestsFor(d.board, sq, 'swap');
      } else {
        uiState.legalDests = [];
      uiState.powerDests = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const dest = 'abcdefgh'[c] + (r + 1);
            const friendly = d.board[dest];
            if (friendly && friendly.color === 'white' && dest !== sq) {
              uiState.legalDests.push(dest);
            }
          }
        }
      }
      if (uiState.legalDests.length === 0) {
        setHint('No other friendly pieces');
        resetUiState(); render(); return;
      }
      setHint('Click another friendly piece to swap with');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'swap_move_target_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'swap_move_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Click a friendly piece to swap');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Invalid target'); return;
    }
    const result = gameState.playSwapMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'teleport_selected') {
    const piece = d.board[sq];
    const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
    if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
      uiState.fromSq = sq;
      uiState.phase = 'teleport_from_selected';
      if (hasDuckHandler && piece.type === 'duck') {
        uiState.legalDests = duckDestsFor(d.board, sq, 'teleport');
      } else {
        uiState.legalDests = [];
      uiState.powerDests = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const dest = 'abcdefgh'[c] + (r + 1);
            if (!d.board[dest]) uiState.legalDests.push(dest);
          }
        }
      }
      setHint('Click an empty square to teleport to');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'teleport_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'teleport_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Teleport: click a friendly piece');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Must be an empty square'); return;
    }
    const result = gameState.playTeleportCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'snap_selected') {
    const piece = d.board[sq];
    if (piece && piece.color === 'white') {
      uiState.fromSq = sq;
      uiState.phase = 'snap_from_selected';
      const moves = gameState.legalMovesForPiece(sq);
      uiState.legalDests = moves.filter(dest => {
        const target = d.board[dest];
        return target && target.color === 'black';
      });
      if (uiState.legalDests.length === 0) {
        setHint('No legal captures');
        resetUiState(); render(); return;
      }
      setHint('Click an enemy piece to capture');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'snap_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'snap_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Snap: click a friendly piece');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Not a legal capture target'); return;
    }
    const result = gameState.playSnapCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'power_selected') {
    const piece = d.board[sq];
    if (piece && piece.color === 'white') {
      const result = gameState.playPowerCard(uiState.selectedCardIndex, sq);
      if (result.error) { setHint(result.error); return; }
      handlePostAction();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'blitz_selected') {
    const piece = d.board[sq];
    const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
    if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
      uiState.fromSq = sq;
      uiState.phase = 'blitz_first_selected';
      if (hasDuckHandler && piece.type === 'duck') {
        uiState.legalDests = duckDestsFor(d.board, sq, 'blitz');
      } else {
        uiState.legalDests = gameState.legalDestinationsFor(sq);
      }
      setHint('Blitz: click first destination');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'blitz_first_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'blitz_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Blitz: click a friendly piece');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Not a legal destination'); return;
    }
    const result = gameState.playBlitzFirstMove(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    uiState.fromSq = sq;
    uiState.phase = 'blitz_second_selected';
    const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
    const destPiece = d.board[sq];
    if (hasDuckHandler && destPiece?.type === 'duck') {
      uiState.legalDests = duckDestsFor(d.board, sq, 'blitz');
    } else {
      uiState.legalDests = gameState.legalDestinationsFor(sq);
    }
    setHint('Blitz: click second destination');
    render();
    return;
  }

  if (uiState.phase === 'blitz_second_selected') {
    if (!uiState.legalDests.includes(sq)) {
      setHint('Not a legal destination'); return;
    }
    const result = gameState.playBlitzSecondMove(sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }

  if (uiState.phase === 'move_together_selected') {
    const piece = d.board[sq];
    const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
    if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
      uiState.fromSq = sq;
      uiState.phase = 'move_together_first_selected';
      if (hasDuckHandler && piece.type === 'duck') {
        uiState.legalDests = duckDestsFor(d.board, sq, 'move_together');
      } else {
        uiState.legalDests = gameState.legalDestinationsFor(sq);
      }
      setHint('Move Together: click first destination');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'move_together_first_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'move_together_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Move Together: click first friendly piece');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Not a legal destination'); return;
    }
    const result = gameState.playMoveTogetherFirst(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    uiState.phase = 'move_together_second_piece';
    setHint('Move Together: click second friendly piece');
    render();
    return;
  }

  if (uiState.phase === 'move_together_second_piece') {
    const piece = d.board[sq];
    const hasDuckHandler = runState?.relics?.some(r => r.id === 'duck_handler');
    if (piece && (piece.color === 'white' || (hasDuckHandler && piece.type === 'duck'))) {
      if (sq === gameState._moveTogetherFirstPieceSq) {
        setHint('Cannot move same piece twice'); return;
      }
      uiState.fromSq = sq;
      uiState.phase = 'move_together_second_from_selected';
      if (hasDuckHandler && piece.type === 'duck') {
        uiState.legalDests = duckDestsFor(d.board, sq, 'move_together');
      } else {
        uiState.legalDests = gameState.legalDestinationsFor(sq);
      }
      setHint('Move Together: click second destination');
      render();
    } else {
      setHint('Pick a friendly piece');
    }
    return;
  }

  if (uiState.phase === 'move_together_second_from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'move_together_second_piece';
      uiState.fromSq = null;
      uiState.legalDests = [];
      uiState.powerDests = [];
      setHint('Move Together: click second friendly piece');
      render(); return;
    }
    if (!uiState.legalDests.includes(sq)) {
      setHint('Not a legal destination'); return;
    }
    const result = gameState.playMoveTogetherSecond(uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    handlePostAction();
    return;
  }
}

export async function handleRedraw() {
  const btnRedraw = document.getElementById('btn-redraw');
  if (btnRedraw) btnRedraw.disabled = true;
  resetUiState(); setHint('');
  const result = gameState.redrawHand();
  await new Promise(r => setTimeout(r, 300));
  render();
  
  console.log('[ui] redraw free=%s', result.free);
  
  if (!result.free) {
    // Non-free redraw triggers enemy turn - need to sequence the renders
    playoutEnemyTurn();
  }
}

export function handlePromotionChoice(promoLetter) {
  document.getElementById('promotion-modal').classList.add('hidden');
  const item = uiState.pendingPromos.shift();
  const sq = item.cardType === 'move' ? item.to : item.sq;
  const result = gameState.applyPromotion(sq, promoLetter);
  if (result.error) setHint(result.error);
  
  if (uiState.pendingPromos.length === 0) {
    // All promotions done, trigger enemy turn sequence
    resetUiState(); render();
    playoutEnemyTurn();
  } else {
    // More promotions to go
    showNextPromo();
  }
}

// ─── undo (P11) ───────────────────────────────────────────────────────────────
// STUB: engine2 GameState is not yet wired to the battle UI (old engine.js still
// owns gameState). When the battle renderer migrates to engine2, replace the body
// with: engine2State.undo(); render();
export function handleUndo() {
  // TODO(P13): replace with engine2State.canUndo() / engine2State.undo() call
  console.log('[ui] handleUndo called — engine2 not yet wired to battle UI');
}

// ─── debug ────────────────────────────────────────────────────────────────────

export function handleDebugMove() {
  if (!gameState) return;
  uiState.debugMove = !uiState.debugMove;
  const btn = document.getElementById('btn-debug-move');
  if (btn) {
    if (uiState.debugMove) {
      btn.classList.add('active');
      setHint('Debug Move: click a piece to move it anywhere');
    } else {
      btn.classList.remove('active');
      resetUiState();
      setHint('');
      render();
    }
  }
}

export function handleDebugWin() {
  if (!gameState) return;
  gameState.turn = 'player_won';
  console.log('[debug] immediate win triggered');
  render();
}

export function handleDebugFloor(floor) {
  if (!runState) return;
  runState.advanceToFloor(floor);
  runState.phase = 'map';
  console.log('[debug] jumped to floor', floor);
  showScreen('screen-map');
  renderPathTrack(runState, handleNodeChosen);
}

function renderSquarePickerForPiece(pieceType, onPlaced) {
  const content = document.getElementById('room-content');
  if (!content) return;
  const typeToName = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const fullName = typeToName[pieceType] || pieceType;
  const label = fullName.charAt(0).toUpperCase() + fullName.slice(1);
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
        const typeName = placedPiece.type || placedPiece;
        const pieceName = typeToName[typeName] || typeName;
        img.src = PIECES.white[pieceName] || PIECES.white[typeName];
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

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'confirm-btn';
  confirmBtn.textContent = 'Confirm Placement';
  confirmBtn.disabled = true;
  confirmBtn.addEventListener('click', () => {
    if (selectedSq) {
      runState.addStartingPiece({ type: pieceType, color: 'w' }, selectedSq);
      if (onPlaced) onPlaced();
    }
  });
  content.appendChild(confirmBtn);
}

export function startGame(character) {
  document.getElementById('select-error').textContent = '';
  try {
    runState = new RunState(character);
    showScreen('screen-map');
    renderPathTrack(runState, handleNodeChosen);
  } catch (e) {
    document.getElementById('select-error').textContent = e.message;
  }
}
