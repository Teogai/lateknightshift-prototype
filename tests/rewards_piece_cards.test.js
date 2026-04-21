import { test, expect } from 'vitest';
import { pickCardChoices, pickPieceCardChoices } from '../js/rewards.js';
import { CARD_CATALOG } from '../js/cards2/move_cards.js';

// --- pickCardChoices should NOT include piece cards ---
test('pickCardChoices excludes piece cards', () => {
  const choices = pickCardChoices(10, 'knight');
  for (const { card } of choices) {
    expect(card.type).not.toBe('piece');
  }
});

// --- pickPieceCardChoices should ONLY include piece cards ---
test('pickPieceCardChoices returns only piece cards', () => {
  const choices = pickPieceCardChoices(5);
  for (const { card } of choices) {
    expect(card.type).toBe('piece');
    expect(card.piece).toBeDefined();
  }
});

test('pickPieceCardChoices returns requested count', () => {
  const choices = pickPieceCardChoices(3);
  expect(choices.length).toBe(3);
});

test('pickPieceCardChoices has no duplicate pieces', () => {
  for (let i = 0; i < 20; i++) {
    const choices = pickPieceCardChoices(3);
    const pieces = choices.map(c => c.card.piece);
    expect(new Set(pieces).size).toBe(pieces.length);
  }
});

test('pickPieceCardChoices includes rarity field', () => {
  for (const entry of pickPieceCardChoices(3)) {
    expect(['common', 'uncommon', 'rare']).toContain(entry.rarity);
  }
});

test('pickPieceCardChoices weighted by rarity', () => {
  let commonCount = 0;
  const trials = 300;
  for (let i = 0; i < trials; i++) {
    if (pickPieceCardChoices(1)[0]?.rarity === 'common') commonCount++;
  }
  expect(commonCount).toBeGreaterThan(trials * 0.5);
});

test('pickCardChoices excludes curse cards', () => {
  const choices = pickCardChoices(10, 'knight');
  for (const { card } of choices) {
    expect(card.type).not.toBe('curse');
  }
});