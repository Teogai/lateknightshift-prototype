# Card Type Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor all cards into 4 types (`piece`, `move`, `action`, `curse`) with subtypes for behavior-specific logic.

**Architecture:** Cards currently use ~12 different `type` strings. Consolidate into 4 types with `piece`, `moveVariant`, and `actionType` subfields. Update all switch/if-else chains in UI and battle state to check both type and subtype.

**Tech Stack:** Vanilla JS ES modules, Vitest, no bundler

---

### Task 1: Update CARD_DEFS in config/cards.js

**Files:**
- Modify: `config/cards.js`

**Changes:**
- `summon_duck`: type `'piece'`, add `piece: 'duck'`
- `move_duck`: type `'move'`, add `moveVariant: 'duck'`
- `stun`: type `'action'`, add `actionType: 'stun'`
- `shield`: type `'action'`, add `actionType: 'shield'`
- `sacrifice`: type `'action'`, add `actionType: 'sacrifice'`
- `unblock`: type `'action'`, add `actionType: 'unblock'`

**Step 1: Edit file**

```javascript
// After changes, these cards should have new types:
// summon_duck -> type: 'piece', piece: 'duck'
// move_duck   -> type: 'move', moveVariant: 'duck'
// stun        -> type: 'action', actionType: 'stun'
// shield      -> type: 'action', actionType: 'shield'
// sacrifice   -> type: 'action', actionType: 'sacrifice'
// unblock     -> type: 'action', actionType: 'unblock'
```

**Step 2: Verify types manually**

Run: `node -e "import('./config/cards.js').then(m => console.log(m.CARD_DEFS.filter(c => ['summon_duck','move_duck','stun','shield','sacrifice','unblock'].includes(c.id))))"`

**Step 3: Commit**

```bash
git add config/cards.js
git commit -m "refactor: update card types to piece/move/action/curse"
```

---

### Task 2: Update card factories in js/cards2/move_cards.js

**Files:**
- Modify: `js/cards2/move_cards.js`

**Changes:**
- `summonDuckCard()`: return `{ name: 'Summon Duck', type: 'piece', piece: 'duck' }`
- `moveDuckCard()`: return `{ name: 'Move Duck', type: 'move', moveVariant: 'duck' }`
- `stunCard()`: return `{ name: 'Stun', type: 'action', actionType: 'stun' }`
- `shieldCard()`: return `{ name: 'Shield', type: 'action', actionType: 'shield' }`
- `sacrificeCard()`: return `{ name: 'Sacrifice', type: 'action', actionType: 'sacrifice' }`
- `unblockCard()`: return `{ name: 'Unblock', type: 'action', actionType: 'unblock' }`

**Step 1: Edit factory functions**

**Step 2: Run existing card tests**

Run: `npm test -- tests/cards2/`
Expected: FAIL (because tests expect old types)

**Step 3: Commit**

```bash
git add js/cards2/move_cards.js
git commit -m "refactor: update card factories for new types"
```

---

### Task 3: Update battle_state.js play methods

**Files:**
- Modify: `js/battle_state.js`

**Changes:**
- `playSummonDuckCard`: check `card.type === 'piece' && card.piece === 'duck'`
- `playMoveDuckCard`: check `card.type === 'move' && card.moveVariant === 'duck'`
- `playStunCard`: check `card.type === 'action' && card.actionType === 'stun'`
- `playShieldCard`: check `card.type === 'action' && card.actionType === 'shield'`
- `playSacrificeCard`: check `card.type === 'action' && card.actionType === 'sacrifice'`
- `playUnblockCard`: check `card.type === 'action' && card.actionType === 'unblock'`

**Step 1: Edit validation checks in each play method**

**Step 2: Run battle_state tests**

Run: `npm test -- tests/battle_state.test.js`
Expected: PASS (tests should pass once subtypes are checked)

**Step 3: Commit**

```bash
git add js/battle_state.js
git commit -m "refactor: update battle_state play methods for new types"
```

---

### Task 4: Update js/ui.js card click handlers

**Files:**
- Modify: `js/ui.js`

**Changes:**
In `handleCardClick`, replace type checks:
- `card.type === 'summon_duck'` → `card.type === 'piece' && card.piece === 'duck'`
- `card.type === 'move_duck'` → `card.type === 'move' && card.moveVariant === 'duck'`
- `card.type === 'stun'` → `card.type === 'action' && card.actionType === 'stun'`
- `card.type === 'shield'` → `card.type === 'action' && card.actionType === 'shield'`
- `card.type === 'sacrifice'` → `card.type === 'action' && card.actionType === 'sacrifice'`
- `card.type === 'unblock'` → `card.type === 'action' && card.actionType === 'unblock'`

Also in `handleSquareClick` if phase names stay the same (they do - phase names don't need to change, just the conditions that enter them).

**Step 1: Edit handleCardClick switch/if chain around lines 870-915**

**Step 2: Edit handleSquareClick if chains around lines 1200-1330**

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add js/ui.js
git commit -m "refactor: update ui handlers for new card types"
```

---

### Task 5: Update tests

**Files:**
- Modify: `tests/battle_state.test.js`
- Modify: `tests/cards2/move_cards.test.js`
- Modify: `tests/cards2/piece_cards.test.js`
- Modify: `tests/rewards_piece_cards.test.js` (if any)

**Changes:**
- Update any `card.type === 'stun'` assertions to check `card.type === 'action' && card.actionType === 'stun'`
- Update `piece` card count tests to include `summon_duck` (now also type 'piece')
- Update `CARD_CATALOG` tests to verify new subtypes

**Step 1: Update battle_state.test.js**

**Step 2: Update move_cards.test.js**

**Step 3: Update piece_cards.test.js** — verify summon_duck now shows up in piece card searches

**Step 4: Run all tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/
git commit -m "test: update tests for new card types"
```

---

### Task 6: Update docs/CARDS.md

**Files:**
- Modify: `docs/CARDS.md`

**Changes:**
- Rewrite card types table with 4 types + subtypes
- Document subtype fields
- Update "How to add a new card" section

**Step 1: Edit docs/CARDS.md**

**Step 2: Commit**

```bash
git add docs/CARDS.md
git commit -m "docs: update card type documentation"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 2: Run perf tests**

Run: `npm run test:perf`
Expected: PASS (card changes shouldn't affect AI)

**Step 3: Update docs/TASKS.md**

Add: `[2026-04-22] done: refactor cards into piece/move/action/curse types with subtypes`

**Step 4: Final commit**

```bash
git add docs/TASKS.md
git commit -m "docs: log card type refactor completion"
```

---

## Testing Strategy

- Run `npm test` after every file change
- Key assertions:
  - `summon_duck` card has `type: 'piece'`, `piece: 'duck'`
  - `move_duck` card has `type: 'move'`, `moveVariant: 'duck'`
  - `stun` card has `type: 'action'`, `actionType: 'stun'`
  - Playing each card type works via battle_state
  - UI phase transitions work correctly
  - Reward pools still exclude piece cards correctly (summon_duck now counted as piece)

## Rollback plan

If issues arise, revert the commits in reverse order. The type system is backward-compatible at the factory level if we keep old type strings as aliases, but we're doing a clean break.
