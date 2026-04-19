import { test, expect } from 'vitest';
import { RunState, generateNodes, getFixedType } from '../js/run.js';
import { MAP_CONFIG } from '../js/config.js';

// --- RunState init ---
test('RunState starts with 3 lives', () => {
  expect(new RunState('knight').lives).toBe(3);
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
test('recordDefeat decrements lives', () => {
  const r = new RunState('knight');
  r.recordDefeat();
  expect(r.lives).toBe(2);
});
test('recordDefeat to 0 sets phase defeated', () => {
  const r = new RunState('knight');
  r.recordDefeat(); r.recordDefeat(); r.recordDefeat();
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

// --- generateNodes ---
test('fixed floor 9 returns 1 treasure node', () => {
  const nodes = generateNodes(9);
  expect(nodes).toHaveLength(1);
  expect(nodes[0].type).toBe('treasure');
});
test('fixed floor 15 returns 1 upgrade node', () => {
  const nodes = generateNodes(15);
  expect(nodes).toHaveLength(1);
  expect(nodes[0].type).toBe('upgrade');
});
test('fixed floor 16 returns 1 boss node', () => {
  const nodes = generateNodes(16);
  expect(nodes).toHaveLength(1);
  expect(nodes[0].type).toBe('boss');
});
test('random floor returns 1-3 nodes', () => {
  for (let i = 0; i < 20; i++) {
    const nodes = generateNodes(3);
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    expect(nodes.length).toBeLessThanOrEqual(3);
  }
});
test('random floor has no duplicate types', () => {
  for (let i = 0; i < 20; i++) {
    const nodes = generateNodes(3);
    const types = nodes.map(n => n.type);
    expect(new Set(types).size).toBe(types.length);
  }
});
test('elite excluded from floors below 6', () => {
  for (let i = 0; i < 30; i++) {
    const nodes = generateNodes(3);
    expect(nodes.every(n => n.type !== 'elite')).toBe(true);
  }
});
test('elite can appear on floor 6+', () => {
  let found = false;
  for (let i = 0; i < 200; i++) {
    if (generateNodes(8).some(n => n.type === 'elite')) { found = true; break; }
  }
  expect(found).toBe(true);
});
