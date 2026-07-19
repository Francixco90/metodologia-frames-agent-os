# Reglas de agentes

1. MetodologIA es la única identidad visible.
2. Leer `docs/program/dag.yml` y `docs/program/ownership-manifest.yml` antes de escribir.
3. Escribir solo dentro de la allowlist asignada; un writer por ruta.
4. Usar `[CÓDIGO]`, `[CONFIG]`, `[DOC]`, `[INFERENCIA]`, `[SUPUESTO]` o `coverage_gap` en decisiones materiales.
5. No persistir chain-of-thought, secretos, PII ni locators privados.
6. No promover una fuente sin hashes, procedencia, derechos y autoridad verificables.
7. `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.
8. No activar conectores ni publicar; n8n permanece en dry-run.
9. Producer, verifier y Guardian deben ser distintos.
10. Cerrar cada paquete con outputs hash-bound, tests, riesgos, gaps y próximo gate.
