import { GameState, knightAttacks, VALID_ENEMIES } from './battle_state.js';
import { RunState } from './run.js';
import { FIXED_PATH } from './map.js';
import {
  renderCardRewardScreen, renderPieceRewardScreen, renderUpgradeScreen,
  renderTransformScreen, renderTransformResultScreen, renderShopScreen, renderDefeatScreen,
  pickCardChoices, pickPieceChoices,
} from './rewards.js';
import { ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, BOSS_ENEMY } from './enemies2.js';
import { curseCard, bishopMoveCard, rookMoveCard, queenMoveCard } from './cards2/move_cards.js';

const PIECES = {
  white: {
    king:   './pieces/Chess_klt60.png',
    queen:  './pieces/Chess_qlt60.png',
    rook:   './pieces/Chess_rlt60.png',
    bishop: './pieces/Chess_blt60.png',
    knight: './pieces/Chess_nlt60.png',
    pawn:   './pieces/Chess_plt60.png',
  },
  black: {
    king:   './pieces/Chess_kdt60.png',
    queen:  './pieces/Chess_qdt60.png',
    rook:   './pieces/Chess_rdt60.png',
    bishop: './pieces/Chess_bdt60.png',
    knight: './pieces/Chess_ndt60.png',
    pawn:   './pieces/Chess_pdt60.png',
  },
  neutral: {
    duck:   './pieces/duck.png',
  },
};

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
  uiState.summonTargets = [];
  uiState.geometricTargets = [];
  uiState.pawnBoostTargets = [];
  uiState.gameOverHandled = false;
  uiState.debugMove = false;
  uiState.debugDests = [];
}

export function showScreen(id) {
  ALL_SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) {
      if (s === id) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
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
  const movedSet = new Set(d ? (d.moved_this_turn || []) : []);
  const summonedSet = new Set(d ? (d.summoned_this_turn || []) : []);
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

      if ((uiState.phase === 'from_selected' || uiState.phase === 'knight_from_selected' || uiState.phase === 'geometric_from_selected' || uiState.phase === 'pawn_boost_from_selected' || uiState.phase === 'debug_from_selected') && uiState.fromSq === sqName) {
        div.classList.add('selected-from');
      }
      if (uiState.knightTargets.includes(sqName))   div.classList.add('knight-target');
      if (uiState.legalDests.includes(sqName))      div.classList.add('legal-dest');
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
        if (piece.color === 'white' && (movedSet.has(sqName) || summonedSet.has(sqName))) {
          div.classList.add('already-moved');
        }
        div.appendChild(img);
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
  if (card.type === 'summon') {
    return '#e8e8e8';
  }
  return CARD_ART_COLORS[card.type] || '#3a3a3a';
}

function getCardPiece(card) {
  if (card.type === 'summon') return card.piece;
  if (card.type === 'move' && card.moveVariant) return card.moveVariant;
  return null;
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
  const piece = getCardPiece(card);
  if (piece) {
    const img = document.createElement('img');
    img.src = PIECES.white[piece];
    img.className = 'card-piece-img';
    img.alt = piece;
    art.appendChild(img);
  }
  div.appendChild(art);
  const name = document.createElement('div');
  name.className = 'card-name' + (card.upgraded ? ' upgraded' : '');
  name.textContent = card.name;
  div.appendChild(name);
  if (card.type === 'curse') {
    const unplayable = document.createElement('div');
    unplayable.className = 'card-cost';
    unplayable.textContent = 'Unplayable';
    div.appendChild(unplayable);
  }
  return div;
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
  document.getElementById('deck-info').textContent = `Deck: ${d.deck_size}  |  Discard: ${d.discard_size}  |  Lives: ${runState?.lives ?? '—'}`;
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

  if (nodeType === 'elite' || nodeType === 'treasure') {
    const choices = pickPieceChoices(3);
    runState.phase = 'room';
    showScreen('screen-room');
    renderPieceRewardScreen(choices, runState, () => advanceAfterRoom());
  } else {
    const choices = pickCardChoices(3, runState.character);
    runState.phase = 'room';
    showScreen('screen-room');
    renderCardRewardScreen(choices, (i, card) => {
      runState.addRewardCard(card);
      advanceAfterRoom();
    });
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
  button.style.padding = '0.3rem 0.7rem';
  button.style.fontSize = '0.85rem';
  button.style.background = '#2a1a1a';
  button.style.color = '#cc8888';
  button.style.border = '1px solid #663333';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.addEventListener('click', () => {
    const floor = parseInt(input.value, 10);
    if (floor >= 1 && floor <= 16) {
      handleDebugFloor(floor);
    }
  });
  button.addEventListener('mouseover', () => {
    button.style.background = '#3a2020';
  });
  button.addEventListener('mouseout', () => {
    button.style.background = '#2a1a1a';
  });
  
  debugDiv.appendChild(label);
  debugDiv.appendChild(input);
  debugDiv.appendChild(button);
  content.appendChild(debugDiv);

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
  if (node.type === 'event') {
    const choices = pickCardChoices(1, runState.character);
    if (!choices.length) { advanceAfterRoom(); return; }
    renderTransformScreen(runState.deck, runState.character, (deckIdx) => {
      const oldCard = runState.deck[deckIdx];
      const newCard = choices[0].card;
      runState.transformCard(deckIdx, newCard);
      renderTransformResultScreen(oldCard, newCard, advanceAfterRoom);
    });
  } else if (node.type === 'shop') {
    renderShopScreen(runState.deck, (deckIdx) => {
      runState.removeCard(deckIdx);
      advanceAfterRoom();
    });
  } else if (node.type === 'upgrade') {
    renderUpgradeScreen(runState.deck, (deckIdx) => {
      runState.upgradeCard(deckIdx);
      advanceAfterRoom();
    });
  } else if (node.type === 'treasure') {
    const choices = pickPieceChoices(3);
    renderPieceRewardScreen(choices, runState, () => advanceAfterRoom());
  }
}

export function handleCardClick(index, card) {
  if (!gameState || gameState.toDict().turn !== 'player') return;
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
  } else if (card.type === 'summon') {
    const validRanks = ['1', '2'];
    uiState.summonTargets = 'abcdefgh'.split('').flatMap(f =>
      validRanks.map(r => f + r)
    ).filter(sq => !d.board[sq]);
    setHint(`Click a highlighted square to summon ${card.piece}`);
  }
  render();
}

function showNextPromo() {
  if (uiState.pendingPromos.length === 0) {
    resetUiState(); render(); return;
  }
  document.getElementById('promotion-modal').classList.remove('hidden');
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
    if (result.needs_promotion) {
      uiState.pendingPromos = [{ sq: sq, cardType: null }];
      document.getElementById('promotion-modal').classList.remove('hidden');
      return;
    }
    resetUiState();
    setHint('');
    render();
    return;
  }

  if (uiState.phase === 'idle') return;

  if (uiState.phase === 'card_selected') {
    if (uiState.selectedCardType === 'move' && !uiState.selectedMoveVariant) {
      const piece = d.board[sq];
      if (piece && piece.color === 'white') {
        uiState.legalDests = gameState.legalDestinationsFor(sq);
        uiState.phase = 'from_selected';
        uiState.fromSq = sq;
        setHint('Click a highlighted square to move to');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'move' && uiState.selectedMoveVariant === 'knight') {
      const piece = d.board[sq];
      if (piece && piece.color === 'white') {
        uiState.phase = 'knight_from_selected';
        uiState.fromSq = sq;
        uiState.knightTargets = knightAttacks(sq).filter(t => {
          const p = d.board[t];
          return !p || p.color === 'black';
        });
        setHint('Click a highlighted square to teleport');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'move' && ['bishop', 'rook', 'queen'].includes(uiState.selectedMoveVariant)) {
      const piece = d.board[sq];
      if (piece && piece.color === 'white') {
        const patternMap = { bishop: 'b', rook: 'r', queen: 'q' };
        uiState.phase = 'geometric_from_selected';
        uiState.fromSq = sq;
        uiState.geometricTargets = gameState.geometricDestsFor(sq, patternMap[uiState.selectedMoveVariant]);
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
    } else if (uiState.selectedCardType === 'summon') {
      if (uiState.summonTargets.length && !uiState.summonTargets.includes(sq)) {
        setHint('Invalid placement square'); return;
      }
      if (d.board[sq]) { setHint('Square is occupied'); return; }
      const result = gameState.playSummonCard(uiState.selectedCardIndex, uiState.selectedPieceType, sq);
      if (result.error) { setHint(result.error); }
      resetUiState(); setHint(''); render();
      playoutEnemyTurn();
    }
    return;
  }

  if (uiState.phase === 'from_selected') {
    if (sq === uiState.fromSq) {
      uiState.phase = 'card_selected';
      uiState.fromSq = null;
      uiState.legalDests = [];
      setHint('Click a friendly piece to move');
      render(); return;
    }
    const result = gameState.playMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); return; }
    if (result.needs_promotion) {
      uiState.pendingPromos = [{ from: uiState.fromSq, to: sq, cardType: 'move', cardIndex: uiState.selectedCardIndex }];
      document.getElementById('promotion-modal').classList.remove('hidden');
      return;
    }
    resetUiState(); setHint(''); render();
    playoutEnemyTurn();
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
    if (result.needs_promotion) {
      uiState.pendingPromos = result.needs_promotion.map(s => ({ sq: s, cardType: null }));
      showNextPromo();
    } else {
      resetUiState(); setHint(''); render();
      playoutEnemyTurn();
    }
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
    if (result.needs_promotion) {
      uiState.pendingPromos = result.needs_promotion.map(s => ({ sq: s, cardType: null }));
      showNextPromo();
    } else {
      resetUiState(); setHint(''); render();
      playoutEnemyTurn();
    }
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
    if (result.needs_promotion) {
      uiState.pendingPromos = result.needs_promotion.map(s => ({ sq: s, cardType: null }));
      showNextPromo();
    } else {
      resetUiState(); setHint(''); render();
      playoutEnemyTurn();
    }
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
