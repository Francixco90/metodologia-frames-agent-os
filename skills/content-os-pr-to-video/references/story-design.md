# Story design — PR to video

Estructura narrativa para un code-change explainer. El video viene de **narrative
design**, no del orden de archivos del diff ni del commit list. Reordena, mergea,
omite, comprime. Surface el cambio que importa, drop el churn incidental (lockfile
bumps, formatting, generated files) a menos que sea el story.

## Core rule

Un diff es una lista de edits. Un video es un guided act of understanding. No
narrates el diff file-by-file ni leas la PR description aloud. **Explain the
change** — y donde el change tiene runtime behavior, **show that behavior in
motion** (un `mechanism` beat), no solo displays las líneas que cambiaron.

## PR archetypes (elige uno por PR)

### Changelog

Multi-change release o batch. Hook con headline value → agrupa cambios por tema →
impact stat → ship version (si MERGED, `shipped_version` real). Fuerte para
"release N", "qué cambió en v2.3".

### Feature-reveal

Nueva capability. Hook con el outcome que desbloquea → setup del problema → el
cambio que lo resuelve → mechanism (behavior en motion) → payoff. Fuerte para
"nueva feature X", "soporte para Y".

### Fix-explainer

Bug fix. Hook con el síntoma → root cause → el fix (diff hunk) → por qué funciona
→ prevención. Fuerte para "fix #N", "resolve bug X".

### Refactor-walkthrough

Refactor sin behavior change. Hook con el "por qué" (debt, perf, clarity) →
before → after (morph) → qué gana → qué no cambió. Fuerte para "refactor X",
"migrate de A a B".

## Hook

Hook language: 1-2 frames que ganan atención. No clickbait; promesa clara del
valor. Tipos: pregunta, contraintuitivo, stat, analogía, stakes. Para PR: el
outcome (qué desbloquea/fixe/speed-up) lands by second beat.

## Value-before-evidence

El viewer-facing payoff (qué desbloquea/fixe/speed-up) lands by second beat. El
diff y el mechanism son la **evidence** para ese claim, nunca el opening.
Implementation es el footnote del story, no el spine.

## Storyboard as proposal

El storyboard es una propuesta (review loop), no un dictado. Presenta el plan,
pide approve-or-change. Step 3 es user-gated.

## VO mode

- **Verbatim** — user dio script, mantén wording. Solo ajusta timing.
- **Restructured** — reshape para narrative design. Reordena, comprime.
- **Silent** — no narration. `music: none` + no SCRIPT. Visual-driven.

VO_MODE viene del brief. Default: **restructured** (dev content voice). Plain,
technical, unhurried developer voice — accurate, specific, no hype, no marketing
gloss. Explicar un real change a engineers; respect their time.

## Duración

Especializados fuertes 30-120s. >180s → router rerutea a `content-os-general-video`.
Length nunca overridea la estructura; estructura decide length.

## Credits close

1-6 contributor avatars (`assets/<login>.png`). Resolve `null` names via
`gh api users/<login> --jq .name`. Voiceover must say names, never raw handles.
Si GitHub no tiene public name, fallback al login on-screen y drop del spoken
line.

## Delegación

Story doctrine (hook, value-before-evidence, proposal shape) →
`content-os-creative` story-spine. Este doc es el delta pr-to-video (PR archetypes

- dev voice + credits + diff-driven narrative). No dupliques motion rules (→
  `content-os-animation`), no dupliques brand (→ `content-os-creative`), no
  dupliques code blocks (→ `content-os-registry` `code-vocabulary.md`).
