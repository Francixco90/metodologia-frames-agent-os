---
name: dev-review
description: This skill should be used when the operator requests a structured peer code review of a change — it reviews architecture, readability, maintainability, performance, security, testability, and convention adherence, and delivers prose findings ranked by severity for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev Review — revisión de código estructurada

Derivada de review/SKILL.md (garrytan/gstack, MIT). Adaptación clean-room: se conserva el principio metodológico — revisión estructurada por dimensiones, jerarquización por severidad, revisar el diff y no a la persona — sin heredar herramienta, CLI, sesiones ni runtime del proveedor. La skill es `local-evaluation`: produce prosa de hallazgos para que la operadora evalúe; no ejecuta git, tests ni commits por sí misma.

## Cuándo usar

Invoca esta skill cuando la operadora solicite una revisión de pares estructurada de un cambio de código: un diff, un conjunto de archivos modificados, un pull request en borrador o un patch pegado en el prompt. La skill espera un diff o una lista de archivos; sin diff, marca `coverage_gap` y pide el insumo bloqueante antes de proseguir. No sustituye la aprobación humana ni los gates G13–G17 fail-closed del DAG del repositorio.

## Cómo

Recorre el diff aplicando cada dimensión en orden. Para cada hallazgo, cita la línea específica que lo motiva — `archivo:línea` más el texto verbatim del código que lo disparó. Sin cita, el hallazgo queda no verificado y se rebaja su confianza al apéndice.

1. **Arquitectura** — ¿El cambio respeta los límites de módulo, la separación de responsabilidades y los flujos de dependencia del sistema? ¿Introduce acoplamiento oculto o lo reduce?
2. **Legibilidad** — ¿El código es comprensible para una par que no escribió el cambio? Nombres claros, estructura directa, comentarios solo cuando aportan contexto que el código no expresa.
3. **Mantenibilidad** — ¿El cambio eleva o reduce la deuda técnica? ¿Patrones repetidos, abstracciones prematuras o ausentes, complejidad ciclomática evitable?
4. **Rendimiento** — ¿Consultas N+1, recorridos redundantes, asignaciones en caliente, complejidad algorítmica evitable, falta de índice que el cambio vuelve crítica?
5. **Seguridad** — Inyección, confianza en salida de modelo, concurrencia y condiciones de carrera, seguridad de datos y SQL, compleción de enum y valores. Ante un enum, estado, tier o tipo nuevo, leer código fuera del diff para verificar que cada referente lo maneja — es la única dimensión donde el diff aislado es insuficiente.
6. **Testabilidad** — ¿El cambio viene cubierto o acompañado por pruebas? ¿Permite probarse sin red ni estado externo? ¿Las ramas nuevas tienen prueba que las ejercita?
7. **Adhesión a convenciones del proyecto** — ¿Respeta `docs/program/dag.yml`, `AGENTS.md` y las convenciones de naming, slugging y estructura del repo?

Clasifica la severidad de cada hallazgo:

- **Bloqueante** — bug explotable, pérdida de datos o ruptura de contrato. Debe corregirse antes de avanzar.
- **Alta** — defecto funcional o de seguridad probable. Corregir antes de landear.
- **Media** — olor mantenible o de rendimiento; verificar con logs o métricas antes de priorizar.
- **Baja** — cosmético o estilístico; apéndice, no bloquea.

Antes de recomendar un patrón de remediación (concurrencia, caché, auth, framework), verifica que sea práctica vigente para la versión en uso y que no exista ya una solución nativa más nueva. Cuesta segundos y evita recomendar patrones desactualizados.

Regla de oro: **se revisa el diff, no a la persona.** La crítica va al cambio, con lenguaje constructivo y propuestas de remediación concretas. Nada de juicios sobre quien escribe el código.

## Fail-closed

Esta skill es `local-evaluation`. NO ejecuta `git`, ni tests, ni commits, ni llamadas de red, ni CLI externa, ni publicación. Todo gate de ejecución queda detrás de confirmación explícita de la operadora. Si el ambiente exige correr algo, la skill se detiene y pide confirmación; ante la duda, `coverage_gap`. La skill no promociona estados: `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. La decisión de landear un cambio tras la revisión es humana (gates G13–G17 del DAG), nunca automática.

## Validación

Ejecuta `pnpm verify:skills` para validar la skill contra el contrato del repositorio. El checker local `skills/dev-review/scripts/check-skill.mjs` verifica los 6 recursos gobernados, clean-room y fail-closed. Si no se proporciona diff, la skill emite `coverage_gap` y solicita el insumo bloqueante antes de continuar — no adivina ni revisa sobre inferencias.