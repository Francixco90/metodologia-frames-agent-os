# SPEC ↔ harness-creator — Reconciliation

Estado: Aprobado · v1 · [DOC] · [CONFIG]

Propósito: reconciliar dos modelos de subsistemas de harness que coexisten en
este repo, declarar cuál es autoritativo para gobernanza y cuál es interno de
skill, y dejar constancia de que **no hay duplicación**. [DOC]

## 1. Los dos modelos

### 1.1 SPEC v2.0.0-candidate — superficie canónica del harness (5 subsistemas)

Autoritativo para gobernanza del repo. Es el modelo que rige cómo se describe,
versiona y evalúa el harness de `metodologia-frames-agent-os`. [CONFIG]

1. **Instructions** — archivos de instrucciones (AGENTS.md, CLAUDE.md), reglas
   de operación, definición de done.
2. **Tools** — superficies de herramientas, permisos, comandos de verificación
   que el agente puede invocar.
3. **Environment** — layout de carpetas, entorno de trabajo, aislamiento.
4. **State** — estado de tarea/proyecto, feature_list, progress, continuidad.
5. **Feedback** — verificación, gates, retroalimentación de ciclo, lifecycle
   end-of-session.

### 1.2 harness-creator (vendored) — modelo de scoring interno (7 subsistemas)

Ubicación: `.agents/skills/harness-creator/SKILL.md`. [CONFIG]

Usado **únicamente** por `validate-harness.mjs` para scoring
skill-interno del harness generado. **No es autoritativo para gobernanza del
repo.** [DOC] · [CONFIG]

1. Instructions
2. State
3. Verification
4. Scope
5. Lifecycle
6. Orchestration
7. Structure

## 2. Mapping SPEC 5 → harness-creator 7

El modelo SPEC es más grueso; cada subsistema SPEC se proyecta sobre uno o dos
subsistemas de harness-creator. La proyección es inclusiva (⊂), no biyectiva.
[DOC] · [SUPUESTO: la alineación nominal se infiere de los artefactos mínimos
declarados en SKILL.md, no de un mapeo explícito publicado.]

| SPEC (canónico) | ⊂ harness-creator (scoring) | Nota |
|---|---|---|
| Instructions | {Instructions, Structure} | Instrucciones raíz + layout navegable. |
| Tools | {Verification, Scope, Orchestration} | Comandos verificables, boundaries, gates/DAG. |
| Environment | {Structure, Orchestration} | Taxonomía de carpetas, DAG, aislamiento. |
| State | {State, Lifecycle} | feature_list/progress + session-handoff. |
| Feedback | {Verification, Lifecycle} | Gates dan feedback; lifecycle cierra el ciclo. |

Inversa (no canónica, sólo para auditoría de cobertura de scoring): cada
subsistema de harness-creator cae bajo al menos un subsistema SPEC, por lo que
el scoring de 7 es un refinamiento del de 5 y no introduce superficie fuera
del modelo canónico. [DOC]

## 3. No duplicación

- **SPEC v2.0.0-candidate** es la fuente de verdad de gobernanza. [CONFIG]
- **harness-creator** provee un scoreboard de 7 dimensiones para
  `validate-harness.mjs`; es interno del skill y no describe la superficie de
  gobernanza del repo. [CONFIG]
- No hay dos fuentes de verdad compitiendo: el modelo de 7 es un desdoblamiento
  de scoring del modelo de 5, contenido dentro del perímetro del skill. [DOC]
- Si `validate-harness.mjs` y SPEC entran en tensión, SPEC manda; el score del
  skill se trata como señal de diagnóstico, no como norma. [CONFIG]

## 4. Limitaciones

- El mapeo SPEC→harness-creator es inferido de los artefactos mínimos
  declarados en `SKILL.md` (tabla "Core Model" + "Seven Subsystems"); no existe
  un mapeo publicado por los autores del skill. [SUPUESTO]
- Esta reconciliación no audita `validate-harness.mjs`; sólo declara su
  perímetro semántico. [DOC]