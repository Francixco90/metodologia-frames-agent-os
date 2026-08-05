---
name: dev-ponytail-debt
description: This skill should be used when se cosechan todos los comentarios ponytail en el codebase hacia un ledger de deuda — los atajos y deferencias deliberados se rastrean en vez de pudrirse en después significa nunca, reporte one-shot, no muta nada
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de ponytail-debt (DietrichGebert/ponytail, MIT).

Cada atajo deliberado en el codebase se marca con un comentario `ponytail:` que
nombra su techo (hasta dónde aguanta el shortcut) y su upgrade path (el
disparador para volver a visitarlo). Este skill cosecha todos esos marcadores
en un solo ledger de deuda para que una deferencia no se convierta
silenciosamente en permanente — "después significa nunca" solo gana si nadie
rastrea la deuda.

## Cuándo usarlo

El operador dice "ponytail debt", "/ponytail-debt", "qué deferencias hay",
"lista los atajos", "ledger de deuda", "qué marcamos para después", o pide
auditar los comentarios `ponytail:` del repo. Reporte one-shot: lee, reporta,
no muta nada.

## Escaneo

Buscar los marcadores de comentario en el repo, saltando `node_modules`, `.git`
y salida de build:

`grep -rnE '(#|//) ?ponytail:' .`

Cada coincidencia es una fila del ledger. El prefijo de comentario excluye la
prosa que solo menciona la convención — solo entra al ledger lo marcado como
deuda real.

## Formato de ledger

Una fila por marcador, agrupada por archivo:

`<archivo>:<linea>, <qué se simplificó>. techo: <el límite nombrado>. upgrade: <el disparador para revisitar>.`

La convención es `ponytail: <techo>, <upgrade path>`, así que el techo y el
disparador se extraen directo del comentario. ¿Quieres un responsable por fila?
Suma `git blame -L<linea>,<linea>` (lo sugiere el skill, lo ejecuta el operador).

Marcar el riesgo de pudrición: todo comentario `ponytail:` que no nombre un
upgrade path ni disparador recibe la etiqueta `no-trigger` — esos son los que
rotan en silencio.

Cerrar con `<N> marcadores, <M> sin trigger.` Si no hay nada: `No hay deuda ponytail:. Ledger limpio.`

El skill propone el contenido del ledger en prosa; el operador confirma antes
de persistirlo. Si el operador quiere guardarlo, el skill sugiere una ruta (por
ejemplo `PONYTAIL-DEBT.md`) y espera confirmación explícita — no escribe el
archivo por su cuenta. Un ledger propuesto no es un ledger aprobado.

## Errores comunes

| Error                                       | Qué pasa                                             | Corrección                                                                                     |
| ------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Auto-escribir el ledger sin confirmación    | El skill crea/edita `PONYTAIL-DEBT.md` por su cuenta | El skill propone el contenido y espera el OK del operador; fail-closed                         |
| Inventar techo o upgrade path faltantes     | El skill completa campos ausentes con suposiciones   | Marcar `no-trigger` y reportar el gap, no fabricar                                             |
| Incluir prosa que solo menciona `ponytail:` | Ruido en el ledger, filas que no son deuda           | Solo entrar comentarios con el prefijo de marcador real                                        |
| Tratar el reporte como plan aprobado        | "Ya está en el ledger, entonces está resuelto"       | El ledger rastrea la deuda; la resolución sigue requiriendo acción y confirmación del operador |
| Saltar el conteo final                      | El operador no sabe cuánta deuda hay ni cuánta rota  | Siempre cerrar con `<N> marcadores, <M> sin trigger.` o `No hay deuda ponytail:.`              |

## Límites

Lectura y reporte únicamente; no muta nada. Para persistir, pedir confirmación
y solo entonces sugerir la ruta del ledger. One-shot. "stop ponytail-debt" o
"normal mode" para revertir. Toda hipótesis sin evidencia se marca
coverage_gap; un techo sin upgrade path es `no-trigger`, no una suposición.
