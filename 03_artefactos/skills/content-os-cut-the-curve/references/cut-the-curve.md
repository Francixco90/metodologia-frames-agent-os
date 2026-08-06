# Cut the Curve (default scene boundary)

X/Y velocity-matched cut — the default for ALL scene-to-scene boundaries, in the film's
current, not an accent. Outgoing hero accelerates one direction, the cut lands mid-motion,
incoming hero continues the SAME direction and decelerates. Total ≈ 0.6s; directions
LEFT / RIGHT / UP / DOWN (default LEFT). **Partial travel:** ~12% of frame (≈230px at 1920)
— never full off-screen moves.

| Direction | Exit          | Entry start → end |
| --------- | ------------- | ----------------- |
| Leftward  | `x: 0 → −230` | `x: +230 → 0`     |
| Rightward | `x: 0 → +230` | `x: −230 → 0`     |
| Upward    | `y: 0 → −230` | `y: +230 → 0`     |
| Downward  | `y: 0 → −230` | `y: −230 → 0`     |

- **Mirrored eases:** exit `power4.in` + entry `power4.out`, same distance/duration — two
  halves of one `power4.inOut`; velocity matches at the cut.
- **Fade trick:** exit opacity completes at ~25–30% of travel (fade ≈ 0.18–0.3s vs motion
  0.3–0.34s); entry ignites at ~0.35 mid-path. Last fading element dies at the cut — dead
  air reads as a gap.
- Exit 0.2–0.4s; entry ≥ exit. Optional blur 8–10px.
- **Stage ground:** `#root` opaque
  (`background: var(--canvas-deep, var(--canvas, #000))`) — summed-opacity < 1 flashes white
  otherwise (see `content-os-seam-craft`).

`push-slide` violates partial-travel and mid-motion phase; prefer cut-the-curve.