import { MAP_CONFIG } from './config.js';

const ROOM_META = {
  monster:  { label: 'Monster',  icon: '⚔' },
  elite:    { label: 'Elite',    icon: '★' },
  event:    { label: 'Event',    icon: '✦' },
  shop:     { label: 'Shop',     icon: '$' },
  treasure: { label: 'Treasure', icon: '◆' },
  upgrade:  { label: 'Upgrade',  icon: '▲' },
  boss:     { label: 'Boss',     icon: '☠' },
};

export function getFixedType(floor, config = MAP_CONFIG) {
  if (floor === config.treasureFloor) return 'treasure';
  if (floor === config.upgradeFloor)  return 'upgrade';
  if (floor === config.bossFloor)     return 'boss';
  return null;
}

function weightedRandom(weights) {
  let total = 0;
  for (const v of Object.values(weights)) total += v;
  let r = Math.random() * total;
  for (const [k, v] of Object.entries(weights)) {
    r -= v;
    if (r < 0) return k;
  }
  return Object.keys(weights)[0];
}

export function rollRoomTypes(floor, count, config = MAP_CONFIG) {
  const eligibleWeights = { ...config.roomWeights };
  if (floor < config.eliteMinFloor) delete eligibleWeights.elite;
  const types = [];
  for (let i = 0; i < count; i++) {
    const filtered = {};
    for (const [k, v] of Object.entries(eligibleWeights)) {
      if (!types.includes(k)) filtered[k] = v;
    }
    if (!Object.keys(filtered).length) break;
    types.push(weightedRandom(filtered));
  }
  return types;
}

export function generateNodes(floor, config = MAP_CONFIG) {
  const fixed = getFixedType(floor, config);
  if (fixed) {
    const meta = ROOM_META[fixed];
    return [{ type: fixed, label: meta.label, icon: meta.icon }];
  }
  const count = config.minNodes + Math.floor(Math.random() * (config.maxNodes - config.minNodes + 1));
  const types = rollRoomTypes(floor, count, config);
  return types.map(t => ({ type: t, label: ROOM_META[t].label, icon: ROOM_META[t].icon }));
}

export function renderMapScreen(runState, onNodeChosen) {
  const header = document.getElementById('map-header');
  const content = document.getElementById('map-content');
  if (!header || !content) return;

  header.textContent = `Floor ${runState.currentFloor} / ${MAP_CONFIG.bossFloor}  |  Lives: ${runState.lives}`;

  content.innerHTML = '';
  runState.currentNodes.forEach((node, i) => {
    const btn = document.createElement('button');
    btn.className = `map-node-btn ${node.type}`;
    btn.dataset.nodeType = node.type;
    btn.textContent = `${node.icon}  ${node.label}`;
    btn.addEventListener('click', () => onNodeChosen(i));
    content.appendChild(btn);
  });
}
