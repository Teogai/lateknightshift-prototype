# Swap Card as Move Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change Swap card from `type: 'action'` to `type: 'move'` with `moveVariant: 'swap'`, preserving the two-click swap interaction.

**Architecture:** Rename `playSwapCard` to `playSwapMoveCard`, update UI phases to `swap_move_selected`/`swap_move_target_selected`, and adjust all type checks from `action`/`actionType` to `move`/`moveVariant`.

**Tech Stack:** Vanilla JS ES modules, chess.js, Vitest

---

### Task 1: Write failing factory test

**Files:**
- Modify: `tests/cards2/move_cards.test.js`

**Step 1: Write the failing test**

Add a test that asserts `swapCard()` returns `{ type: 'move', moveVariant: 'swap' }`:

```javascript
describe('swapCard', () => {
  it('returns move card with swap variant', () => {
    const card = swapCard();
    expect(card.type).toBe('move');
    expect(card.moveVariant).toBe('swap');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cards2/move_cards.test.js`
Expected: FAIL - `Expected: 'move', Received: 'action'`

**Step 3: Commit test**

```bash
git add tests/cards2/move_cards.test.js
git commit -m "test: add failing swapCard type assertion"
```

---

### Task 2: Update card factory

**Files:**
- Modify: `js/cards2/move_cards.js`

**Step 1: Update `swapCard()` factory**

Change:
```javascript
export function swapCard() {
  return { name: 'Swap', type: 'action', actionType: 'swap' };
}
```
To:
```javascript
export function swapCard() {
  return { name: 'Swap', type: 'move', moveVariant: 'swap' };
}
```

**Step 2: Run factory test**

Run: `npx vitest run tests/cards2/move_cards.test.js`
Expected: PASS

**Step 3: Commit**

```bash
git add js/cards2/move_cards.js
git commit -m "refactor: change swapCard to move type with swap variant"
```

---

### Task 3: Update card definition config

**Files:**
- Modify: `config/cards.js`

**Step 1: Update SWAP entry in CARD_DEFS**

Change:
```javascript
{ id: 'swap', name: 'Swap', type: 'action', actionType: 'swap', rarity: 'uncommon', desc: 'Swap place with friendly {piece}.' },
```
To:
```javascript
{ id: 'swap', name: 'Swap', type: 'move', moveVariant: 'swap', rarity: 'uncommon', desc: 'Swap place with friendly {piece}.' },
```

**Step 2: Commit**

```bash
git add config/cards.js
git commit -m "refactor: update swap card definition to move type"
```

---

### Task 4: Write failing battle state test

**Files:**
- Modify: `tests/battle_state.test.js`

**Step 1: Write the failing test**

Add or update test that calls `playSwapMoveCard` and validates type/subtype:

```javascript
describe('playSwapMoveCard', () => {
  it('validates card is move type with swap variant', () => {
    // Setup: create battle state with a swap move card in hand
    const bs = createBattleState(/* initial board with two player pieces */);
    bs.hand = [swapCard()];
    
    // Should succeed with correct type
    bs.playSwapMoveCard(0, 'e2', 'e4');
    expect(bs.board.get('e2')).toBe(/* piece from e4 */);
    expect(bs.board.get('e4')).toBe(/* piece from e2 */);
  });
  
  it('throws if card is not move type', () => {
    const bs = createBattleState();
    bs.hand = [{ type: 'action', actionType: 'swap' }];
    
    expect(() => bs.playSwapMoveCard(0, 'e2', 'e4')).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/battle_state.test.js`
Expected: FAIL - `playSwapMoveCard is not a function` or type validation fails

**Step 3: Commit test**

```bash
git add tests/battle_state.test.js
git commit -m "test: add failing playSwapMoveCard tests"
```

---

### Task 5: Update battle state method

**Files:**
- Modify: `js/battle_state.js`

**Step 1: Rename method and update validation**

Find `playSwapCard` and rename to `playSwapMoveCard`. Update validation:

Change:
```javascript
playSwapCard(cardIndex, fromSq, toSq) {
  const card = this.hand[cardIndex];
  if (card.type !== 'action' || card.actionType !== 'swap') {
    throw new Error('Invalid card type');
  }
```
To:
```javascript
playSwapMoveCard(cardIndex, fromSq, toSq) {
  const card = this.hand[cardIndex];
  if (card.type !== 'move' || card.moveVariant !== 'swap') {
    throw new Error('Invalid card type');
  }
```

Keep the rest of the method logic identical.

**Step 2: Run battle state test**

Run: `npx vitest run tests/battle_state.test.js`
Expected: PASS

**Step 3: Commit**

```bash
git add js/battle_state.js
git commit -m "refactor: rename playSwapCard to playSwapMoveCard with move validation"
```

---

### Task 6: Update UI phase names and handlers

**Files:**
- Modify: `js/ui.js`

**Step 1: Update phase names**

Replace all occurrences of:
- `swap_selected` → `swap_move_selected`
- `swap_target_selected` → `swap_move_target_selected`

**Step 2: Update type checks in UI handlers**

Find `card.type === 'action' && card.actionType === 'swap'` and change to `card.type === 'move' && card.moveVariant === 'swap'`.

Find `card.type !== 'action' || card.actionType !== 'swap'` and change to `card.type !== 'move' || card.moveVariant !== 'swap'`.

**Step 3: Update method calls**

Find calls to `playSwapCard` and rename to `playSwapMoveCard`.

**Step 4: Run tests**

Run: `npm test`
Expected: PASS (or UI tests if they exist)

**Step 5: Commit**

```bash
git add js/ui.js
git commit -m "refactor: update UI swap phases to move type naming"
```

---

### Task 7: Update documentation

**Files:**
- Modify: `docs/CARDS.md`

**Step 1: Move swap from action subtypes to move subtypes**

In the move variants list, add `swap`:
```
- **move** cards: `moveVariant: 'knight' | 'bishop' | 'rook' | 'queen' | 'pawn_boost' | 'duck' | 'teleport' | 'blitz' | 'move_together' | 'swap'`
```

In the action types list, remove `swap`:
```
- **action** cards: `actionType: 'stun' | 'shield' | 'sacrifice' | 'unblock' | 'snap'`
```

**Step 2: Commit**

```bash
git add docs/CARDS.md
git commit -m "docs: move swap from action to move card subtypes"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 2: Run perf tests if engine/AI touched**

Not applicable for this refactor.

**Step 3: Verify no other references**

Run: `grep -r "actionType.*swap\|swap.*actionType" --include="*.js" .`
Expected: No matches (except possibly in test files that already test the new behavior)

Run: `grep -r "playSwapCard[^a-zA-Z]" --include="*.js" .`
Expected: No matches (all renamed to playSwapMoveCard)

**Step 4: Commit if any fixes needed**

If any missed references found, fix and commit.

---

## Summary of Changes

| File | What Changed |
|------|--------------|
| `config/cards.js` | Swap: `type: 'action'` → `'move'`, removed `actionType`, added `moveVariant` |
| `js/cards2/move_cards.js` | `swapCard()` returns move type with swap variant |
| `js/battle_state.js` | `playSwapCard` → `playSwapMoveCard`, validates `move`/`moveVariant` |
| `js/ui.js` | Phases renamed, type checks updated, method calls updated |
| `tests/cards2/move_cards.test.js` | Tests assert move type and swap variant |
| `tests/battle_state.test.js` | Tests use `playSwapMoveCard` with correct validation |
| `docs/CARDS.md` | Swap moved from action to move subtypes |
