# Guardian V3 — H-01 · Remediation 01

Veredicto: `PASS`. Estado máximo acreditado: `SCOPED`. [CONFIG]

## Binding

- Guardian: `RT-11-H01-REVIEW-001`.
- H-01 base: `dfa7bf09ba7c3a52db0ad810df5082223f44a8ac`.
- Árbol staged de la remediación: `4c08deb6615f3bb9ffbe2be6feb886685e723f26`.
- RT-09 previo: `RT09-CREATION-V3-H01-REM-001`, `PASS`, read-only.
- Delta: solo `scripts/check-creation-doc.ts`, con nueve inserciones y diez eliminaciones.

El árbol staged identifica el parche evaluado antes de añadir esta evidencia append-only. [CONFIG]

## Dictamen

La remediación limita el digest de compatibilidad histórica a archivos versionados mediante
`git ls-files`. Así elimina el falso drift causado por logs ignorados sin debilitar la protección:
una adición, eliminación o modificación trackeada sigue cambiando el digest. [CÓDIGO]

El cambio no altera contratos, contenido, estados, render, n8n, distribución, publicación ni
compatibilidad histórica. RT-09 verificó además los digests esperados de VS-001 y
`pilot-carousel-001`, así como una mutación trackeada hostil. [CONFIG]

## Límite

Este PASS conserva H-01 en `SCOPED`; no autoriza H-02, render, distribución ni publicación.
Siguiente gate exacto: `APRUEBO HITO H-02`. [CONFIG]
