# RELICS

Permanent upgrades that persist for the entire run.

## How to obtain
- Enter a `relic` room on the map path (floors 4, 8, 12, 6, 17)
- Choose 1 of 3 offered relics
- Already-owned relics are excluded from choices

## Relic List

| ID | Name | Effect |
|----|------|--------|
| `slammer` | Slammer | When push is blocked, destroy the pushed piece. Shield blocks this. |
| `duck_handler` | Duck Handler | Normal move cards can move ducks like a king. Cannot capture. |

## Implementation
- Data: `config/relics.js`, `js/relics.js`
- UI bar: `css/relics.css`, `#relic-bar` in `index.html`
- Effects: `js/battle_state.js` (Slammer in `resolvePush`, Duck Handler in `playMoveCard`)
- Reward screen: `js/rewards.js` `renderRelicRewardScreen()`
