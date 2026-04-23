import { RELIC_DEFS } from '../config/relics.js';

export const RELIC_CATALOG = Object.values(RELIC_DEFS);

export function pickRelicChoices(count, runState) {
  const ownedIds = new Set((runState.relics || []).map(r => r.id));
  const available = RELIC_CATALOG.filter(r => !ownedIds.has(r.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
