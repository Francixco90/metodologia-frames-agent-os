# Narration & Pacing (offline-first)

Story spine, beat direction, rhythm, and narration rules for Content OS compositions.
Adapted from `hyperframes-creative/references/{story-spine,beat-direction,narration}.md`
to offline-first + MetodologIA voice (es-LATAM neutro por defecto).

## Story spine

Estructura minima antes de escribir HTML:

```yaml
storySpine:
  hook: {text: '<concrete hook, < 3s>', at: 0}
  beats:
    - {label: '<beat name>', at: <seconds>, purpose: '<what it proves>', valueBeforeEvidence: true}
  final: {text: '<lockup/CTA>', at: <seconds>}
```

- **Hook < 3s**: gancho concreto, no introduccion lenta. Un numero, una promesa, una
  tension — no "hoy te voy a contar".
- **Value-before-evidence**: la promesa antes del demo. El viewer sabe por que sigue
  mirando antes de ver la prueba.
- **Beats con timestamps**: cada beat tiene `at` (alinea con `data-at` del pose contract
  en `content-os-keyframes`). Cada beat argumenta una idea; no es filler.
- **Final**: lockup o CTA de un movimiento (preservar del BrandProfile). No "gracias",
  no reset a rest, no end on black (salvo peticion explicita).

## Beat direction

- **Anticipation** solo cuando clarifica causa o direccion.
- **Aceleracion** deja el reposo.
- **Peak proof** muestra el mecanismo inequivoco.
- **Follow-through** vende energia y direccion.
- **Overshoot** solo cuando el sujeto debe sentirse elastico o tactil.
- **Hold final** > hold de transicion. Lockups necesitan holds mas largos.
- **Rhythm**: alterna tense/release. No beats identicos consecutivos — si dos beats
  tienen la misma duracion y ease, uno sobra.

## Narration (si hay voiceover)

- **Tono** desde VoiceProfileV2 (no improvisar).
- **Openings**: declarativa o interrogativa, nunca apologetica ("bueno, quizas...").
- **Number pronunciation**: numeros dichos, no leidos. "Cinco mil" no "5000".
- **Espanol latino neutro** por defecto. Variante explicita EN o PT via VoiceProfile.
- **No filler**: corta "bueno", "básicamente", "entonces". Trust el hook.
- **Storyboard = propuesta**: cada frame argumenta. Si un frame no argumenta nada,
  cortalo o fusionalo.

## Timing offline-first

- Deriva duraciones desde la geometria y duration del composition, no de ejemplos
  copiados (hereda `content-os-animation`).
- No `Date.now()` para pacing — timestamps absolutos en `data-at`.
- Stagger cap <= 0.5s (hereda animation).
- Repeats finitos (hereda keyframes).

## Anti-patterns de narration

- Introduccion > 3s antes del hook.
- Demo antes de la promesa (evidence-before-value).
- Beats sin `purpose` (filler).
- Copy generico sin voz resuelta ("descubre mas").
- Final "gracias" o fade-to-black sin CTA del brand.
