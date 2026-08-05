---
name: dev-verification-before-completion
description: This skill should be used when se va a afirmar que un trabajo está completo, corregido o pasando, antes de commits o crear PRs — requiere ejecutar comandos de verificación y confirmar la salida antes de hacer cualquier afirmación de éxito
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de verification-before-completion (obra/superpowers, MIT).

# Verificación antes de cerrar

## Principio rector

Evidencia antes que afirmaciones, siempre. Ninguna afirmación de completitud,
corrección o éxito es válida sin verificación fresca ejecutada en el turno actual.

Violar la letra de esta regla es violar su espíritu. Una paráfrasis o sinónimo
no exime la regla: "debería pasar", "ya quedó", "funciona" son afirmaciones de
éxito y exigen evidencia.

## Ley de hierro

Ninguna afirmación de completitud sin evidencia de verificación fresca.

Si no ejecutaste el comando de verificación en este turno, no puedes afirmar
que pasa. La verificación previa, el sentido común, la confianza en el agente o
el "debería funcionar" no cuentan como evidencia.

## Función de gate

Antes de afirmar cualquier estado o expresar satisfacción:

1. Identificar: ¿qué comando prueba esta afirmación?
2. Ejecutar: correr el comando completo, fresco, sin atajos.
3. Leer: salida completa, código de salida, conteo de fallos.
4. Verificar: ¿la salida confirma la afirmación?
   - Si no: declarar el estado real con evidencia.
   - Si sí: declarar la afirmación con evidencia.
5. Solo entonces: hacer la afirmación.

Omitir un paso equivale a mentir, no a verificar.

## Modo de operación

El homólogo NO auto-ejecuta tests, NO auto-commitea, NO crea PRs. Los comandos
de verificación se listan y el operador los ejecuta y confirma la salida. El
skill enumera los comandos pertinentes (tests, build, lint, typecheck) y espera
la confirmación del operador antes de aceptar cualquier afirmación de éxito.

## Errores comunes

| Afirmación                 | Requiere                              | No es suficiente                     |
| -------------------------- | ------------------------------------- | ------------------------------------ |
| Tests pasan                | Salida del comando de tests: 0 fallos | Ejecución previa, "debería pasar"    |
| Linter limpio              | Salida del linter: 0 errores          | Chequeo parcial, extrapolación       |
| Build correcto             | Comando de build: exit 0              | Linter pasando, logs que se ven bien |
| Bug corregido              | Test del síntoma original: pasa       | Código cambiado, se asume corregido  |
| Test de regresión funciona | Ciclo rojo-verde verificado           | Test pasa una vez                    |
| Agente completó            | Diff de VCS muestra los cambios       | El agente reporta "éxito"            |
| Requisitos cumplidos       | Checklist línea por línea             | Tests pasando                        |
| Tipo de cambio correcto    | Typecheck: 0 errores                  | Build exitoso                        |

## Banderas rojas — detente

- Usar "debería", "probablemente", "parece"
- Expresar satisfacción antes de verificar ("listo", "perfecto", "ya quedó")
- Estar a punto de commit/push/PR sin verificación
- Confiar en reportes de éxito de un agente
- Apoyarse en verificación parcial
- Pensar "solo esta vez"
- Cualquier redacción que implique éxito sin haber corrido verificación

## Prevención de racionalización

| Excusa                      | Realidad                         |
| --------------------------- | -------------------------------- |
| "Debería funcionar ya"      | Ejecuta la verificación          |
| "Estoy seguro"              | Confianza no es evidencia        |
| "Solo esta vez"             | Sin excepciones                  |
| "El linter pasó"            | Linter no es compilador          |
| "El agente dijo éxito"      | Verifica de forma independiente  |
| "Estoy cansado"             | Cansancio no es excusa           |
| "Chequeo parcial basta"     | Parcial no prueba nada           |
| "Otras palabras, no aplica" | El espíritu manda sobre la letra |

## Patrones clave

Tests: ejecuta el comando de tests, observa el conteo de pasados/fallidos, luego
afirma "tests pasan" con la evidencia. No afirmes "parece correcto" sin ejecutar.

Tests de regresión (TDD rojo-verde): escribe, ejecuta (pasa), revierte el fix,
ejecuta (debe fallar), restaura, ejecuta (pasa). No afirmes "escribí un test de
regresión" sin el ciclo rojo-verde.

Build: ejecuta el build, observa exit 0, luego afirma "build pasa". No afirmes
"linter pasó" como proxy de build — el linter no verifica compilación.

Requisitos: relee el plan, construye un checklist, verifica cada ítem, reporta
gaps o completitud. No afirmes "tests pasan, fase completa" como prueba de
requisitos.

Delegación a agentes: el agente reporta éxito, verifica el diff de VCS, confirma
los cambios, reporta el estado real. No confíes en el reporte del agente.

## Cuándo aplicar

Siempre antes de: cualquier variación de afirmación de éxito o completitud,
cualquier expresión de satisfacción, commit, creación de PR, cierre de tarea,
paso a la siguiente tarea, delegación a agentes.

La regla aplica a frases exactas, paráfrasis, sinónimos, implicaciones de éxito y
cualquier comunicación que sugiera completitud o corrección.

## fail-closed

Una afirmación de éxito sin evidencia es una suposición. Marca coverage_gap si
falta verificación. La ausencia de evidencia no se sustituye por una inferencia
pulida. Escalada antes que asunción.
