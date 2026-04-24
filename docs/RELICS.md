# RELICS

Permanent upgrades that persist for the entire run.

## How to obtain
- Enter a `relic` room on the map path
- Choose 1 of 3 offered relics (select-then-confirm pattern)
- Already-owned relics are excluded from choices
- Debug reroll button available to regenerate choices

## Relic List

| ID | Name | Effect |
|----|------|--------|
| `slammer` | Slammer | When push is blocked, destroy the pushed piece. Shield blocks this. |
| `duck_handler` | Duck Handler | Normal move cards can move ducks like a king. Cannot capture. |

## Implementation
- Data: `config/relics.js`, `js/relics.js`
- UI bar: `css/relics.css`, `#relic-bar` in `index.html`
- Bar tooltip: custom tooltip via `_showTooltip`/`_hideTooltip` (not native `title`)
- Effects: `js/battle_state.js` (Slammer in `resolvePush`, Duck Handler in `playMoveCard`)
- Reward screen: `js/rewards.js` `renderRelicRewardScreen()` — select-then-confirm, `.relic-grid` + `.relic-choice` CSS