import { test, expect } from 'vitest';
import { RunState, generateNodes } from '../js/run.js';
import { LIVES, MAP_CONFIG } from '../config/game.js';
import { STARTER_DECK_DEFS } from '../config/cards.js';
import { ELITE_ENEMY, ELITE_2_ENEMY, BOSS_ENEMY } from '../config/enemies.js';

const KNIGHT_DECK_SIZE = STARTER_DECK_DEFS.knight.reduce((sum, c) => sum + c.count, 0);

// --- RunState init ---
test('RunState starts with correct life count', () => {
  expect(new RunState('knight').lives).toBe(LIVES);
});
test('RunState starts at floor 1', () => {
  expect(new RunState('knight').currentFloor).toBe(1);
});
test('RunState starts in map phase', () => {
  expect(new RunState('knight').phase).toBe('map');
});
test('RunState starts with knight deck of correct size', () => {
  expect(new RunState('knight').deck).toHaveLength(KNIGHT_DECK_SIZE);
});
test('RunState startingPieces starts empty', () => {
  expect(new RunState('knight').startingPieces).toHaveLength(0);
});

// --- recordDefeat ---
test('recordDefeat decrements lives to zero', () => {
  const r = new RunState('knight');
  r.recordDefeat();
  expect(r.lives).toBe(LIVES - 1);
});
test('recordDefeat to zero sets phase defeated', () => {
  const r = new RunState('knight');
  r.recordDefeat();
  expect(r.lives).toBe(LIVES - 1);
  expect(r.phase).toBe('defeated');
});
test('isDefeated true at zero lives', () => {
  const r = new RunState('knight');
  r.lives = 0;
  expect(r.isDefeated()).toBe(true);
});
test('isDefeated false when lives remain', () => {
  expect(new RunState('knight').isDefeated()).toBe(false);
});

// --- addStartingPiece ---
test('addStartingPiece appends to startingPieces', () => {
  const r = new RunState('knight');
  r.addStartingPiece({ type: 'r', color: 'w' }, 'h1');
  expect(r.startingPieces).toHaveLength(1);
  expect(r.startingPieces[0].square).toBe('h1');
});

// --- addRewardCard / removeCard / upgradeCard / transformCard ---
test('addRewardCard appends card to deck', () => {
  const r = new RunState('knight');
  const before = r.deck.length;
  r.addRewardCard({ name: 'Rook Move', type: 'rook_move', cost: 3 });
  expect(r.deck).toHaveLength(before + 1);
});
test('removeCard splices deck', () => {
  const r = new RunState('knight');
  const before = r.deck.length;
  r.removeCard(0);
  expect(r.deck).toHaveLength(before - 1);
});
test('upgradeCard sets upgraded flag on deck card', () => {
  const r = new RunState('knight');
  r.upgradeCard(0);
  expect(r.deck[0].upgraded).toBe(true);
});
test('transformCard replaces deck card', () => {
  const r = new RunState('knight');
  const newCard = { name: 'Curse', type: 'curse', cost: 0 };
  r.transformCard(0, newCard);
  expect(r.deck[0].type).toBe('curse');
});

// --- enterRoom ---
test('enterRoom monster sets phase to battle', () => {
  const r = new RunState('knight');
  r.currentNodes = [{ type: 'monster', label: 'Monster', icon: '' }];
  r.enterRoom(0);
  expect(r.phase).toBe('battle');
});
test('enterRoom piece_reward sets phase to room', () => {
  const r = new RunState('knight');
  r.currentNodes = [{ type: 'piece_reward', label: 'Piece reward', icon: '' }];
  r.enterRoom(0);
  expect(r.phase).toBe('room');
});
test('enterRoom stores pendingNode', () => {
  const r = new RunState('knight');
  r.currentNodes = [{ type: 'piece_reward', label: 'Piece reward', icon: '' }];
  r.enterRoom(0);
  expect(r.pendingNode.type).toBe('piece_reward');
});

// --- generateNodes (fixed path) ---
test('every floor returns exactly 1 node', () => {
  for (let f = 1; f <= MAP_CONFIG.totalFloors; f++) {
    expect(generateNodes(f)).toHaveLength(1);
  }
});
test('treasure floor returns iron_line monster', () => {
  const nodes = generateNodes(MAP_CONFIG.treasureFloor);
  expect(nodes[0]).toMatchObject({ type: 'monster', enemyKey: 'iron_line' });
});
test('transform floor returns transform node', () => {
  expect(generateNodes(MAP_CONFIG.transformFloor)[0].type).toBe('transform');
});
test('boss floor returns boss node', () => {
  expect(generateNodes(MAP_CONFIG.bossFloor)[0].type).toBe('boss');
});
test('elite min floor returns first elite enemy', () => {
  expect(generateNodes(MAP_CONFIG.eliteMinFloor)[0]).toMatchObject({ type: 'elite', enemyKey: ELITE_ENEMY });
});
test('floor 12 returns second elite enemy', () => {
  expect(generateNodes(12)[0]).toMatchObject({ type: 'elite', enemyKey: ELITE_2_ENEMY });
});
