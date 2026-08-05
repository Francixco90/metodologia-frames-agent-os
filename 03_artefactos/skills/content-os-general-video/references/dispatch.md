# Sub-Agent Dispatch — Scale-Dependent

Dispatch pays for itself only at scale. Authoring packets and warming fresh
worker contexts costs real minutes and tokens. A film of up to ~6 short scenes
builds **faster inline**, in this context, one scene after another (measured: 5
short scenes ≈ 9 min inline vs ≈ 21 min packetized).

## When to fan out

Fan out only when the plan exceeds the inline threshold:

- **More scenes** than ~6 short scenes, or
- **Individually heavy scenes** (long duration, dense motion, complex media).

When fanning out:

- Give each worker **2-3 scenes**, not one.
- Spawn **all workers in a single wave** (a second wave nearly doubles the
  window).
- Each worker reads only its packets + the design truth file; never opens the
  full storyboard or skill documents.

## Inline (≤6 short scenes)

Build one scene after another in this context. Work from the scene's storyboard
block + the cited blueprint/rules recipe body. Read the full recipe
(`content-os-animation` blueprints/`<id>.md`, rules/`<id>.md`) before writing
motion.

## Packet authoring (when dispatching)

Each scene gets one bounded packet: the scene's exact storyboard block + the
blueprint body + every cited rule recipe, inlined. The worker role file
concatenates the worker core role + this skill's worker role, verbatim — the
complete worker role.

Dispatch context carries: `PROJECT_DIR`, the worker's `frame_id`s, and canvas
size. Wait on every scene's `compositions/<frame_id>.html` +
`compositions/<frame_id>.motion.json`.

## No delegation channel

Without a delegation channel, fall back serially: process one packet at a time
in this context, still working from the packet alone.

## Motion sidecars

After workers complete, collect `compositions/<frame_id>.motion.json` files and
carry their durations and exit/entry vectors into assembly. Where the doctrine
chain is installed, translate them into the project ledger before stamping seams.
