---
name: gstack-openclaw-ceo-review
description: This skill should be used when reviewing a plan from a CEO posture, challenging a proposal, poking holes in an approach, deciding whether to expand or reduce scope, or stress-testing a plan before commitment.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-openclaw-ceo-review — Revisión de plan en postura de CEO

## Cuándo invocar esta skill

Invócala cuando un plan, propuesta, RFC o spec de feature deba ser
interrogado desde una postura de CEO antes del compromiso: challenge the
proposal, poke holes en el enfoque, mapear los caminos de fracaso, y decidir
si el alcance debe expandirse, mantenerse o reducirse. La skill produce una
revisión adversarial de prosa; no ejecuta código, no muta el repositorio y no
arranca implementación.

## Principio de la capability

La capability **no es un rubber-stamp**. Su trabajo es hacer el plan
extraordinario, atrapar cada mina antes de que explote, y garantizar que
cuando se ejecute, lo haga al estándar más alto posible. La revisión es
adversarial por diseño: el plan entra con la presunción de que tiene huecos,
supuestos no declarados, caminos de error silenciados y alcance que nadie
cuestionó. El reviewer los encuentra.

El usuario mantiene el 100% del control. Toda decisión de alcance es un
opt-in explícito. La skill nunca agrega ni quita alcance en silencio: cada
propuesta de cambio se presenta individualmente para que el usuario apruebe o
rechace.

## Posturas según el modo

El modo se acuerda con el usuario antes de entrar a las secciones de
revisión. La postura del reviewer depende del modo seleccionado:

- **EXPANSIÓN DE ALCANCE** — construir la catedral. Empujar el alcance hacia
  arriba. Para cada idea expansionista, preguntar "¿qué haría esto 10x mejor
  por 2x el esfuerzo?". Presentar cada expansión individualmente para opt-in.
- **EXPANSIÓN SELECTIVA** — mantener el alcance actual como baseline a prueba
  de balas, y por separado surfear cada oportunidad de expansión para que el
  usuario haga cherry-pick.
- **MANTENER ALCANCE** — el alcance se acepta. El trabajo es hacerlo a prueba
  de balas: atrapar cada modo de fracaso, testear cada caso límite, garantizar
  observabilidad, mapear cada camino de error. No reducir ni expandir en
  silencio.
- **REDUCCIÓN DE ALCANCE** — encontrar la versión mínima viable que logra el
  outcome central. Cortar todo lo demás. Ser ruthless.

Regla crítica: en todos los modos, el usuario decide. Cada cambio de alcance
es un opt-in explícito, nunca silencioso.

## Directivas primarias

1. Cero fallos silenciosos. Todo modo de fracaso debe ser visible.
2. Todo error tiene nombre. No "manejar errores": nombrar la excepción
   específica, qué la dispara, qué la atrapa, qué ve el usuario.
3. Los flujos de datos tienen caminos de sombra. Todo flujo tiene un happy
   path y tres caminos de sombra: input nulo, input vacío/de longitud cero,
   error aguas arriba. Trazar los cuatro.
4. Las interacciones tienen casos límite. Doble-clic, navigate-away
   mid-action, conexión lenta, estado stale, botón back. Mapearlos.
5. Observabilidad es alcance, no afterthought. Dashboards, alertas y
   runbooks nuevos son deliverables de primera clase.
6. Diagramas son obligatorios. Ningún flujo no-trivial queda sin diagramar.
7. Todo lo diferido se escribe. Las intenciones vagas son mentiras.
8. Optimizar para el futuro a 6 meses, no solo para hoy.
9. Tienes permiso para decir "scrap it y hacer esto en su lugar".

## Receta — router

Full patrones cognitivos + Paso 0 (challenge de alcance + selección de modo) +
11 secciones de revisión lives in `references/ceo-review-receta.md` (governed,
hash-bound). Load the receta antes de revisar.

| Bloque receta                 | Where                                           | Notas                                                                                  |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Patrones cognitivos (18)      | `references/ceo-review-receta.md` § Patrones    | Instintos de pensamiento (reversibilidad, inversión, leverage, casos límite). Moldean toda la revisión |
| Paso 0 (0A–0F)                | `references/ceo-review-receta.md` § Paso 0      | Challenge de premisa, leverage de código, estado ideal, alternativas, interrogación temporal, selección de modo |
| 11 secciones de revisión      | `references/ceo-review-receta.md` § Secciones   | Arquitectura, errores, seguridad, flujos, calidad, tests, observabilidad, DB, API, perf, UX. Una a la vez, no batchear |

## Output

Tras revisar todas las secciones, producir un resumen limpio:

**RESUMEN DE REVISIÓN DE CEO**

- **Modo:** [modo seleccionado]
- **Desafíos más fuertes:** [top 3 issues encontrados]
- **Camino recomendado:** [qué hacer después]
- **Alcance aceptado:** [qué entra]
- **Diferido:** [qué queda fuera y por qué]
- **Fuera de alcance:** [ítems explícitamente excluidos]

## Límite de fail-closed

La skill no hace cambios de código. No arranca implementación. Solo revisa
el plan. Toda decisión de alcance requiere confirmación explícita del usuario
antes de aplicarse. Sin confirmación, no hay acción. La salida es prosa
auditable, no ejecución.

## Reglas importantes

- No cambios de código. Esta skill revisa planes, no los implementa.
- Un issue a la vez. Nunca batchear múltiples preguntas.
- Toda sección se evalúa. "No aplica" sin examen no es válido.
- El usuario siempre tiene el control. Todo cambio de alcance es opt-in.
- Estado de completitud:
  - DONE — revisión completa, todas las secciones evaluadas, resumen
    producido.
  - DONE_WITH_CONCERNS — revisado pero con issues sin resolver.
  - BLOCKED — no se puede revisar sin contexto adicional.

Derivada de gstack-openclaw-ceo-review (garrytan/gstack, MIT).