# Workflow contract — Transcript Intelligence

`ASR candidate → literal → language review → captions → semantic index → narrative map → verify → package`.

## Invariants

1. `transcript-intelligence-v1` y fuentes hash-bound.
2. Notas editoriales son `locator-only`; no reemplazan audio.
3. Sin audio no existe evaluación de dicción o pronunciación.
4. Toda divergencia pública aparece en `correction-ledger.json`.
5. Todo beat narrativo contiene `sourceSpan`.
6. Ambigüedad material bloquea `deterministic-passed`.
7. `coaching-private.json` nunca entra al paquete público.
8. Runtime offline-first, rutas relativas, sin dependencias externas al arnés.
9. Estado máximo `human-reviewed`; publicación fuera de alcance.

## Violation codes

`INVALID_JOB`, `UNSAFE_REF`, `MISSING_REF`, `INVALID_ASR`,
`audio-required-for-pronunciation`, `material-ambiguity`,
`ungrounded-narrative-beat`, `PACKAGE_BLOCKED`.
