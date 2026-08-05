---
name: dev-ponytail-gain
description: This skill should be used when se muestra el impacto medido de ponytail como scoreboard compacto — menos código, menos costo, más velocidad, desde medianas de benchmark, display one-shot no persistente ni per-repo
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Ponytail Gain — scoreboard compacto del impacto medido de ponytail

Este skill muestra el impacto medido de ponytail como un scoreboard compacto:
menos código, menos costo, más velocidad. Las cifras son las **medianas publicadas
de benchmark** (5 tareas cotidianas: validador de email, debounce, suma CSV,
temporizador de cuenta atrás, limitador de tasa; tres modelos: Haiku, Sonnet,
Opus). Son medidas, no calculadas desde el repo actual. El display es **one-shot**:
no cambia modo, no escribe flags, no persiste nada, no es un número per-repo.

El rol aquí es el de un ingeniero que prepara un scoreboard de impacto para que el
operador lo revise. El skill **propone** el scoreboard; el operador **confirma**
antes de cualquier acción. No auto-ejecuta benchmarks. No inventa cifras
per-repo. No persiste modo.

Derivada de ponytail-gain (DietrichGebert/ponytail, MIT).

## Cuándo usar

Usar este skill cuando el operador pide:

- "muestra el impacto de ponytail" / "ponytail gain"
- "qué ahorra ponytail" / "scoreboard de ponytail"
- "medida de ponytail" / "ganancia de ponytail"
- cualquier petición de mostrar el impacto medido de ponytail como scoreboard
  compacto y one-shot.

No usar cuando se necesita auditar recortes pendientes (ahí toca `dev-ponytail-debt`),
ni cuando se necesita un número per-repo contado (ahí no hay cifra real — el
tramo no construido nunca se escribió). En esos casos otra habilidad toma el
relevo.

## Formato de scoreboard

Renderizar barras ASCII planas. La longitud de la barra muestra el rango medido;
la etiqueta lleva la cifra exacta:

```
  ponytail gain                     mediana de benchmark · 5 tareas · 3 modelos

  Líneas de código   sin-skill  ████████████████████  100%
                     ponytail  ██▌·················    6–20%   ▼ 80–94%
  Costo              sin-skill  ████████████████████  100%
                     ponytail  █████▌··············   23–53%  ▼ 47–77%
  Velocidad          ponytail  ▸ 3–6× más rápido

  Este repo:  /dev-ponytail-debt  (atajos diferidos)
              /dev-ponytail-audit (lo que aún es recortable)
```

El scoreboard es **one-shot**: se muestra, el operador lo revisa, y se detiene.
No se cambia de modo, no se escribe ningún flag, no se persiste ningún estado.

## Frontera de honestidad

Estas son **medianas de benchmark**, no este repo. NUNCA imprimir un número de
ahorro per-repo ("ahorraste X líneas/tokens aquí"): el tramo no construido nunca
se escribió, así que no hay línea base real de la que restar en un repo en vivo.
Las únicas cifras per-repo reales vienen de `/dev-ponytail-debt` (un libro
contable contado), y este scoreboard apunta allí en lugar de inventar una.

## Errores comunes

| Error                                 | Por qué falla                                                    | Cómo corregir                                           |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Inventar un ahorro per-repo           | El tramo no construido nunca se escribió; no hay línea base real | Apuntar a `/dev-ponytail-debt` para cifras contadas     |
| Auto-ejecutar benchmarks              | El skill es display one-shot, no ejecución                       | Mostrar el scoreboard y detenerse; el operador confirma |
| Persistir modo o flags                | El display es one-shot, no estado                                | No escribir flags ni cambiar modo                       |
| Mezclar medianas con conteos per-repo | Son fuentes distintas con semántica distinta                     | Declarar la fuente de cada cifra (benchmark vs. ledger) |
| Presentar conjetura como medida       | Una cifra sin fuente es un claim sin evidencia                   | Marcar `coverage_gap` si la fuente no está disponible   |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta benchmarks, tests, builds, installs ni comandos de CLI externos. El
  scoreboard se muestra en prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO persiste modo, flags ni estado. El display es one-shot.
- NO invoca tooling de vendor ni hooks automáticos. Esos artefactos del
  referenciador se descartaron en la adaptación.
- Si las medianas publicadas no están disponibles, se marca `coverage_gap` y se
  detiene — no se infiere ni se sustituye con una conjetura pulida.

El único entregable es el scoreboard compacto en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-ponytail-gain/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay medianas publicadas accesibles, se emite `coverage_gap` en lugar de
  fabricar un scoreboard genérico.
