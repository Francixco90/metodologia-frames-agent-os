# Waterfall Cut (word-by-word cut-the-curve)

Cut-the-curve at WORD granularity — the strongest leftward cut for text-to-text seams.
Outgoing words ramp out on their own curves; incoming words cascade in mid-flight — a wave
the eye rides across the seam.

**Scope:** worker-authored inside one multi-beat comp (stacked full-frame `.beat` layers),
NOT a registry/injector type — it tweens word spans, not clip wrappers. The boundary into
and out of the text-beat block still gets a normal registry transition. Does not count
against the 2–3 transition budget.

| Parameter           | Value                 | Why                                         |
| ------------------- | --------------------- | ------------------------------------------- |
| Travel              | ±230px (~12% frame)   | partial travel + velocity > full-frame push |
| Exit                | 0.34s `power4.in`    | the acceleration IS the cut                 |
| Exit fade           | 0.18s, starts with x  | word gone by ~25–30% of travel — no smear   |
| Exit stagger        | +0.022s reading order | the line peels, not a block slide           |
| Entry               | 0.3s `power4.out`     | back half of the composite — velocity match |
| Entry start opacity | 0.35                  | mid-path ignition; binary 0→1 pops          |
| Entry gaps          | 0.05s × 0.84 decay   | accelerating cascade, resolves composed     |

Pre-set all words to `x: +230, opacity: 0` at build time — `immediateRender: false` alone
leaves un-started words visible. One direction per chain, riding the current (inverse zoom
is the chain's ARRIVAL beat only). A short first beat may exit whole-line: its fade ends
~0.02s before the cut so it is still streaking when the next words ignite — no dead gap.
Transform/opacity only (seek-safe); opaque stage ground applies.