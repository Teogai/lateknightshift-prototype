# Center-Align All UI Screens & Title Visibility

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Center-align all UI elements on every screen, move game sidebar to top, and show title text only on character select screen.

**Architecture:** Pure CSS changes to `style.css` using flexbox centering. No HTML changes needed. Title visibility controlled by CSS display property per screen.

**Tech Stack:** Vanilla CSS, flexbox

---

## Task 1: Center-Align Non-Game Screens

**Files:**
- Modify: `style.css:18-28` (screen-select)
- Modify: `style.css:260-264` (screen-map)
- Modify: `style.css:359-361` (screen-room)
- Modify: `style.css:431-433` (screen-victory)
- Modify: `style.css:451-453` (screen-defeat)
- Modify: `style.css:461-463` (screen-complete)

**Step 1: Add center alignment to screen containers**

Add to each screen ID:
```css
display: flex;
flex-direction: column;
align-items: center;
text-align: center;
```

Screens to update:
- `#screen-select` - already has `max-width: 320px`, add centering
- `#screen-map` - add `align-items: center`
- `#screen-room` - add `align-items: center` 
- `#screen-victory` - already has `text-align: center`, verify `align-items: center`
- `#screen-defeat` - add `align-items: center`
- `#screen-complete` - add `align-items: center`

**Step 2: Center child elements**

Ensure direct children are centered:
- `#map-header` - already `text-align: center`, verify
- `#map-content` - add `display: flex; justify-content: center`
- `#room-content` - already has `align-items: center`
- `#defeat-content` - already has `flex-direction: column`, add `align-items: center`
- `#complete-message` - add `text-align: center`

**Step 3: Run visual check**

Open dev server and verify each screen is centered.

**Step 4: Commit**

```bash
git add style.css
git commit -m "center-align all non-game screens"
```

---

## Task 2: Move Game Sidebar to Top

**Files:**
- Modify: `style.css:30-56` (game layout)

**Step 1: Change layout direction**

Change `#layout` from row to column:
```css
#layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  width: 100%;
}
```

**Step 2: Restyle sidebar for horizontal top layout**

```css
#sidebar {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 100%;
  padding-top: 0;
}
```

**Step 3: Ensure board column stays centered**

```css
#board-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}
```

**Step 4: Update enemy panel for horizontal layout**

```css
.enemy-panel {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}
```

**Step 5: Run visual check**

Verify sidebar appears at top, board is centered.

**Step 6: Commit**

```bash
git add style.css
git commit -m "move game sidebar to top and center layout"
```

---

## Task 3: Show Title Only on Character Select Screen

**Files:**
- Modify: `style.css:12-13` (h1 styling)
- Modify: `style.css:72-78` (screen-map h1)
- Modify: `style.css:80-84` (screen-room h1)
- Modify: `style.css:86-90` (screen-defeat h1)
- Modify: `style.css:92-97` (screen-victory h1)
- Modify: `style.css:99-104` (screen-complete h1)

**Step 1: Hide h1 on all screens except select**

```css
/* Hide title on all screens by default */
#screen-map h1,
#screen-room h1,
#screen-defeat h1,
#screen-victory h1,
#screen-complete h1 {
  display: none;
}
```

**Step 2: Keep title visible on select screen**

`#screen-select h1` remains visible (no change needed).

**Step 3: Verify no other h1 elements exist on game screen**

Game screen (`#screen-game`) does not have an h1 in HTML.

**Step 4: Run visual check**

Verify title only appears on character select screen.

**Step 5: Commit**

```bash
git add style.css
git commit -m "show title text only on character select screen"
```

---

## Task 4: Update Mobile Responsive Styles

**Files:**
- Modify: `style.css:643-761` (mobile media query)

**Step 1: Update mobile game layout**

Mobile sidebar already moves to top in existing media query. Verify it stays centered:
```css
@media (max-width: 767px) {
  #layout {
    flex-direction: column;
    align-items: center;
  }
  
  #sidebar {
    justify-content: center;
  }
}
```

**Step 2: Update mobile screen centering**

Ensure all screens stay centered on mobile:
```css
#screen-select,
#screen-map,
#screen-room,
#screen-victory,
#screen-defeat,
#screen-complete {
  width: 100%;
  align-items: center;
}
```

**Step 3: Commit**

```bash
git add style.css
git commit -m "update mobile responsive centering"
```

---

## Testing Checklist

- [ ] Character select screen: title visible, everything centered
- [ ] Map screen: no title, everything centered
- [ ] Room screen: no title, everything centered  
- [ ] Game screen: no title, sidebar on top, board centered
- [ ] Victory screen: no title, everything centered
- [ ] Defeat screen: no title, everything centered
- [ ] Complete screen: no title, everything centered
- [ ] Mobile: all screens remain centered

## Docs Update

- Update `docs/ARCHITECTURE.md` if UI layout section exists
- Add entry to `docs/TASKS.md`

---

**Plan complete.** Ready for execution.