import { ROOM_META, FIXED_PATH as _FIXED_PATH } from '../config/path.js';

function node(type, enemyKey, labelOverride) {
  const meta = ROOM_META[type];
  return { type, enemyKey: enemyKey || null, label: labelOverride || meta.label, icon: meta.icon };
}

export const FIXED_PATH = _FIXED_PATH.map((n, i) => node(n.type, n.enemy, n.label));

export function generateNodes(floor) {
  return [FIXED_PATH[floor - 1]];
}

