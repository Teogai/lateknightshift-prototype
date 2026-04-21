import { test, expect } from 'vitest';
import { pickCharmChoices, applyCharmToCard } from '../js/rewards.js';
import { CHARM_CATALOG } from '../js/charms.js';

// --- pickCharmChoices ---
test('pickCharmChoices returns requested count', () => {
  const choices = pickCharmChoices(2);
  expect(choices.length).toBe(2);
});

test('pickCharmChoices returns only valid charms', () => {
  const choices = pickCharmChoices(3);
  for (const { charm } of choices) {
    expect(charm.id).toBeDefined();
    expect(charm.name).toBeDefined();
    expect(charm.validCardTypes).toBeDefined();
  }
});

test('pickCharmChoices has no duplicate charms', () => {
  for (let i = 0; i < 20; i++) {
    const choices = pickCharmChoices(3);
    const ids = choices.map(c => c.charm.id);
    expect(new Set(ids).size).toBe(ids.length);
  }
});

test('pickCharmChoices includes rarity field', () => {
  for (const entry of pickCharmChoices(3)) {
    expect(['common', 'uncommon', 'rare']).toContain(entry.rarity);
  }
});

// --- applyCharmToCard ---
test('applyCharmToCard adds charm to card', () => {
  const card = { name: 'Move', type: 'move' };
  const charm = { id: 'push', name: 'Push', validCardTypes: ['move'] };
  const result = applyCharmToCard(card, charm);
  expect(result.charm).toEqual(charm);
});

test('applyCharmToCard rejects invalid card type', () => {
  const card = { name: 'Pawn', type: 'piece', piece: 'pawn' };
  const charm = { id: 'push', name: 'Push', validCardTypes: ['move'] };
  const result = applyCharmToCard(card, charm);
  expect(result.error).toBeDefined();
});

test('applyCharmToCard allows atomic on piece card', () => {
  const card = { name: 'Pawn', type: 'piece', piece: 'pawn' };
  const charm = { id: 'atomic', name: 'Atomic', validCardTypes: ['piece'] };
  const result = applyCharmToCard(card, charm);
  expect(result.charm).toEqual(charm);
});