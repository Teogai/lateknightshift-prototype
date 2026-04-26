# CHARMS

## Overview
Charms enhance cards. Obtained from elite battles.

## Rules
- Charms are applied immediately upon receiving (pick charm → pick valid card → attach)
- A card can have at most one charm
- Charms persist on cards through the entire run
- Charms define valid card types they can be attached to

## Charm Types

| ID | Name | Valid Cards | Effect |
|----|------|-------------|--------|
| `push` | Push | `move` | After moving, push all adjacent pieces 1 square away. Only if square behind is empty and on-board. |
| `atomic` | Atomic | `piece` | Summoned piece becomes atomic. Explodes in 3x3 area on capture (both capturing and being captured). |

## Data
- Definitions: `config/charms.js` (`CHARM_DEFS`)
- Catalog: `js/charms.js` (`CHARM_CATALOG`)
- Reward logic: `js/rewards.js` (`pickCharmChoices`, `applyCharmToCard`)

## Adding a New Charm

1. `config/charms.js` — add entry to `CHARM_DEFS` with id, name, desc, validCardTypes, rarity
2. `js/charms.js` — `CHARM_CATALOG` auto-builds from config
3. `js/battle_state.js` — implement effect in relevant play methods
4. `js/rewards.js` — `renderCharmRewardScreen` + `renderCharmApplyScreen` if UI changes needed
5. Add tests in `tests/charms.test.js`

## UI Rendering
- Cards with charms display the charm as a keyword badge at the bottom
- Charm badge rendered via `_parseCardDesc` as `{charm.id}` keyword span with tooltip
- Keywords registered in `js/ui.js` `KEYWORD_REGISTRY` (color + tooltip)
- Charm badge element (`<div class="charm-badge">`) contains keyword span, no border
- CSS: `css/cards.css` `.charm-badge`
- Files: `js/ui.js:makeCardEl()`, `js/ui.js:KEYWORD_REGISTRY`, `css/cards.css`

## Implementation Notes

### Push Charm
- Resolved after move card resolves (`playMoveCard`, `playKnightMoveCard`, etc.)
- Also resolved on **both moves** of multi-step cards (`playBlitzFirstMove`, `playBlitzSecondMove`, `playMoveTogetherFirst`, `playMoveTogetherSecond`)
- From destination square, checks all 8 directions for adjacent pieces
- Push only if square directly behind piece is empty and on-board
- Blocked by any piece behind or at board edge — piece stays in place

### Atomic Charm
- Applied to piece cards: summoned piece gets `data.atomic = true`
- On capture by atomic piece: 3x3 explosion at destination after move
- On capture of atomic piece: 3x3 explosion at destination before removal
- Explosion destroys ALL pieces in the 3x3 area including the piece that triggered it
- Tracked in both player moves (`checkAndResolveAtomic`) and enemy moves (`_applyEnemyAction`)