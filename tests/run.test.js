import { test, expect } from 'vitest';
import { RunState, generateNodes } from '../js/run.js';

// --- RunState init ---
test('RunState starts with 1 life', () => {
  expect(new RunState('knight').lives).toBe(1);
});
test('RunState starts at floor 1', () => {
  expect(new RunState('knight').currentFloor).toBe(1);
});
test('RunState starts in map phase', () => {
  expect(new RunState('knight').phase).toBe('map');
});
test('RunState starts with knight deck (10 cards)', () => {
  expect(new RunState('knight').deck).toHaveLength(10);
});
test('RunState startingPieces starts empty', () => {
  expect(new RunState('knight').startingPieces).toHaveLength(0);
});

// --- recordDefeat ---
test('recordDefeat decrements to 0 with 1 life', () => {
  const r = new RunState('knight');
  r.recordDefeat();
  expect(r.lives).toBe(0);
});
test('recordDefeat to 0 sets phase defeated', () => {
  const r = new RunState('knight');
  r.recordDefeat();
  expect(r.lives).toBe(0);
  expect(r.phase).toBe('defeated');
});
test('isDefeated true at 0 lives', () => {
  const r = new RunState('knight');
  r.lives = 0;
  expect(r.isDefeated()).toBe(true);
});
test('isDefeated false at 1+ lives', () => {
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
test('enterRoom event sets phase to room', () => {
  const r = new RunState('knight');
  r.currentNodes = [{ type: 'event', label: 'Event', icon: '' }];
  r.enterRoom(0);
  expect(r.phase).toBe('room');
});
test('enterRoom stores pendingNode', () => {
  const r = new RunState('knight');
  r.currentNodes = [{ type: 'shop', label: 'Shop', icon: '' }];
  r.enterRoom(0);
  expect(r.pendingNode.type).toBe('shop');
});

// --- generateNodes (fixed path) ---
test('every floor returns exactly 1 node', () => {
  for (let f = 1; f <= 16; f++) {
    expect(generateNodes(f)).toHaveLength(1);
  }
});
test('floor 9 returns iron_line monster', () => {
  const nodes = generateNodes(9);
  expect(nodes[0]).toMatchObject({ type: 'monster', enemyKey: 'iron_line' });
});
test('floor 15 returns upgrade node', () => {
  expect(generateNodes(15)[0].type).toBe('upgrade');
});
test('floor 16 returns boss node', () => {
  expect(generateNodes(16)[0].type).toBe('boss');
});
test('floor 6 returns duelist elite', () => {
  expect(generateNodes(6)[0]).toMatchObject({ type: 'elite', enemyKey: 'duelist' });
});
test('floor 12 returns duelist_2 elite', () => {
  expect(generateNodes(12)[0]).toMatchObject({ type: 'elite', enemyKey: 'duelist_2' });
});
