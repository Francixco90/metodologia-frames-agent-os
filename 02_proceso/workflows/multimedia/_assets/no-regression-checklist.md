# Checklist de no regresión — Multimedia P00–P09

**Fuente**: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato, sección `#quality`. [DOC]

## Principio

Una salida útil preserva intención, verdad, identidad, derechos, accesibilidad, estado y trazabilidad. Un resultado atractivo no compensa una falla crítica. [DOC]

## No sacrificar (jamás por rapidez, volumen o atractivo visual)

- **Tesis** — el propósito fundacional declarado en P00 no se diluye.
- **Voz** — identidad de marca y tono definidos en el Brand OS.
- **Evidencia** — la 4-tupla O/I/A/R debe sostenerse; un claim sin fuente no se promueve.
- **Privacidad** — sin PII ni locators privados en artefactos o receipts.
- **Derechos** — sin inventar derechos ni capacidades; HOLD parcial ante duda.
- **Accesibilidad** — WCAG conforme al manifiesto de entorno.
- **Continuidad** — Biblia de continuidad + Asset Map vigentes entre etapas.
- **Aprobación** — `RENDERED_DRAFT != HUMAN_APPROVED`; los gates MW_* y G13–G17 son manuales fail-closed.
- **Versión** — todo artefacto versionable con `schema_ref` declarado.
- **Rollback** — capacidad de volver al último artefacto aprobado.

## Uso

El Guardian assertiona esta lista antes de avanzar cualquier workflow pasado su gate de aprobación (ver `02_proceso/governance/multimedia-quality-gate.yml`, Phase 3 D5). Cada workflow `no_regression` refuerza el ítem específico de su etapa.