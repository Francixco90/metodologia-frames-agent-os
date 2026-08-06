# Zoom-Through (forward)

Z-axis velocity-matched cut; **never both texts visible.** Everything GROWS: outgoing
accelerates toward camera, a hard swap hides at peak blur, incoming keeps growing into the
focal plane. Headlines and short phrases only. Total ≈ 0.4s.

| Phase          | Scale    | Blur     | Opacity           | Ease                                       | Duration |
| -------------- | -------- | -------- | ----------------- | ------------------------------------------ | -------- |
| Exit           | 1 → 1.2  | 0 → 10px | 1 → 0.15          | power3.in (opacity: separate `none` tween) | 0.2s     |
| Cut (`tl.set`) | in: 0.75 | 10px     | out: 0 / in: 0.15 | —                                          | —        |
| Entry          | 0.75 → 1 | 10 → 0px | 0.15 → 1          | expo.out                                   | 0.5s     |

Exit opacity MUST be its own linear tween — `power3.in` holds it near 1 too long. On entry
all properties share `expo.out`.