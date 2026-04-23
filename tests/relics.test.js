import { describe, it, expect } from 'vitest';
import { RELIC_DEFS } from '../config/relics.js';
import { RELIC_CATALOG, pickRelicChoices } from '../js/relics.js';
import { ROOM_META } from '../config/path.js';
import { RELIC_REWARD_CHOICES } from '../config/game.js';

describe('relic data model', () => {
  it('has at least 2 relics defined', () => {
    expect(Object.keys(RELIC_DEFS).length).toBeGreaterThanOrEqual(2);
  });

  it('catalog matches defs', () => {
    expect(RELIC_CATALOG.length).toBe(Object.keys(RELIC_DEFS).length);
  });
});

describe('relic room type', () => {
  it('exists in ROOM_META', () => {
    expect(ROOM_META.relic).toBeDefined();
    expect(ROOM_META.relic.label).toBe('Relic');
  });

  it('has RELIC_REWARD_CHOICES constant', () => {
    expect(RELIC_REWARD_CHOICES).toBe(3);
  });
});

describe('pickRelicChoices', () => {
  it('excludes already-owned relics', () => {
    const runState = { relics: [{ id: 'slammer' }] };
    const choices = pickRelicChoices(3, runState);
    expect(choices.every(c => c.id !== 'slammer')).toBe(true);
  });

  it('returns empty when all relics owned', () => {
    const allRelics = RELIC_CATALOG.map(r => ({ id: r.id }));
    const runState = { relics: allRelics };
    const choices = pickRelicChoices(3, runState);
    expect(choices.length).toBe(0);
  });
});
