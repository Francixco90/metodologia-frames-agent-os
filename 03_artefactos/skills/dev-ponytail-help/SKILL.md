---
name: dev-ponytail-help
description: This skill should be used when se muestra una tarjeta de referencia rápida para todos los modos, skills y comandos ponytail — display one-shot no persistente, referencia de consulta
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de ponytail-help (DietrichGebert/ponytail, MIT).

# dev-ponytail-help — tarjeta de referencia rápida

Muestra esta tarjeta de referencia cuando se invoca. Es una consulta one-shot:
no cambia de modo, no escribe flag files, no persiste nada, no auto-invoca
ningún comando. El operador lee la tarjeta y elige qué hacer después. La
ejecución de cualquier comando listado queda tras confirmación explícita del
operador (fail-closed). [CONFIG]

## Modos disponibles

| Modo      | Disparador        | Qué cambia                                                                                |
| --------- | ----------------- | ----------------------------------------------------------------------------------------- |
| **lite**  | `/ponytail lite`  | Construye lo pedido y nombra la alternativa más perezosa en una línea.                    |
| **full**  | `/ponytail`       | La escalera enforced: YAGNI → stdlib → native → one line → mínimo. Por defecto.           |
| **ultra** | `/ponytail ultra` | YAGNI extremista. Borrado antes que adición. Cuestiona los requisitos antes de construir. |

El modo activo se mantiene hasta que se cambia o termina la sesión. Para
desactivar: decir "stop ponytail" o "normal mode"; `/ponytail off` también
funciona. El homólogo NO cambia de modo automáticamente — el operador decide.

## Skills de referencia

| Skill               | Disparador         | Qué hace                                                                      |
| ------------------- | ------------------ | ----------------------------------------------------------------------------- |
| **ponytail**        | `/ponytail`        | Modo perezoso: la solución más simple que funciona.                           |
| **ponytail-review** | `/ponytail-review` | Revisión de over-engineering: `L42: yagni: factory, one product. Inline.`     |
| **ponytail-audit**  | `/ponytail-audit`  | Auditoría de over-engineering en todo el repo: lista ranqueada de qué borrar. |
| **ponytail-debt**   | `/ponytail-debt`   | Cosecha comentarios `ponytail:` en un ledger rastreado.                       |
| **ponytail-gain**   | `/ponytail-gain`   | Scoreboard de impacto medido: menos código, menos costo, más velocidad.       |
| **ponytail-help**   | `/ponytail-help`   | Esta tarjeta de referencia.                                                   |

El homólogo NO auto-invoca ninguno de estos comandos. La tarjeta los lista
para que el operador decida cuál ejecutar. Cada comando con side effects (git,
installs, tests, deploys) queda tras confirmación explícita del operador.

## Errores comunes

| Error                                                   | Síntoma                                                           | Corrección                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auto-invocar un comando solo porque la tarjeta lo lista | El agente ejecuta `/ponytail-audit` sin que el operador lo pida   | La tarjeta es solo referencia. El operador elige; el agente no auto-invoca.            |
| Cambiar de modo al mostrar la ayuda                     | El agente entra a modo `full` o `ultra` sin confirmación          | Mostrar la tarjeta no cambia el modo. Sin confirmación explícita no hay cambio.        |
| Persistir flags al mostrar la referencia                | Aparecen archivos de flag o estado persistente                    | La ayuda es one-shot: no escribe nada, no persiste nada.                               |
| Tratar la tarjeta como un plan aprobado                 | El agente interpreta la lista de comandos como un plan a ejecutar | La tarjeta es consulta, no un plan. La confirmación del operador es el gate que falta. |

## Límites

- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Mostrar la
  tarjeta no concede ningún estado de aprobación. [CONFIG]
- Sin confirmación explícita del operador, ningún comando listado se ejecuta.
  El modo fail-closed manda sobre cualquier atajo. [CONFIG]
- Si falta contexto para describir un modo o skill, marca `coverage_gap` en
  lugar de fabricar una descripción genérica. [CONFIG]
