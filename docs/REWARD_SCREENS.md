# REWARD SCREENS

All reward/choice screens MUST include a debug reroll button for development.

## Main choice screens (must have reroll)

These screens present choices to the player and must support reroll:

- `renderCardRewardScreen` — `onReroll` callback regenerates choices
- `renderPieceRewardScreen` — `onReroll` callback regenerates choices
- `renderRelicRewardScreen` — `onReroll` callback regenerates choices
- `renderUpgradeScreen` — `onReroll` callback regenerates choices
- `renderTransformScreen` — `onReroll` callback regenerates choices
- `renderShopScreen` — `onReroll` callback regenerates choices
- `renderCharmRewardScreen` — `onReroll` callback regenerates choices
- `renderDefeatScreen` — `onReroll` callback (regenerates consequence options)

## Sub-screens (no reroll)

These are follow-up screens after a choice is made; no reroll:

- `renderSquarePicker` — piece placement after piece reward
- `renderCharmApplyScreen` — apply charm to chosen card
- `renderTransformResultScreen` — shows transformation result

## Reroll button pattern

```javascript
export function renderSomeRewardScreen(choices, onChosen, onReroll) {
  // ... render choices with select-then-confirm ...

  if (onReroll) {
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'debug-btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.style.marginTop = '0.5rem';
    rerollBtn.addEventListener('click', onReroll);
    content.appendChild(rerollBtn);
  }
}
```

## Caller pattern

```javascript
const showReward = () => {
  const choices = pickChoices(3);
  renderRewardScreen(choices, (i, choice) => {
    // apply choice
    advanceAfterRoom();
  }, showReward);
};
showReward();
```

## CSS

`.debug-btn` is defined in `css/base.css`:
- Background: `#2a1a1a`
- Border: `1px solid #663333`
- Text: `#cc8888`
- Hover: `#3a2020`