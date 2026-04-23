import { describe, it, expect } from 'vitest';
import { RELIC_DEFS } from '../config/relics.js';
import { RELIC_CATALOG, pickRelicChoices } from '../js/relics.js';

describe('relic data model', () => {
  it('has at least 2 relics defined', () => {
    expect(Object.keys(RELIC_DEFS).length).toBeGreaterThanOrEqual(2);
  });

  it('catalog matches defs', () => {
    expect(RELIC_CATALOG.length).toBe(Object.keys(RELIC_DEFS).length);
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
