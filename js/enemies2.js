/**
 * enemies2.js
 * Enemy definitions for engine2. Mirrors enemies.js but uses ai2/search.js.
 *
 * createAI() → { selectMove(state) → action|null }
 *   For default AI: single action per call.
 *   For double-move AI: alternates between single and double action calls.
 */

import { selectAction } from './ai2/search.js';
import { ENEMIES, VALID_ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, ELITE_2_ENEMY, BOSS_ENEMY } from '../config/enemies.js';

// ─── AI factories ─────────────────────────────────────────────────────────────

function defaultAI(personality) {
  return {
    selectMove(state) {
      const action = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
      console.log('[enemies2] defaultAI action=%s->%s', action?.source, action?.targets?.[0]);
      return action;
    },
  };
}

function doubleMoveAI(personality) {
  let doubleMovePending = false;
  return {
    selectMove(state) {
      if (doubleMovePending) {
        doubleMovePending = false;
        // Select first move
        const first = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
        if (!first) return null;

        // Temporarily apply first move to pick second from updated board
        state.play(first);
        const second = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
        state.undo();

        console.log('[enemies2] doubleMoveAI first=%s->%s second=%s->%s',
          first?.source, first?.targets?.[0], second?.source, second?.targets?.[0]);
        // Return a compound action with warnNext=false
        return { _double: true, moves: second ? [first, second] : [first], warnNext: false };
      } else {
        doubleMovePending = true;
        const action = selectAction(state, 'enemy', { personality, depth: 3, timeMs: 200 });
        console.log('[enemies2] doubleMoveAI warn action=%s->%s', action?.source, action?.targets?.[0]);
        // Return action with warnNext=true flag
        return action ? { ...action, warnNext: true } : null;
      }
    },
  };
}

// Re-export enemy data for backward compatibility
export { ENEMIES, VALID_ENEMIES, REGULAR_ENEMIES, ELITE_ENEMY, ELITE_2_ENEMY, BOSS_ENEMY } from '../config/enemies.js';

// Attach createAI to each enemy definition at runtime so existing code keeps working
for (const key of Object.keys(ENEMIES)) {
  const def = ENEMIES[key];
  if (def.aiType === 'doubleMove') {
    def.createAI = function() { return doubleMoveAI(this.personality); };
  } else {
    def.createAI = function() { return defaultAI(this.personality); };
  }
}

console.log('[enemies2] loaded enemies=%d', Object.keys(ENEMIES).length);
