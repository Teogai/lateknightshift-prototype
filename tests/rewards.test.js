import { test, expect } from 'vitest';
import { getRewardPool, pickCardChoices, pickPieceChoices } from '../js/rewards.js';
import { STARTER_DECKS } from '../js/cards2/move_cards.js';

// --- getRewardPool ---
test('getRewardPool excludes knight starter types', () => {
  const pool = getRewardPool('knight');
  const starterTypes = new Set(STARTER_DECKS.knight.map(c => c.type + (c.piece || '')));
  for (const { card } of pool) {
    const c = card();
    expect(starterTypes.has(c.type + (c.piece || ''))).toBe(false);
  }
});
test('getRewardPool is non-empty for knight', () => {
  expect(getRewardPool('knight').length).toBeGreaterThan(0);
});

// --- pickCardChoices ---
test('pickCardChoices returns requested count', () => {
  expect(pickCardChoices(3)).toHaveLength(3);
});
test('pickCardChoices returns no duplicate card types', () => {
  for (let i = 0; i < 20; i++) {
    const choices = pickCardChoices(3);
    const keys = choices.map(({ card }) => card.type + (card.piece || ''));
    expect(new Set(keys).size).toBe(keys.length);
  }
});
test('pickCardChoices cards have name and cost', () => {
  for (const { card } of pickCardChoices(3)) {
    expect(card.name).toBeDefined();
    expect(card.cost).toBeDefined();
  }
});
test('pickCardChoices includes rarity field', () => {
  for (const entry of pickCardChoices(3)) {
    expect(['common', 'uncommon', 'rare']).toContain(entry.rarity);
  }
});

// --- pickPieceChoices ---
test('pickPieceChoices returns requested count', () => {
  expect(pickPieceChoices(3)).toHaveLength(3);
});
test('pickPieceChoices has no duplicate pieces', () => {
  for (let i = 0; i < 20; i++) {
    const choices = pickPieceChoices(3);
    const pieces = choices.map(c => c.piece);
    expect(new Set(pieces).size).toBe(pieces.length);
  }
});
test('pickPieceChoices entries have piece and rarity', () => {
  for (const entry of pickPieceChoices(3)) {
    expect(entry.piece).toBeDefined();
    expect(entry.rarity).toBeDefined();
  }
});
test('pickPieceChoices rarity weights yield pawn most often', () => {
  let pawnCount = 0;
  for (let i = 0; i < 300; i++) {
    if (pickPieceChoices(1)[0]?.piece === 'pawn') pawnCount++;
  }
  // pawn weight 55% → should appear far more than 50% of the time
  expect(pawnCount).toBeGreaterThan(120);
});
