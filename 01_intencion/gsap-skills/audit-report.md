# gsap-skills vendor audit — Fase 1G

> Audit date: 2026-08-04 · Auditor: lead · 1 motion-library skill (8 sub-skills),
> MIT · Per-file sha256 in [`source-lock.json`](./source-lock.json).

## Scope

1 motion-library skill vendored text-only into
`skills/vendor/gsap-skills/gsap-skills/` as **reference-only** input for the
locally-authored `design-gsap-motion` homólogo (Design-OS Fase 2B/2C, H-03
path). 33 text files in skill dir + 1 LICENSE at vendor root = 34 total.
Binaries excluded (SVG logos). Source is **MIT licensed** (verified).

## Source resolution

| skill         | source repo             | commit    | license | source path  | files vendored |
| ------------- | ----------------------- | --------- | ------- | ------------ | -------------- |
| `gsap-skills` | `greensock/gsap-skills` | `aed9cfd` | MIT     | `/` (scoped) | 33 + LICENSE   |

- **gsap-skills** (official GSAP motion library): 8 sub-skills — `gsap-core`
  (254 lines: gsap.to/from/fromTo, easing, duration, stagger, defaults,
  gsap.matchMedia for responsive + prefers-reduced-motion), `gsap-timeline`
  (107: sequencing, position parameter, labels, nesting), `gsap-scrolltrigger`
  (296: scroll-linked, pinning, scrub, refresh/cleanup), `gsap-plugins` (433:
  Flip, Draggable, Inertia, Observer, SplitText, ScrambleText, SVG/physics,
  CustomEase, EasePack, GSDevTools), `gsap-utils` (284: clamp, mapRange,
  normalize, interpolate, random, snap, toArray, wrap, pipe), `gsap-react`
  (135: useGSAP hook, refs, gsap.context, cleanup, SSR), `gsap-performance`
  (79: transforms over layout props, will-change, batching), `gsap-frameworks`
  (266: Vue, Svelte lifecycle, scoping, cleanup on unmount). Plus
  `examples/` (vue, nuxt, vanilla, react) + `.github/instructions/` (react,
  scrolltrigger). All GSAP plugins now 100% free (Webflow acquisition); from
  public `gsap` npm package — no Club membership/auth token.

## License

Source is **MIT** (Copyright (c) 2026 GreenSock). Verified via LICENSE file at
repo root. MIT permits redistribution and modification with attribution.
Vendored copy retains LICENSE at vendor root
(`skills/vendor/gsap-skills/LICENSE`). Homólogo (`design-gsap-motion`,
Fase 2B/2C) derives under `LicenseRef-MetodologIA-Internal` with
`derivation_mode: clean-room-prose-from-permissive-reference` (MIT-compatible).

## Global audit findings

### 1. License — MIT (verified)

- MIT per `greensock/gsap-skills` LICENSE (`MIT License`, `Copyright (c) 2026
GreenSock`).
- LICENSE copied to vendor root. No source-available/NOT-OSI risk. All GSAP
  plugins 100% free (Webflow acquisition) — no auth-token risk.

### 2. Binaries excluded

- `assets/*.svg` (4 SVG logos) — excluded (binary).
- `.claude-plugin/`, `.cursor-plugin/` (plugin config) — excluded.
- `GEMINI.md`, `CLAUDE.md` (agent config) — excluded.
- `.git/`, `.gitignore` — excluded.
- `file` scan of vendored tree reports 0 binary/image/font/compressed.

### 3. Secrets / PII / private locators

None. SKILL.md + examples reference public URLs only (`https://gsap.com`,
`https://webflow.com`, `npx skills add`, public npm `gsap` package). No
credentials, tokens, internal hostnames, PII.

### 4. Network / execution surface

gsap-skills is a pure knowledge skill (no CLI, no scripts, no package.json at
root). `examples/` declare framework build deps (vite, vue, react) in
`package.json` but are text reference only (not installed). Vendored as
**reference-only** — not executed, not registered, not wired into any
validator. Homólogo `design-gsap-motion` (Fase 2B/2C) describes the GSAP
motion doctrine in prose; `check-skill.mjs` self-contained (no import of
vendor code). GSAP itself is a runtime dependency of the user's project (not
this repo) — homólogo teaches API usage, does not auto-install.

### 5. Content-type verification

33 files UTF-8 text (`.md`, `.vue`, `.html`, `.js`, `.jsx`, `.ts`, `.json`).
0 binary leaks.

## Per-skill checklist

### gsap-skills

- [x] License: MIT (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) 2026 GreenSock" preserved in LICENSE
- [x] Source commit pinned: `aed9cfd`
- [x] Text-only: 33 files in skill dir, 0 binaries (4 SVGs excluded)
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`; 8 critical_file_hashes (one
      SKILL.md per sub-skill)
- [x] Excluded: `assets/` (SVGs), `.claude-plugin/`, `.cursor-plugin/`,
      `GEMINI.md`, `CLAUDE.md`, `.git/`, `.gitignore`
- [x] Vendored: `skills/` (8 sub-skills + llms.txt), `examples/` (vue, nuxt,
      vanilla, react), `.github/instructions/` (react, scrolltrigger) +
      `copilot-instructions.md`, `AGENTS.md`, `README.md`

## Verdict

**PASS.** 1 motion-library skill (8 sub-skills), MIT, 33 text files + LICENSE
vendored, 0 binaries, 0 secrets. Ready for `design-gsap-motion` homólogo
derivation (H-03 path, per-skill runtime-boundary receipt, code `GSM`).
