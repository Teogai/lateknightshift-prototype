# Deck/Discard Buttons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert deck/discard text into clickable buttons that show card piles in a modal overlay using the existing scrollable grid view.

**Architecture:** Add a new modal component to the battle screen. Modify `battle_state.js` to expose deck/discard arrays. Update `ui.js` to render buttons and handle modal display. Style buttons and modal in `style.css`.

**Tech Stack:** Vanilla JS ES modules, existing `makeCardEl()` and `card-scroll-grid` CSS class.

---

## Task 1: Update battle_state.js to expose deck/discard arrays

**Files:**
- Modify: `js/battle_state.js:217-232`

**Step 1: Write the failing test**

Create test in `tests/battle_state.test.js`:

```javascript
test('toDict exposes deck and discard arrays', () => {
  const state = new GameState('knight', 'pawns', [], []);
  const d = state.toDict();
  expect(Array.isArray(d.deck)).toBe(true);
  expect(Array.isArray(d.discard)).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/battle_state.test.js`
Expected: FAIL - deck and discard properties undefined

**Step 3: Write minimal implementation**

In `js/battle_state.js`, modify toDict() return object (around line 222-223):

```javascript
return {
  // ... existing properties ...
  deck: this._state.deck.map(c => ({ ...c })),
  discard: this._state.discard.map(c => ({ ...c })),
  // ... rest of properties ...
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/battle_state.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add js/battle_state.js tests/battle_state.test.js
git commit -m "feat: expose deck and discard arrays in toDict"
```

---

## Task 2: Add modal HTML structure

**Files:**
- Modify: `index.html`

**Step 1: Add pile viewer modal after promotion modal**

After line 55 (closing `</div>` of promotion-modal), add:

```html
<!-- Pile viewer modal -->
<div id="pile-modal" class="hidden">
  <div id="pile-box">
    <h3 id="pile-title"></h3>
    <div id="pile-grid" class="card-scroll-grid"></div>
    <button id="pile-close">Close</button>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add pile viewer modal HTML"
```

---

## Task 3: Add CSS styles for buttons and modal

**Files:**
- Modify: `style.css`

**Step 1: Add pile button styles after deck-info (line 68)**

```css
/* Pile buttons */
#pile-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.pile-btn {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: #2a2a3a;
  color: #eee;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.pile-btn:hover {
  background: #3a3a4a;
  border-color: #777;
}
```

**Step 2: Add modal styles after promotion modal (line 439)**

```css
/* Pile viewer modal */
#pile-modal { position:fixed; inset:0; background:rgba(0,0,0,.72); display:flex; align-items:center; justify-content:center; z-index:100; }
#pile-modal.hidden { display:none !important; }
#pile-box { background:#1e1e2e; border:2px solid #888; border-radius:8px; padding:1.25rem 1.5rem; text-align:center; max-width: min(700px, 90vw); max-height: 80vh; display: flex; flex-direction: column; }
#pile-box h3 { margin:0 0 .75rem; color:#ccc; font-size:.9rem; }
#pile-grid { flex: 1; overflow-y: auto; margin-bottom: 0.75rem; }
#pile-close {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: #2a2a3a;
  color: #eee;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  align-self: center;
}
#pile-close:hover { background: #3a3a4a; border-color: #777; }
```

**Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add pile button and modal styles"
```

---

## Task 4: Update HTML bottom bar layout

**Files:**
- Modify: `index.html:30-38`

**Step 1: Restructure bottom bar**

Replace lines 30-38 with:

```html
<div id="bottom-bar">
  <button id="btn-discard" class="pile-btn">Discard (0)</button>
  <div id="center-actions">
    <button id="btn-redraw">Redraw (<span id="redraw-countdown">4</span>)</button>
    <button id="btn-undo">Undo</button>
  </div>
  <button id="btn-deck" class="pile-btn">Deck (0)</button>
</div>
```

**Step 2: Remove old deck-info div**

Remove line 38: `<div id="deck-info"></div>`

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: restructure bottom bar with pile buttons"
```

---

## Task 5: Add CSS for bottom bar layout

**Files:**
- Modify: `style.css:28`

**Step 1: Update bottom-bar styles**

Replace line 28:

```css
#bottom-bar { 
  display: flex; 
  gap: 1rem; 
  align-items: center; 
  justify-content: space-between;
  width: 100%;
  margin-top: 0.25rem; 
}
#center-actions { 
  display: flex; 
  gap: 1rem; 
  align-items: center; 
}
```

**Step 2: Commit**

```bash
git add style.css
git commit -m "feat: update bottom bar layout for pile buttons"
```

---

## Task 6: Implement UI functions for pile viewer

**Files:**
- Modify: `js/ui.js`

**Step 1: Add helper function to sort cards**

After `makeCardEl()` function (around line 311), add:

```javascript
function sortCardsByType(cards) {
  const typeOrder = { move: 0, summon: 1, curse: 2 };
  return [...cards].sort((a, b) => {
    const typeA = typeOrder[a.type] ?? 99;
    const typeB = typeOrder[b.type] ?? 99;
    if (typeA !== typeB) return typeA - typeB;
    return (a.name || '').localeCompare(b.name || '');
  });
}
```

**Step 2: Add modal rendering function**

After `renderStatus()` function (around line 361), add:

```javascript
function showPileModal(title, cards) {
  const modal = document.getElementById('pile-modal');
  const titleEl = document.getElementById('pile-title');
  const grid = document.getElementById('pile-grid');
  
  titleEl.textContent = title;
  grid.innerHTML = '';
  
  cards.forEach(card => {
    const el = makeCardEl(card);
    el.style.cursor = 'default';
    grid.appendChild(el);
  });
  
  modal.classList.remove('hidden');
}

function hidePileModal() {
  document.getElementById('pile-modal').classList.add('hidden');
}
```

**Step 3: Update renderStatus to set button text**

Replace line 350:

```javascript
// Old:
// document.getElementById('deck-info').textContent = `Deck: ${d.deck_size}  |  Discard: ${d.discard_size}  |  Lives: ${runState?.lives ?? '—'}`;

// New:
const btnDeck = document.getElementById('btn-deck');
const btnDiscard = document.getElementById('btn-discard');
if (btnDeck) btnDeck.textContent = `Deck (${d.deck_size})`;
if (btnDiscard) btnDiscard.textContent = `Discard (${d.discard_size})`;
```

**Step 4: Add event listeners in main.js or ui.js**

In `js/ui.js`, add initialization function (after `renderStatus`):

```javascript
export function initPileButtons() {
  const btnDeck = document.getElementById('btn-deck');
  const btnDiscard = document.getElementById('btn-discard');
  const btnClose = document.getElementById('pile-close');
  const modal = document.getElementById('pile-modal');
  
  if (btnDeck) {
    btnDeck.addEventListener('click', () => {
      if (!gameState) return;
      const d = gameState.toDict();
      const sorted = sortCardsByType(d.deck);
      showPileModal(`Deck (${d.deck.length} cards)`, sorted);
    });
  }
  
  if (btnDiscard) {
    btnDiscard.addEventListener('click', () => {
      if (!gameState) return;
      const d = gameState.toDict();
      // Discard is already in chronological order (most recent last)
      // Reverse to show most recent first
      const ordered = [...d.discard].reverse();
      showPileModal(`Discard Pile (${d.discard.length} cards)`, ordered);
    });
  }
  
  if (btnClose) {
    btnClose.addEventListener('click', hidePileModal);
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hidePileModal();
    });
  }
}
```

**Step 5: Call initPileButtons in main.js**

In `js/main.js`, add after other initializations:

```javascript
import { initPileButtons } from './ui.js';
// ... existing imports ...

// After DOM loaded or game start:
initPileButtons();
```

**Step 6: Commit**

```bash
git add js/ui.js js/main.js
git commit -m "feat: implement pile viewer modal logic"
```

---

## Task 7: Run all tests

**Step 1: Run test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Commit if all pass**

```bash
git commit -m "test: verify all tests pass with pile viewer"
```

---

## Summary

Changes made:
1. `js/battle_state.js` - Expose `deck` and `discard` arrays in `toDict()`
2. `index.html` - Add pile modal HTML, restructure bottom bar
3. `style.css` - Add pile button and modal styles, update bottom bar layout
4. `js/ui.js` - Add `sortCardsByType()`, `showPileModal()`, `hidePileModal()`, `initPileButtons()`, update `renderStatus()`
5. `js/main.js` - Call `initPileButtons()` on load
6. `tests/battle_state.test.js` - Test for deck/discard array exposure

**Behavior:**
- Deck button (right): Shows all cards sorted by type (move → summon → curse → other), then alphabetically
- Discard button (left): Shows cards in reverse chronological order (most recent first)
- Modal closes via close button or clicking backdrop
- Cards displayed using existing `makeCardEl()` in `card-scroll-grid` layout