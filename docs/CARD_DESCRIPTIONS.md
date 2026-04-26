# Card Descriptions & Keyword Tooltips

## Rules

### Keyword Tooltips
- Describe **what** the tag/status does
- **Never include duration** — duration depends on the card/effect that applies it
- Example: `knight_power` → "Knight Power: can move like a knight."
- Example: `stun` → "Stun: cannot move."
- Registry: `js/ui.js` `KEYWORD_REGISTRY`

### Card Descriptions
- Cards that apply tags should **specify duration** if there is one
- Cards should **not repeat the tag description** — the keyword tooltip already explains it
- Example: `"Apply {knight power} for 1 move."` not `"Apply {knight power}: can move like a {knight}. Lasts 1 move."`
- Exception: tags with no fixed duration (e.g. `{shield}` — lasts until triggered) just say `"Apply {shield}."`

### Examples

| Card | Correct Description | Wrong Description |
|------|---------------------|-------------------|
| Knight Power | Apply {knight power} for 1 move. | Apply {knight power}: can move like a {knight}. Lasts 1 move. |
| Stun | Apply {stun} for 2 turns. | Apply {stun}: cannot move for 2 turns. |
| Shield | Apply {shield}. | Apply {shield}: blocks first capture. |

## Files
- `js/ui.js` — `KEYWORD_REGISTRY` (tooltips)
- `config/cards.js` — card `desc` fields
- `js/cards2/move_cards.js` — card factories with descriptions
