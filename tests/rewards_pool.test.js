import { describe, test, expect } from 'vitest';
import { getRewardPool, pickCardChoices } from '../js/rewards.js';

test('getRewardPool excludes cards with inRewardPool=false', () => {
  const pool = getRewardPool('knight');

  const knightMove = pool.find(e => e.card().name === 'Knight Move');
  const bishopMove = pool.find(e => e.card().name === 'Bishop Move');
  const rookMove = pool.find(e => e.card().name === 'Rook Move');
  const queenMove = pool.find(e => e.card().name === 'Queen Move');

  expect(knightMove).toBeUndefined();
  expect(bishopMove).toBeUndefined();
  expect(rookMove).toBeUndefined();
  expect(queenMove).toBeUndefined();
});

test('getRewardPool includes power cards', () => {
  const pool = getRewardPool('knight');

  const knightPower = pool.find(e => e.card().name === 'Knight Power');
  const queenPower = pool.find(e => e.card().name === 'Queen Power');

  expect(knightPower).toBeDefined();
  expect(queenPower).toBeDefined();
});

test('pickCardChoices excludes pattern move cards', () => {
  // Run multiple times to account for randomness
  for (let i = 0; i < 20; i++) {
    const choices = pickCardChoices(3, 'knight');
    for (const { card } of choices) {
      expect(card.name).not.toBe('Knight Move');
      expect(card.name).not.toBe('Bishop Move');
      expect(card.name).not.toBe('Rook Move');
      expect(card.name).not.toBe('Queen Move');
    }
  }
});

test('pickCardChoices can include power cards', () => {
  let foundPowerCard = false;
  for (let i = 0; i < 50; i++) {
    const choices = pickCardChoices(3, 'knight');
    if (choices.some(({ card }) => card.name?.includes('Power'))) {
      foundPowerCard = true;
      break;
    }
  }
  expect(foundPowerCard).toBe(true);
});
