# gsap-skills → MetodologIA architecture mapping

> Reference for Design-OS Fase 2B/2C. Maps the vendored gsap-skills doctrine
> (`skills/vendor/gsap-skills/gsap-skills/`) onto the MetodologIA
> `design-gsap-motion` homólogo. MIT-licensed reference; homólogo is a
> locally-authored clean-room adaptation.

## gsap-skills model (as vendored)

1 motion-library skill, MIT (GreenSock 2026), 8 sub-skills:

- `gsap-skills` (greensock/gsap-skills @ `aed9cfd`) — official GSAP (GreenSock
  Animation Platform) doctrine. 8 sub-skills: `gsap-core` (tweens, easing,
  stagger, matchMedia for responsive + prefers-reduced-motion), `gsap-timeline`
  (sequencing, position parameter, labels, nesting, playback), `gsap-scrolltrigger`
  (scroll-linked, pinning, scrub, refresh/cleanup), `gsap-plugins` (Flip,
  Draggable, Inertia, Observer, SplitText, ScrambleText, SVG/physics,
  CustomEase, EasePack, GSDevTools), `gsap-utils` (clamp, mapRange, normalize,
  interpolate, random, snap, wrap, pipe), `gsap-react` (useGSAP hook, refs,
  gsap.context, cleanup, SSR), `gsap-performance` (transforms over layout
  props, will-change, batching, ScrollTrigger tips), `gsap-frameworks` (Vue,
  Svelte lifecycle, scoping, cleanup on unmount). All plugins 100% free
  (Webflow acquisition); public `gsap` npm package, no auth token.

## MetodologIA paradigm

H-03 registry (`registries/skills/creation-v3-skill-registry.yml`, validator
`scripts/check-creation-v3-skills.ts`). The repo already has
`motion-library-adapters` in H-03. Fase 2B/2C adds **`design-gsap-motion`**
derived (clean-room prose) from the vendored gsap-skills umbrella doctrine.
H-03 path: per-skill `runtime-boundary.yml`, 4 append-only events, 3-letter
code `GSM`.

## Capability mapping

| vendored skill | MetodologIA homólogo (Fase 2B/2C) | validator | receipt                          |
| -------------- | --------------------------------- | --------- | -------------------------------- |
| `gsap-skills`  | `design-gsap-motion`              | H-03      | per-skill `runtime-boundary.yml` |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`; `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/gsap-skills/gsap-skills/skills/gsap-core/SKILL.md` (umbrella core doctrine), `core/contracts/creation-v3.ts`
- SKILL.md line: `Derivada de gsap-skills (greensock/gsap-skills, MIT)`

## What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Motion-library intent: GSAP for complex animation sequencing, timelines, scroll-driven animation, performant UI animation, SVG morphing.
- Core API doctrine: gsap.to/from/fromTo, easing, duration, stagger, defaults, gsap.matchMedia (responsive + prefers-reduced-motion).
- Quality bars: transforms over layout props (perf), will-change, gsap.context cleanup (React), useGSAP hook, ScrollTrigger refresh/cleanup, reduced-motion respect.
- Plugin awareness: Flip, Draggable, SplitText, ScrollTrigger, CustomEase (all free).

**Adapts (MetodologIA context):**

- Runtime dep: homólogo teaches GSAP API usage but does not auto-install `gsap` npm package; user installs in their project. No execution surface in homólogo.
- Attribution: `Derivada de gsap-skills (greensock/gsap-skills, MIT)`.
- Registry: H-03 per-skill runtime-boundary (not v2 shared receipt).
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens; forbids `Math.random`/`Date.now`).
- Complements `motion-library-adapters` (existing H-03) + emil animation skills (Fase 1F reference); design-gsap-motion is the GSAP-specific doctrine.

## License guard

- Vendored skill is **MIT** (verified). Homólogo is clean-room prose (`LicenseRef-MetodologIA-Internal`, `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig, prettierignore, eslint, check-privacy). Bypasses reconcile gate RCN-009.
