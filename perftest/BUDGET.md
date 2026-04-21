# AI Search Performance Budget

## Method

Ratio-based gates calibrated to this container (Linux, Node.js/Vitest).

- **Endgame (pos 3) gate** = `min(baseline × 2, cap)`
  - depth-3 cap: 20 ms
  - depth-4 cap: 100 ms
- **Other positions gate** = `(pos_baseline / endgame_baseline) × endgame_gate`
- **Global caps**: 2000 ms (d3), 4000 ms (d4)

## Baselines (this container, 2026-04-21)

| Position | Label            | Depth | Baseline ms | Gate ms | Result |
|----------|-----------------|-------|-------------|---------|--------|
| 1        | standard opening | 3     | 227         | 454     | PASS   |
| 1        | standard opening | 4     | 921         | 1842    | PASS   |
| 2        | open midgame     | 3     | 194         | 388     | PASS   |
| 2        | open midgame     | 4     | 1134        | 2268    | PASS   |
| 3        | endgame          | 3     | 9           | 18      | PASS   |
| 3        | endgame          | 4     | 17          | 34      | PASS   |
| 4        | tactical         | 3     | 198         | 396     | PASS   |
| 4        | tactical         | 4     | 1195        | 2390    | PASS   |
| 5        | king-hunt        | 3     | 897         | 1794    | PASS   |
| 5        | king-hunt        | 4     | 3826        | 3826    | PASS   |

## Notes

- Adaptive depth kicks in for endgame (≤7 pieces → depth+1, ≤4 → depth+2).
- Endgame and tactical positions run faster due to fewer legal moves.
- King-hunt (pos 5) is the most expensive because the player queen+rook generates many combinatorial branches.
- Update baselines in `ai_depth.perf.test.js` when hardware changes.
