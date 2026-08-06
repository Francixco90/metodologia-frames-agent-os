# Inverse Zoom-Through (backward)

The pull-back mirror: outgoing RECEDES; incoming arrives OVERSIZED (as if just behind
camera) and retracts into the focal plane. Everything SHRINKS. Spend on ARRIVAL/payoff beats
— a payoff line, a giant reply, a held end-state — never ordinary boundaries. Total ≈ 0.7s
(30% exit / 70% entry).

| Phase          | Scale     | Blur     | Opacity           | Ease                                       | Duration |
| -------------- | --------- | -------- | ----------------- | ------------------------------------------ | -------- |
| Exit           | 1 → 0.8   | 0 → 10px | 1 → 0.15          | power3.in (opacity: separate `none` tween) | ~0.2s    |
| Cut (`tl.set`) | in: 1.25  | 10px     | out: 0 / in: 0.15 | —                                          | —        |
| Entry          | 1.25 → 1  | 10 → 0px | 0.15 → 1          | expo.out                                   | ~0.5s    |

Blur 10px text-scale; 18–20px only when both sides are full-bleed. Sign discipline: incoming
arrives composed inside the retracting wrapper — no grow-from-small intro in the seam
window. Staged entrances happen after retraction settles, or start ≥1 and retract.