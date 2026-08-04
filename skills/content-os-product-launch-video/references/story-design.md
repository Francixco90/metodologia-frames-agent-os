# Story Design — Product Launch Video

Reference for Step 3 (storyboard + script). The orchestrator loads this
on-demand. Pairs with `content-os-creative` story-spine.

## Story spines (product launch archetypes)

Pick spine by product stage + brief intent:

| Archetype        | When to use                          | Hook pattern                      |
| ---------------- | ------------------------------------ | --------------------------------- |
| feature-reveal   | New feature/capability launch        | "What if X just worked?" → reveal |
| problem-solution | Pain point → product as relief       | Name the pain → product resolves  |
| before-after     | Transformation / migration / upgrade | Show before → show after          |
| tour-walkthrough | Site/app tour, show-it-as-is         | "Let me show you around" → shots  |
| founder-story    | Company launch, mission-driven       | Why we built this → what it is    |
| stat-led         | Data/ROI-led pitch                   | Hero stat → proof → product       |

## Hook (first 5s)

The hook must land a single idea. Pick one:

- **Question hook** — "What takes 4 hours today?" → answer = product.
- **Stat hook** — "+2.3x throughput" centered, count-up motion.
- **Pain hook** — "You've seen this screen too many times" → frustration.
- **Tour hook** — "This is [Brand]. Let me show you around."
- **Promise hook** — "By the end of this, you'll X."

Hook ≠ features list. One idea. One focal element. Restraint.

## Beats (per frame)

Each frame carries 1-2 beats (not more):

- **Beat = one claim + one visual proof.** "Fast" claim → show a timer/counter.
- **Evidence over assertion.** Show the UI doing the thing, not a label saying
  "fast."
- **Pacing follows VO.** Frame duration padded to VO segment + 0.3-0.5s breath.
- **Transitions between frames** = content-driven (morph, match-cut, camera
  move), not arbitrary fades.

## VO modes

| Mode         | When                             | SCRIPT.md? | Audio         |
| ------------ | -------------------------------- | ---------- | ------------- |
| narrated     | Full VO over visuals             | yes        | TTS or human  |
| restructured | Restructured narration (tighter) | yes        | TTS           |
| silent       | On-screen text only, music bed   | no         | music or none |

`silent` requires `music: none` + no SCRIPT → silent marker in state. Otherwise
audio job starts via `content-os-media`.

## Persuasion arc

- **Open** with tension (pain, question, gap).
- **Escalate** with proof (feature demo, stat, testimonial).
- **Resolve** with product as answer (CTA, next step).

For tours/showcases: open with "what this is," escalate with depth (sections),
resolve with "try it / sign up / learn more."

## Asset choices (storyboard `asset_candidates`)

- Pull from `capture/extracted/asset-descriptions.md` (canonical inventory).
- Tag each: `{id, kind, role: focal|support|background, frame}`.
- Never reference raw `capture/assets/` paths in storyboard — use canonical ids.
- For no-capture path: `asset_candidates: []` (design on preset palette).
