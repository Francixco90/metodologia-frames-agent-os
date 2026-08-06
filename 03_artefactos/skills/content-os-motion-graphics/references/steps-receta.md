# Motion Graphics — Steps receta (Step 0–6 detail)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## Step 0: Setup

Brief confirmado por router. Clasificar intent (form vs search). Resolver
project dir (`videos/<subject>-motion/`, ej `q3-stat-motion`, nunca workspace
name o timestamp). Escribir `workflow-state.yml` (project, route, capability_map,
category draft, asset_needs[], vo_mode silent, offline true).
Gate: project init + state file + intent classified.

## Step 1: Plan (Director Part 1)

Decidir: ¿necesita search? (fork inicial). No → pick form category, content
user-supplied, `asset_needs: []`. Sí → emit search plan (news/web/tweet/image;
two-pole queries) en `asset_needs[]`; categoría confirmada por content type en
Step 2. Escribir draft `shot-plan.json` (envelope + categoría + asset_needs +
shot brief de un párrafo). Gate: `shot-plan.json` exists + category chosen +
asset_needs declared.

## Step 2: Source (conditional — skip si `asset_needs` vacío)

Si `asset_needs` non-empty, resolve via `content-os-media` (search/generate/fetch
→ frozen project-local paths + ledger en `assets/index.md`). Search remote
opt-in auth-gated; degrade a asset-free si unavailable (nota en context.log).
Si `asset_needs` empty (form categories), skip: state `gate-passed` con nota
skipped, no `assets/`. Gate: assets resolved (o skipped con nota).

## Step 3: Design (Director Part 2)

Designar el shot **alrededor de los assets disponibles**: pick catalog block(s)
+ `content-os-animation` rules/blueprints, layout, motion, beats, (para
asset-fusion) element_positions + eyedropper palette. Finalizar `shot-plan.json`
(content.block + content.customize + per-category content). Gate: shot-plan
final + block(s) chosen + motion declared.

## Step 4: Build (reuse-first)

Build `compositions/index.html` via `content-os-core` contract (seek-safe GSAP,
`window.__timelines`, `class="clip"` + stable ids, `tl.seek(0)`, deterministic).
Reuse-first: catalog blocks via `content-os-registry` + customize in place;
hand-author solo gaps + asset-fusion affordance. Gate: `index.html` built +
honors HF-equivalent contract.

## Step 5: Verify

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check +
proof snapshots (opening state, signature move, final hold). Inspect contact
sheet. On failure, una repair pass in-place, rerun failed gate. Never change
fixed duration to hide a defect. Gate: lint + check + snapshots pass.

## Step 6: Finalize / Approve + Render

User review (user-gated). Preguntar: "preview first, or render?" Si preview,
abrir Studio, volver al mismo gate tras revisions. Render solo tras explicit
render answer: `renders/video.mp4` via `content-os-core` (o overlay
`.webm`/`.mov` con `--format`). Verificar output exists, non-empty, intended
duration. Gate: checks pass + user approval + MP4/overlay exists.