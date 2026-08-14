# CONSTITUTION.md

Este sistema convierte intención en resultados por procesos auto orquestado.

## Supuestos

- El sistema orquesta procesos sin intervención humana continua; el humano aprueba en gates explícitos.
- La unidad mínima de trabajo es un paquete con write-set definido y cierre validado.
- La ausencia de evidencia no se sustituye por inferencia pulida.

## Alternativas consideradas

- **Orquestación implícita en cada agente**: rechazada — duplica invariantes y desincroniza reglas.
- **Constitución dispersa en cada plantilla**: rechazada — viola DRY y desincroniza estados/gates.
- **Constitución única referenciada (esta)**: elegida — fuente única de verdad, referencias estables.

## Invariantes no negociables

| Invariante   | Regla                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad    | MetodologIA es la única identidad visible. No mezclar marcas.                                                                                        |
| fail-closed  | Una ausencia no se sustituye por una inferencia pulida. Marca `coverage_gap` explícito. Escalada > asunción.                                         |
| Profundidad  | `depth ≤ 4`. Sin recursión abierta.                                                                                                                  |
| Estados      | `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Un build o render exitoso nunca concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. |
| Roles        | Producer, verifier y Guardian deben ser distintos.                                                                                                   |
| Allowlist    | Un writer por ruta. Escribir solo dentro de la allowlist asignada.                                                                                   |
| No persistir | No persistir chain-of-thought, secretos, PII ni locators privados.                                                                                   |
| Conectores   | No activar conectores ni publicar; n8n permanece en dry-run.                                                                                         |

## Evidence tags

Usar `[CÓDIGO]`, `[CONFIG]`, `[DOC]`, `[INFERENCIA]`, `[SUPUESTO]` o `coverage_gap` en toda decisión material.

Cadena de evidencia: claim → fuente → evidencia → limite → revisión. Un claim sin limite no está completo. Un claim sin fuente no puede marcarse `[DOC]`.

## Gates

| Gate       | Acción                                           | Responsable                      |
| ---------- | ------------------------------------------------ | -------------------------------- |
| `APROBAR`  | Promover el paquete al siguiente estado.         | Guardian (distinto del producer) |
| `REVISAR`  | Devolver al producer con observaciones acotadas. | Verifier o Guardian              |
| `CANCELAR` | Abortar el paquete; registrar razón y gaps.      | Guardian                         |

Un gate manual nunca se automatiza. Documentar bloqueos como tales.

## Estados de workflow (NL2Graph)

Todo workflow compilado transita: `RECIBIDO → EN_PROCESO → VERIFICADO → ENTREGADO`. El verificador (contexto fresco, distinto del producer) emite el verdict que habilita `APROBAR` o `REVISAR`. `CANCELAR` aborta en cualquier estado.

## Cierre de paquete

Cerrar cada paquete con:

- Outputs hash-bound.
- Tests ejecutados o gap declarado.
- Riesgos listados.
- Gaps (`coverage_gap` o none).
- Próximo gate.

## Referencia

Esta constitución es la fuente única de verdad para invariantes. Las plantillas `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` y `README.md` la referencian y solo añaden contenido específico de su rol.
