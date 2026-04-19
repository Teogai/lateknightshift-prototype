import { GameState, knightAttacks, VALID_ENEMIES } from './engine.js';
import { RunState } from './run.js';
import { renderMapScreen } from './map.js';
import {
  renderCardRewardScreen, renderPieceRewardScreen, renderUpgradeScreen,
  renderTransformScreen, renderTransformResultScreen, renderShopScreen, renderDefeatScreen,
  pickCardChoices, pickPieceChoices,
} from './rewards.js';
import { REGULAR_ENEMIES, ELITE_ENEMY, BOSS_ENEMY } from './enemies.js';
import { curseCard, bishopMoveCard, rookMoveCard, queenMoveCard } from './cards.js';

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
};

const ALL_SCREENS = ['screen-select', 'screen-map', 'screen-game', 'screen-room', 'screen-defeat', 'screen-complete'];

export let gameState = null;
export let runState = null;

export const uiState = {
  phase: 'idle',
  selectedCardIndex: null,
  selectedCardType: null,
  selectedPieceType: null,
  fromSq: null,
  pendingPromos: [],
  knightTargets: [],
  legalDests: [],
  summonTargets: [],
  geometricTargets: [],
  gameOverHandled: false,
};

export function resetUiState() {
  uiState.phase = 'idle';
  uiState.selectedCardIndex = null;
  uiState.selectedCardType = null;
  uiState.selectedPieceType = null;
  uiState.fromSq = null;
  uiState.pendingPromos = [];
  uiState.knightTargets = [];
  uiState.legalDests = [];
  uiState.summonTargets = [];
  uiState.geometricTargets = [];
  uiState.gameOverHandled = false;
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

      if ((uiState.phase === 'from_selected' || uiState.phase === 'knight_from_selected' || uiState.phase === 'geometric_from_selected') && uiState.fromSq === sqName) {
        div.classList.add('selected-from');
      }
      if (uiState.knightTargets.includes(sqName))   div.classList.add('knight-target');
      if (uiState.legalDests.includes(sqName))      div.classList.add('legal-dest');
      if (uiState.summonTargets.includes(sqName))   div.classList.add('summon-target');
      if (uiState.geometricTargets.includes(sqName)) div.classList.add('legal-dest');

      const piece = board[sqName];
      if (piece) {
        const img = document.createElement('img');
        img.src = PIECES[piece.color][piece.type];
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
  knight_move: '#5a3a8a',
  bishop_move: '#3a6a5a',
  rook_move: '#2a6a6a',
  queen_move: '#7a3a7a',
  curse: '#5a1a1a',
};
function cardArtColor(card) {
  if (card.type === 'summon') {
    const colors = { pawn: '#3a5a3a', knight: '#2a4a2a', bishop: '#2a5a4a', rook: '#1a4a4a', queen: '#6a5a1a' };
    return colors[card.piece] || '#3a3a3a';
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
  div.appendChild(art);
  const name = document.createElement('div');
  name.className = 'card-name' + (card.upgraded ? ' upgraded' : '');
  name.textContent = card.name;
  div.appendChild(name);
  const cost = document.createElement('div');
  cost.className = 'card-cost' + (card.upgraded ? ' upgraded' : '');
  cost.textContent = card.type === 'curse' ? 'Unplayable' : `Cost: ${card.cost}`;
  div.appendChild(cost);
  return div;
}

export function renderHand() {
  const handEl = document.getElementById('hand');
  handEl.innerHTML = '';
  if (!gameState) return;
  const d = gameState.toDict();
  d.hand.forEach((card, idx) => {
    const isAffordable = card.cost <= d.mana;
    const onClick = (card.type !== 'curse' && isAffordable)
      ? () => handleCardClick(idx, card)
      : undefined;
    const div = makeCardEl(card, { onClick });
    if (card.type !== 'curse') {
      if (idx === uiState.selectedCardIndex) div.classList.add('selected');
      if (!isAffordable) div.classList.add('unaffordable');
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
  document.getElementById('mana-display').textContent = `Mana: ${d.mana} / 3`;
  document.getElementById('deck-info').textContent = `Deck: ${d.deck_size}  |  Discard: ${d.discard_size}  |  Lives: ${runState?.lives ?? '—'}`;
  document.getElementById('btn-end-turn').disabled = d.turn !== 'player';
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

function pickEnemy(nodeType) {
  if (nodeType === 'elite') return ELITE_ENEMY;
  if (nodeType === 'boss')  return BOSS_ENEMY;
  return REGULAR_ENEMIES[Math.floor(Math.random() * REGULAR_ENEMIES.length)];
}

export function handleBattleWon() {
  if (!runState) return;
  const nodeType = runState.pendingNode?.type;

  if (nodeType === 'elite' || nodeType === 'treasure') {
    // Show piece reward
    const choices = pickPieceChoices(3);
    runState.phase = 'room';
    showScreen('screen-room');
    renderPieceRewardScreen(choices, runState, () => advanceAfterRoom());
  } else {
    // Show card reward then advance
    const choices = pickCardChoices(3, runState.character);
    runState.phase = 'room';
    showScreen('screen-room');
    renderCardRewardScreen(choices, (i, card) => {
      runState.addRewardCard(card);
      advanceAfterRoom();
    });
  }
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

function startBattle(nodeType) {
  const enemy = pickEnemy(nodeType);
  gameState = new GameState(
    runState.character,
    enemy,
    runState.deck,
    runState.startingPieces,
  );
  resetUiState();
  showScreen('screen-game');
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
  renderMapScreen(runState, handleNodeChosen);
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
  if (card.cost > d.mana) return;
  resetUiState();
  uiState.phase = 'card_selected';
  uiState.selectedCardIndex = index;
  uiState.selectedCardType = card.type;
  uiState.selectedPieceType = card.piece || null;
  if (card.type === 'move') {
    setHint('Click a friendly piece to move');
  } else if (card.type === 'knight_move') {
    setHint('Knight Move: click a friendly piece to teleport');
  } else if (card.type === 'bishop_move') {
    setHint('Bishop Move: click a friendly piece to move diagonally');
  } else if (card.type === 'rook_move') {
    setHint('Rook Move: click a friendly piece to move in a straight line');
  } else if (card.type === 'queen_move') {
    setHint('Queen Move: click a friendly piece to move diagonally or straight');
  } else if (card.type === 'summon') {
    const isPawn = card.piece === 'pawn';
    const validRanks = isPawn ? ['1', '2'] : ['1'];
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
  if (uiState.phase === 'idle') return;
  const d = gameState.toDict();

  if (uiState.phase === 'card_selected') {
    if (uiState.selectedCardType === 'move') {
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
    } else if (uiState.selectedCardType === 'knight_move') {
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
    } else if (['bishop_move', 'rook_move', 'queen_move'].includes(uiState.selectedCardType)) {
      const piece = d.board[sq];
      if (piece && piece.color === 'white') {
        const patternMap = { bishop_move: 'b', rook_move: 'r', queen_move: 'q' };
        uiState.phase = 'geometric_from_selected';
        uiState.fromSq = sq;
        uiState.geometricTargets = gameState.geometricDestsFor(sq, patternMap[uiState.selectedCardType]);
        setHint('Click a highlighted square to move to');
        render();
      } else {
        setHint('Pick a friendly piece');
      }
    } else if (uiState.selectedCardType === 'summon') {
      if (uiState.summonTargets.length && !uiState.summonTargets.includes(sq)) {
        setHint('Invalid placement square'); return;
      }
      if (d.board[sq]) { setHint('Square is occupied'); return; }
      const result = gameState.playSummonCard(uiState.selectedCardIndex, uiState.selectedPieceType, sq);
      if (result.error) { setHint(result.error); }
      resetUiState(); setHint(''); render();
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
    const piece = d.board[uiState.fromSq];
    if (piece && piece.type === 'pawn' && piece.color === 'white' && sq[1] === '8') {
      uiState.pendingPromos = [{ from: uiState.fromSq, to: sq, cardType: 'move', cardIndex: uiState.selectedCardIndex }];
      document.getElementById('promotion-modal').classList.remove('hidden');
      return;
    }
    const result = gameState.playMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq);
    if (result.error) { setHint(result.error); }
    resetUiState(); setHint(''); render();
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
      bishop_move: () => gameState.playBishopMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq),
      rook_move:   () => gameState.playRookMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq),
      queen_move:  () => gameState.playQueenMoveCard(uiState.selectedCardIndex, uiState.fromSq, sq),
    }[uiState.selectedCardType];
    const result = playFn();
    if (result.error) { setHint(result.error); return; }
    if (result.needs_promotion) {
      uiState.pendingPromos = result.needs_promotion.map(s => ({ sq: s, cardType: null }));
      showNextPromo();
    } else {
      resetUiState(); setHint(''); render();
    }
  }
}

export async function handleEndTurn() {
  document.getElementById('btn-end-turn').disabled = true;
  resetUiState(); setHint('');
  const { pendingMoves, warnNext, error } = gameState.startEnemyTurn();
  if (error) { setHint(error); return; }
  render();
  if (pendingMoves.length > 0) {
    await new Promise(r => setTimeout(r, 600));
  }
  gameState.finishEnemyTurn(pendingMoves, warnNext);
  render();
}

export function handlePromotionChoice(promoLetter) {
  document.getElementById('promotion-modal').classList.add('hidden');
  const item = uiState.pendingPromos.shift();
  let result;
  if (item.cardType === 'move') {
    result = gameState.playMoveCard(item.cardIndex, item.from, item.to, promoLetter);
  } else {
    result = gameState.applyPromotion(item.sq, promoLetter);
  }
  if (result.error) setHint(result.error);
  showNextPromo();
}

export function startGame(character) {
  document.getElementById('select-error').textContent = '';
  try {
    runState = new RunState(character);
    showScreen('screen-map');
    renderMapScreen(runState, handleNodeChosen);
  } catch (e) {
    document.getElementById('select-error').textContent = e.message;
  }
}
