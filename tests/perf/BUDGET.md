# AI Search Performance Budget

Gate: depth-3 < 1000 ms per position (CI budget).
Target: depth-3 < 250 ms on modern hardware.

Measured on: Windows 11, Node.js/Vitest, 2026-04-20.

Note: adaptive depth kicks in for endgame (≤7 pieces → depth+1, ≤4 → depth+2).
Endgame and tactical positions run faster due to fewer legal moves.
King-hunt (pos 5) is the most expensive at depth-3 because the player queen+rook
generates many combinatorial branches.

| Position | Label            | Depth | ms   | Result |
|----------|-----------------|-------|------|--------|
| 1        | standard opening | 3     | 254  | PASS   |
| 1        | standard opening | 4     | 868  | log    |
| 2        | open midgame     | 3     | 164  | PASS   |
| 2        | open midgame     | 4     | 1065 | log    |
| 3        | endgame          | 3     | 6    | PASS   |
| 3        | endgame          | 4     | 32   | log    |
| 4        | tactical         | 3     | 130  | PASS   |
| 4        | tactical         | 4     | 1123 | log    |
| 5        | king-hunt        | 3     | 593  | PASS   |
| 5        | king-hunt        | 4     | 3571 | log    |
