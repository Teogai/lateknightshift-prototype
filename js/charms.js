/**
 * js/charms.js
 * Charm catalog and helpers.
 */

import { CHARM_DEFS, CHARM_RARITY_WEIGHTS } from '../config/charms.js';

export const CHARM_CATALOG = CHARM_DEFS.map(def => ({
  charm: { ...def },
  rarity: def.rarity,
}));

export function getCharmById(id) {
  return CHARM_DEFS.find(c => c.id === id);
}

export function canApplyCharm(charm, card) {
  return charm.validCardTypes.includes(card.type);
}