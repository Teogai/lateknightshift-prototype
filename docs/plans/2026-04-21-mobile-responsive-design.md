# Mobile Responsive UI Design

## Overview
Make all game screens responsive with a single breakpoint at 768px. Battle sidebar moves to top on mobile. Board scales to fit screen width. All other screens adapt padding and sizing.

## Decisions
- Breakpoint: 768px (`md:` prefix convention in CSS via media queries)
- Board squares use `clamp()` to scale between 42px (small phone) and 52px (desktop)
- Hand cards shrink to 85x120px on mobile and scroll horizontally
- Debug UI in map view moves outside scroll container

## Battle Screen (screen-game)

### Desktop (>= 768px)
- Layout: flex row, sidebar 180px left, board-col center
- Board: 52px squares, 416px total
- Hand: wrap, cards 110x150px
- Bottom bar: horizontal, deck | redraw+undo | discard

### Mobile (< 768px)
- Layout: flex column, full width
- Top bar: compact enemy info (name + badge + ability) horizontal strip
- Board: `min(95vw, 416px)`, squares `clamp(42px, 11vw, 52px)`
- Hand: `overflow-x: auto`, `flex-wrap: nowrap`, cards 85x120px
- Bottom bar: compact padding, smaller buttons

## Map Screen (screen-map)
- Path track: horizontal scroll with `overflow-x: auto`
- Nodes shrink from 72px to 56px on mobile
- Debug floor selector moved OUTSIDE `#map-content` scroll area
- Font sizes reduce on mobile

## Room / Victory / Defeat / Complete
- Desktop: centered, max-width containers
- Mobile: full width, `px-4` padding
- Card/piece choices scroll horizontally if needed

## CSS Strategy
- Use CSS custom properties for square size and card size
- Media query at 768px switches layout direction and sizes
- Replace fixed px with `clamp()` or relative units
- Add `touch-action: manipulation` to buttons
- Modals: full-screen on mobile, capped on desktop
