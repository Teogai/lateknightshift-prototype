# Mobile Responsive UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all game screens responsive with a 768px breakpoint. Battle sidebar moves to top on mobile. Board scales to fit screen width. Debug UI in map view moves outside scroll container.

**Architecture:** CSS-only responsive approach using media queries at 768px. CSS custom properties for dynamic sizing. Minimal HTML/JS changes — mostly CSS refactoring.

**Tech Stack:** Vanilla CSS, vanilla JS, no frameworks.

---

## Task 1: Add CSS custom properties and base responsive styles

**Files:**
- Modify: `style.css`

**Step 1: Add CSS custom properties at root**

Add `:root` custom properties for board square size, card dimensions, and sidebar width. These will be overridden in the mobile media query.

```css
:root {
  --sq-size: 52px;
  --card-w: 110px;
  --card-h: 150px;
  --sidebar-w: 180px;
}
```

**Step 2: Replace fixed board dimensions with custom properties**

Change `#board` grid and `.sq` sizes from `52px` to `var(--sq-size)`.

**Step 3: Replace card dimensions with custom properties**

Change `.card` width/height from fixed px to `var(--card-w)` / `var(--card-h)`.

**Step 4: Replace sidebar width with custom property**

Change `#sidebar` width from `180px` to `var(--sidebar-w)`.

**Step 5: Add mobile media query (max-width: 767px)**

```css
@media (max-width: 767px) {
  :root {
    --sq-size: clamp(42px, 11vw, 52px);
    --card-w: 85px;
    --card-h: 120px;
    --sidebar-w: 100%;
  }
  
  body {
    padding: 0.5rem;
  }
  
  #layout {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  
  #sidebar {
    width: 100%;
    padding-top: 0;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .enemy-panel {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    width: 100%;
  }
  
  .enemy-panel-name {
    font-size: 0.9rem;
  }
  
  .ability-name, .ability-desc {
    font-size: 0.7rem;
  }
  
  .enemy-panel-divider {
    display: none;
  }
  
  #board-col {
    width: 100%;
    gap: 0.25rem;
  }
  
  #board {
    margin: 0 auto;
  }
  
  #hand {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    justify-content: flex-start;
    width: 100%;
  }
  
  .card {
    flex-shrink: 0;
  }
  
  .card-art {
    height: 50px;
  }
  
  .card-piece-img, .card-art-img {
    max-height: 40px;
    max-width: 40px;
    width: 45px;
    height: 45px;
  }
  
  .card-name {
    font-size: 0.7rem;
  }
  
  .card-desc {
    font-size: 0.65rem;
  }
  
  #bottom-bar {
    gap: 0.5rem;
    padding: 0 0.25rem;
  }
  
  .pile-btn, #btn-redraw, #btn-undo {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
  
  #btn-redraw {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  #debug-bar {
    gap: 0.3rem;
  }
  
  #debug-bar button {
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
  }
  
  #status-bar {
    font-size: 0.9rem;
  }
  
  #action-hint {
    font-size: 0.8rem;
  }
  
  .piece-img {
    width: calc(var(--sq-size) - 6px);
    height: calc(var(--sq-size) - 6px);
  }
  
  /* Touch-friendly buttons */
  button {
    touch-action: manipulation;
  }
}
```

**Step 6: Add desktop media query (min-width: 768px) for layout**

```css
@media (min-width: 768px) {
  #layout {
    flex-direction: row;
    gap: 2rem;
  }
  
  #sidebar {
    flex-direction: column;
    width: var(--sidebar-w);
  }
  
  .enemy-panel {
    flex-direction: column;
  }
  
  .enemy-panel-divider {
    display: block;
  }
}
```

**Step 7: Run tests**

Run: `npm test`
Expected: PASS (CSS changes don't affect JS logic tests)

**Step 8: Commit**

```bash
git add style.css
git commit -m "Add: responsive CSS with mobile breakpoint for battle screen"
```

---

## Task 2: Make board and pieces responsive

**Files:**
- Modify: `style.css`

**Step 1: Update board grid to use custom property**

```css
#board {
  display: grid;
  grid-template-columns: repeat(8, var(--sq-size));
  grid-template-rows: repeat(8, var(--sq-size));
  gap: 0;
  border: 2px solid #444;
  width: max-content;
}
```

**Step 2: Update square size**

```css
.sq {
  width: var(--sq-size);
  height: var(--sq-size);
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
```

**Step 3: Update piece image size to be relative to square**

```css
.piece-img {
  width: calc(var(--sq-size) - 6px);
  height: calc(var(--sq-size) - 6px);
  display: block;
  pointer-events: none;
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add style.css
git commit -m "Add: responsive board sizing with CSS custom properties"
```

---

## Task 3: Make hand cards responsive

**Files:**
- Modify: `style.css`

**Step 1: Update card dimensions**

```css
.card {
  width: var(--card-w);
  min-height: var(--card-h);
  /* ... rest unchanged */
}
```

**Step 2: Update card art height to be proportional**

```css
.card-art {
  height: calc(var(--card-h) * 0.43);
  width: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Step 3: Update card piece image sizes**

```css
.card-piece-img {
  max-height: calc(var(--card-h) * 0.33);
  max-width: calc(var(--card-h) * 0.33);
  object-fit: contain;
}

.card-art-img {
  width: calc(var(--card-h) * 0.4);
  height: calc(var(--card-h) * 0.4);
  object-fit: contain;
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add style.css
git commit -m "Add: responsive hand card sizing"
```

---

## Task 4: Make map screen responsive + move debug UI outside scroll

**Files:**
- Modify: `style.css`
- Modify: `js/ui.js`
- Modify: `index.html`

**Step 1: Update map screen CSS for mobile**

```css
/* Add to mobile media query */
@media (max-width: 767px) {
  #screen-map {
    width: 100%;
    padding: 0 0.5rem;
  }
  
  .path-node {
    width: 56px;
    padding: 0.35rem 0.2rem 0.3rem;
  }
  
  .path-node-label {
    font-size: 0.5rem;
  }
  
  .path-node-icon {
    font-size: 1rem;
  }
  
  .path-floor-num {
    font-size: 0.55rem;
  }
  
  .path-enter-btn {
    width: 56px;
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
  
  .path-connector {
    width: 16px;
    margin-top: 22px;
  }
}
```

**Step 2: Move debug UI outside scroll container in HTML**

In `index.html`, add a new `#map-debug` div outside `#map-content`:

```html
<!-- Screen: Map -->
<div id="screen-map" class="hidden">
  <h1>Late Knight Shift</h1>
  <div id="map-header"></div>
  <div id="map-content"></div>
  <div id="map-debug"></div>
</div>
```

**Step 3: Update ui.js to render debug UI into #map-debug**

In `renderPathTrack()`, change the debug div from being appended to `content` to being appended to `document.getElementById('map-debug')`.

Find this code in `js/ui.js` (around line 688-736):
```javascript
  // Debug: floor selector
  const debugDiv = document.createElement('div');
  // ... debug div setup ...
  content.appendChild(debugDiv);
```

Change to:
```javascript
  // Debug: floor selector
  const debugContainer = document.getElementById('map-debug');
  if (debugContainer) {
    debugContainer.innerHTML = '';
    const debugDiv = document.createElement('div');
    debugDiv.style.marginTop = '1.5rem';
    debugDiv.style.padding = '0.75rem';
    debugDiv.style.border = '1px solid #663333';
    debugDiv.style.borderRadius = '4px';
    debugDiv.style.backgroundColor = '#1a1a1a';
    
    const label = document.createElement('label');
    label.textContent = 'Debug Floor: ';
    label.style.color = '#cc8888';
    label.style.fontSize = '0.85rem';
    label.style.marginRight = '0.5rem';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '16';
    input.value = rs.currentFloor;
    input.style.width = '60px';
    input.style.padding = '0.3rem';
    input.style.marginRight = '0.5rem';
    
    const button = document.createElement('button');
    button.textContent = 'Jump';
    button.className = 'debug-btn';
    button.addEventListener('click', () => {
      const floor = parseInt(input.value, 10);
      if (floor >= 1 && floor <= 16) {
        handleDebugFloor(floor);
      }
    });
    
    debugDiv.appendChild(label);
    debugDiv.appendChild(input);
    debugDiv.appendChild(button);
    debugContainer.appendChild(debugDiv);
  }
```

Also remove the inline hover styles from the button and use the `.debug-btn` class instead.

**Step 4: Add CSS for map-debug container**

```css
#map-debug {
  margin-top: 1rem;
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add style.css js/ui.js index.html
git commit -m "Add: responsive map screen, move debug UI outside scroll"
```

---

## Task 5: Make room/victory/defeat/complete screens responsive

**Files:**
- Modify: `style.css`

**Step 1: Add mobile styles for room screen**

```css
@media (max-width: 767px) {
  #screen-room {
    width: 100%;
    padding: 0 0.5rem;
  }
  
  .card-choices, .piece-choices {
    flex-wrap: nowrap;
    overflow-x: auto;
    justify-content: flex-start;
    width: 100%;
    padding-bottom: 0.5rem;
  }
  
  .piece-reward-btn {
    width: 90px;
    min-height: 85px;
    font-size: 0.85rem;
    flex-shrink: 0;
  }
  
  .reward-card-btn {
    font-size: 0.85rem;
    padding: 0.5rem 0.8rem;
    flex-shrink: 0;
  }
  
  .placement-board {
    grid-template-columns: repeat(8, var(--sq-size));
    grid-template-rows: repeat(8, var(--sq-size));
    margin: 0 auto;
  }
}
```

**Step 2: Add mobile styles for victory/defeat/complete screens**

```css
@media (max-width: 767px) {
  #screen-victory,
  #screen-defeat,
  #screen-complete {
    width: 100%;
    padding: 0 1rem;
    max-width: none;
  }
  
  #screen-victory h1 {
    font-size: 1.5rem;
  }
}
```

**Step 3: Make modals responsive**

```css
@media (max-width: 767px) {
  #promotion-box, #pile-box {
    max-width: 95vw;
    padding: 1rem;
  }
  
  .promo-btn {
    width: 50px;
    height: 50px;
  }
  
  .promo-btn img {
    width: 40px;
    height: 40px;
  }
  
  #pile-grid {
    max-height: 60vh;
  }
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add style.css
git commit -m "Add: responsive room, victory, defeat, and modal screens"
```

---

## Task 6: Make character select screen responsive

**Files:**
- Modify: `style.css`

**Step 1: Add mobile styles for select screen**

```css
@media (max-width: 767px) {
  #screen-select {
    width: 100%;
    max-width: none;
    padding: 0 1rem;
  }
  
  #screen-select h1 {
    font-size: 1.2rem;
  }
  
  .char-btn {
    font-size: 0.9rem;
    padding: 0.5rem 0.8rem;
  }
}
```

**Step 2: Run tests**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add style.css
git commit -m "Add: responsive character select screen"
```

---

## Task 7: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 2: Check for any visual regressions in CSS**

Do a quick read-through of `style.css` to ensure no syntax errors, missing braces, or conflicting rules.

**Step 3: Update docs**

Add a note to `docs/ARCHITECTURE.md` under "Key design notes":
```
- Responsive UI: 768px breakpoint, mobile sidebar becomes top bar, board scales with clamp()
```

Update `docs/TASKS.md`:
```
[2026-04-21] done: mobile responsive UI for all screens
```

**Step 4: Commit docs**

```bash
git add docs/ARCHITECTURE.md docs/TASKS.md
git commit -m "Docs: update architecture and tasks for mobile responsive UI"
```

---

## Testing Notes

Since this is a pure CSS/HTML change with minimal JS:
- `npm test` covers JS logic (should all still pass)
- Visual testing via browser dev tools mobile viewport is recommended but not required per AGENTS.md rules (logic changes use Vitest; this is layout/CSS)
- Key things to verify in browser if testing visually:
  - Board scales down on 375px width
  - Hand cards scroll horizontally on mobile
  - Sidebar becomes compact top bar on mobile
  - Map debug UI is outside scroll area
  - All modals are usable on small screens
