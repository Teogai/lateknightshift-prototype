# Tag UI Dots + Redraw Deck Order Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two bugs: (1) power tags have no UI indicator on pieces, (2) redraw shuffles discard into deck before drawing remaining deck cards.

**Architecture:** Add missing STATUS_BADGE_COLORS entries for power tags; restructure redrawHand() to draw from deck first before shuffling discard.

**Tech Stack:** Vanilla JS, Vitest, CSS

---

## Task 1: Fix missing STATUS_BADGE_COLORS for power tags

**Files:**
- Modify: `js/ui.js:56-62`

**Step 1: Add missing color entries**

```javascript
const STATUS_BADGE_COLORS = {
  stunned: '#ff6666',
  ghost: '#aa88ff',
  shielded: '#44aaff',
  frozen: '#88ccff',
  wounded: '#ff4444',
  knight_power: '#66cc66',
  bishop_power: '#aa66dd',
  rook_power: '#dd4444',
  queen_power: '#ffcc00',
  king_power: '#ffaa00',
  uncapturable: '#aaaaaa',
};
```

**Step 2: Run tests to verify no regressions**

Run: `npm test`
Expected: All existing tests pass

**Step 3: Commit**

```bash
git add js/ui.js
git commit -m "fix: add missing STATUS_BADGE_COLORS for power tags"
```

---

## Task 2: Write failing test for redraw deck-first order

**Files:**
- Modify: `tests/battle_state.test.js`

**Step 1: Write test**

Add after existing redraw tests (~line 195):

```javascript
test('redrawHand draws remaining deck cards before shuffling discard', () => {
  const state = freshGame();
  // Setup: deck has 2 cards, discard has 3, hand has 1
  const deckTop = state._state.deck[0];
  const deckSecond = state._state.deck[1];
  state._state.deck = [deckTop, deckSecond];
  state._state.discard = [
    { id: 'd1', name: 'Discard 1' },
    { id: 'd2', name: 'Discard 2' },
    { id: 'd3', name: 'Discard 3' },
  ];
  state._state.hand = [{ id: 'h1', name: 'Hand 1' }];
  state.redrawCountdown = 0; // free redraw

  state.redrawHand();

  const newHand = state.toDict().hand;
  expect(newHand).toHaveLength(HAND_SIZE);
  // The 2 deck cards must be in the new hand
  expect(newHand.map(c => c.id)).toContain(deckTop.id);
  expect(newHand.map(c => c.id)).toContain(deckSecond.id);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/battle_state.test.js -t "draws remaining deck cards before shuffling discard"`
Expected: FAIL — current implementation shuffles all discard into deck before dealing

---

## Task 3: Fix redrawHand to draw deck cards first

**Files:**
- Modify: `js/battle_state.js:1263-1286`

**Step 1: Implement fix**

Replace `redrawHand()` with:

```javascript
  redrawHand() {
    // Move current hand to discard
    this._state.discard.push(...this._state.hand);
    this._state.hand = [];

    // Draw from remaining deck first
    const deckCardsToDraw = Math.min(this._state.deck.length, HAND_SIZE);
    this._state.hand = this._state.deck.splice(0, deckCardsToDraw);

    // If still need cards, shuffle discard into deck and draw rest
    if (this._state.hand.length < HAND_SIZE) {
      this._state.deck.push(...this._state.discard);
      this._state.discard = [];
      for (let i = this._state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._state.deck[i], this._state.deck[j]] = [this._state.deck[j], this._state.deck[i]];
      }
      const remaining = HAND_SIZE - this._state.hand.length;
      this._state.hand.push(...this._state.deck.splice(0, remaining));
    }

    console.log('[battle_state] redraw countdown=%d free=%s', this.redrawCountdown, this.redrawCountdown === 0);
    if (this.redrawCountdown === 0) {
      this.redrawCountdown = REDRAW_COUNTDOWN_START;
      return { ok: true, free: true };
    }
    // Costly redraw: reset countdown to START+1 so finishEnemyTurnSequence() decrements to START
    this.redrawCountdown = REDRAW_COUNTDOWN_START + 1;
    return { ok: true, free: false };
  }
```

**Step 2: Run test to verify it passes**

Run: `npm test -- tests/battle_state.test.js -t "draws remaining deck cards before shuffling discard"`
Expected: PASS

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add js/battle_state.js tests/battle_state.test.js
git commit -m "fix: redraw draws remaining deck cards before shuffling discard"
```

---

## Task 4: Write tests for power tag UI colors

**Files:**
- Modify: `tests/battle_state_power.test.js`

**Step 1: Write tests**

Add tests verifying each power tag renders with correct color:

```javascript
test('knight_power tag has correct STATUS_BADGE_COLOR', () => {
  // Import STATUS_BADGE_COLORS from ui.js or verify indirectly
  // Since ui.js imports browser APIs, test the color mapping exists
  expect(true).toBe(true); // Placeholder — actually test via piece detail rendering
});
```

Actually, better approach: add a test in `tests/battle_state_power.test.js` that verifies the tag is present on the piece after playPowerCard, and trust the UI color mapping. The color itself is a UI concern best tested via integration or manual check.

**Alternative:** Skip dedicated color tests — the existing `playPowerCard` tests already verify tags are applied. The fix is adding the color mapping which is straightforward.

---

## Task 5: Create docs/TAGS.md

**Files:**
- Create: `docs/TAGS.md`

**Step 1: Write documentation**

```markdown
# Tags

Tags are status effects applied to pieces via cards or game mechanics.

## Tag System

- Tags are stored on `piece.tags` as a `Set<string>`
- Tags affect piece behavior (e.g., `knight_power` grants knight moves)
- Tags are removed after piece moves (power tags), after N turns (`ghost`), or by effects (`shielded`)

## Adding a New Tag

When adding a tag that needs UI visibility:

1. Add tag behavior in engine:
   - `js/engine2/actions.js` — `_setTag()` for add/remove
   - `js/engine2/movegen.js` — if tag affects movement

2. Add UI color in `js/ui.js`:
   ```javascript
   const STATUS_BADGE_COLORS = {
     // ...existing colors
     your_new_tag: '#hexcolor',
   };
   ```

3. Add keyword description in `js/ui.js`:
   ```javascript
   const KEYWORD_REGISTRY = {
     // ...existing entries
     your_new_tag: { color: '#hexcolor', desc: 'Description for tooltip.' },
   };
   ```

4. Add tests in `tests/` relevant to the tag's behavior

## Current Tags

| Tag | Color | Source | Effect |
|-----|-------|--------|--------|
| stunned | `#ff6666` | Stun card | Cannot move for 2 turns |
| ghost | `#aa88ff` | Unblock card | Does not block sliding moves |
| shielded | `#44aaff` | Shield card | Blocks first capture |
| frozen | `#88ccff` | Ice tile | Cannot move |
| wounded | `#ff4444` | Damage tile | From damage tiles |
| knight_power | `#66cc66` | Knight Power card | Can move like knight |
| bishop_power | `#aa66dd` | Bishop Power card | Can move like bishop |
| rook_power | `#dd4444` | Rook Power card | Can move like rook |
| queen_power | `#ffcc00` | Queen Power card | Can move like queen |
| king_power | `#ffaa00` | King Power card | Can move like king |
| uncapturable | `#aaaaaa` | Duck piece | Cannot be captured |
```

**Step 2: Commit**

```bash
git add docs/TAGS.md
git commit -m "docs: add TAGS.md documenting tag system and UI color requirements"
```

---

## Task 6: Update ARCHITECTURE.md

**Files:**
- Modify: `docs/ARCHITECTURE.md`

Add link to `docs/TAGS.md` in the Docs section.

**Step 1: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: link TAGS.md in ARCHITECTURE.md"
```

---

## Task 7: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Update docs/TASKS.md**

Add: `[2026-04-26] done: Fix tag UI dots + redraw deck order`

**Step 3: Commit**

```bash
git add docs/TASKS.md
git commit -m "docs: log tag ui and redraw fixes"
```
