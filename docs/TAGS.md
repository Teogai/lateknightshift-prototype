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
