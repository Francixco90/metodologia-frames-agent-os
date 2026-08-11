# Workflow contract — Transcript Intelligence

`ASR candidate → literal → language review → captions → semantic index → narrative map → verify → package`.

## Invariants

1. `transcript-intelligence-v1` revisión 3 y fuente/audio/ASR/autoridad/modelo/configuración
   hash-bound contra archivos reales. Revisiones anteriores son solo lectura hasta `migrate`.
2. Notas editoriales son `locator-only`; no reemplazan audio.
3. Sin audio no existe evaluación de dicción o pronunciación.
4. Toda divergencia pública aparece en `correction-ledger.json`.
5. Todo beat narrativo contiene `sourceSpan`.
6. Ambigüedad material bloquea `deterministic-passed`.
7. `coaching-private.json` nunca entra al paquete público.
8. Runtime offline-first, rutas relativas, sin dependencias externas al arnés.
9. Estado máximo `human-reviewed`; publicación fuera de alcance.
10. Cada `sourceSpan` declara reloj absoluto de fuente y reloj local de pieza. Los campos
    históricos `startSeconds`/`endSeconds` son aliases del reloj absoluto.
11. `literal_audio`, `asr_candidate`, `editorial_notes`, `visual_reference` e `inference`
    permanecen como clases distintas; solo la primera puede fundamentar qué fue audible.
12. Nombres, cifras, productos y claims materiales requieren autoridad explícita y verificada.
13. Las referencias no contienen `..` ni pueden escapar por symlink del directorio del job.
14. Audio derivado valida tipo, magic bytes, decodificación y duración positiva, y declara
    el hash de la fuente de origen.
15. Todos los spans son no negativos, ordenados y acotados por `source.durationSeconds`;
    el origen absoluto y el origen local pertenecen al mismo dominio.
16. `package` requiere `policy.publicPackage: true`.

## Violation codes

`INVALID_JOB`, `UNSAFE_REF`, `MISSING_REF`, `INVALID_ASR`,
`audio-required-for-pronunciation`, `material-ambiguity`,
`material-authority-required`, `MIGRATION_REQUIRED`, `HASH_MISMATCH`,
`INVALID_AUDIO_MEDIA`, `AUDIO_DECODE_FAILED`, `AUDIO_DURATION_INVALID`,
`AUDIO_BINDING_MISMATCH`, `INVALID_SPAN`, `SPAN_OUT_OF_BOUNDS`,
`CLOCK_ORIGIN_INCOHERENT`, `INVALID_PROVENANCE`,
`ungrounded-narrative-beat`, `PACKAGE_BLOCKED`.
