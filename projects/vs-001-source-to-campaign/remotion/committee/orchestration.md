# Orquestación del comité VS-001

## Estado

Expediente de decisión creativa para el work product `REMOTION-VS001`. La
decisión se deriva de `committee-session.json` con `adjudicateCommittee`; este
expediente no concede aprobación humana, `READY` ni publicación. [CONFIG]

## Procedencia de los aportes

| Actor                   | Rol   | Procedencia honesta                         | Aportes                           |
| ----------------------- | ----- | ------------------------------------------- | --------------------------------- |
| `actor-rt07-subagent`   | RT-07 | `subagent` especializado real               | P01 y reviews de P02–P05          |
| `actor-rt04-subagent`   | RT-04 | `subagent` especializado real               | P02 y reviews de P01, P03–P05     |
| `actor-rt08-subagent`   | RT-08 | `subagent` especializado real               | P03 y reviews de P01–P02, P04–P05 |
| `perspective-lead-rt05` | RT-05 | `sequential-perspective` explícita del Lead | P04 y reviews de P01–P03, P05     |
| `perspective-lead-rt09` | RT-09 | `sequential-perspective` explícita del Lead | P05 y reviews de P01–P04          |

P04, P05 y sus ocho reviews no se presentan como delegación real. [DOC]

## Contrato de decisión

- Cinco propuestas conceptuales; no cinco implementaciones.
- Veinte reviews cruzados, sin autoevaluación.
- Seis dimensiones comunes, con pesos que suman 1.
- Scores, notas observables, objeciones, preguntas y elementos compatibles.
- Dissent RT-05 sobre la narrativa inversa de P05 y RT-08 sobre fijar 36
  segundos en P02.
- Incertidumbres materiales de duración/audio, densidad de IDs y layout:
  `RESOLVABLE` mediante beat map, stills, captions y playback.
- Segundo prototipo no justificado mientras no exista un driver
  `NOT_RESOLVABLE`.

## Síntesis operativa

El cálculo selecciona P02 `Cadena visible` por margen estrecho frente a P04. La
implementación debe conservar:

- tres preguntas de P04 como headers y breadcrumb;
- estado por texto, forma y patrón, reduced-motion y rights-first de P05;
- semántica 0/4, claim IDs y hash de P03;
- señal persistente y bifurcación Web/Motion de P01.

Cambios obligatorios antes de build:

1. Derivar duración de beat map, captions, audio y playback; no fijar 36s.
2. Mantener `RENDERED_DRAFT` y `LOCAL TEST ONLY` visibles.
3. No presentar cinco propuestas o veinte reviews como KPI.
4. Validar captions, safe-zone, contraste y reduced-motion.
5. Usar assets locales hash-bound con rights receipts.

## Reproducción

```bash
node --import tsx projects/vs-001-source-to-campaign/remotion/committee/validate-committee.ts
pnpm exec vitest run tests/unit/committee
```

El validador rechaza una decisión persistida que no sea canónicamente idéntica
a la derivada desde la sesión. [CÓDIGO]
