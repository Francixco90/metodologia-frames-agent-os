# blueprint: brand-reveal

Shot 4-6s para Hook o Brand_Outro. Wordmark entra con fade-slide-rise, tagline stagger,
settle-scale al final. Product-agnostic; mapea `[slots]` a tu brand.

## Time-coded shape

- **Scene 1 (0.0–1.2s): wordmark arrival.** `[slot: wordmark]` fade-slide-rise
  (`rules/fade-slide-rise.md`) con `power2.out`, duration 0.8s. From `{opacity: 0, y: 40}`
  to `{opacity: 1, y: 0}`.
- **Scene 2 (0.6–2.0s): tagline stagger.** `[slot: tagline-lines]` (2-4 líneas) fade-slide-rise
  con `stagger: 0.12` (`items × stagger ≤ 0.5s`). Mismo ease, duration 0.6s por item. Start
  absolute en `0.6` (no `+=`).
- **Scene 3 (2.0–3.2s): hold + settle-scale.** Wordmark micro-breath: `fromTo` scale
  `{scale: 1}` → `{scale: 1.04, duration: 0.6, ease: 'sine.inOut'}` luego
  `{scale: 1, duration: 0.6, ease: 'sine.inOut'}` (yoyo equivalente con dos tweens
  absolutos, no `yoyo: true` con `repeat`).
- **Scene 4 (3.2–4.0s): rest.** Hold frame. Sin tween. Composition `data-duration` gobierna
  el length total (mínimo 4s).

## Slots

- `[slot: wordmark]` — string (brand name, 1-3 palabras).
- `[slot: tagline-lines]` — array de 2-4 strings (≤ 60 chars cada).

## Rules referenced

- `rules/fade-slide-rise.md` (Scene 1, 2, 3).

## Críticas específicas

- **Starts absolutos** — todas las positions en timeline son números absolutos (0.0, 0.6,
  2.0, 3.2), nunca `+=`/`-=`. Seek-safe bidireccional.
- **No `yoyo: true` + `repeat`** para el settle-scale — dos tweens absolutos en positions
  2.0 y 2.6. `yoyo` con `repeat: 1` es seek-safe pero dos tweens son más explícitos y
  debuggeables.
- **Stagger cap** — 4 tagline lines × 0.12 = 0.48s ≤ 0.5s. Si necesitas 5+ lines, baja
  stagger a 0.08 (5 × 0.08 = 0.4s).

## Ground truth

`examples/brand-reveal.html` instancia este blueprint con wordmark "MetodologIA" y tagline
["Content", "OS", "dual paradigm"].
