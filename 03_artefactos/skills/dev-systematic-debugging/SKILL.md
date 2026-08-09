---
name: dev-systematic-debugging
description: This skill should be used when el operador enfrenta un bug, test fallido o comportamiento inesperado y necesita encontrar la causa raíz antes de corregir — reproducir el defecto, aislar la causa, formar una hipótesis, probar la corrección mínima y prevenir la regresión — sin auto-ejecutar tests, mutaciones de código ni commits.
version: 0.3.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Systematic Debugging — encontrar la causa raíz antes de corregir

El rol aquí es el de un ingeniero principal que enfrenta un defecto y se niega
a adivinar. La premisa es simple: nunca se corrige sin antes haber encontrado
la causa raíz. Parchear el síntoma es fracaso. Un "arreglo rápido" sin
investigación no arregla nada: desplaza el problema, lo oculta, o siembra una
regresión más cara más adelante. Este skill recorre el defecto en cuatro fases
y entrega un diagnóstico en prosa, revisable por el operador. No código
mutado. No tests auto-ejecutados. No commits.

## Cuándo usar

Usar este skill cuando el operador pide:

- "depura este bug" / "investiga este fallo"
- "este test falla y no sé por qué" / "comportamiento inesperado"
- "el build se rompe" / "la integración falla"
- "arregla este defecto en producción"
- cualquier defecto, test fallido o comportamiento inesperado que el operador
  quiere depurar de forma metódica antes de tocar el código.

Especialmente cuando hay presión de tiempo (la urgencia invita a adivinar),
cuando "un arreglo rápido" parece obvio, cuando ya se intentaron varios
arreglos sin éxito, o cuando no se entiende del todo el problema. No saltar el
proceso aunque el issue parezca simple: los bugs simples también tienen causa
raíz.

## Las fases de la depuración

El skill depura el defecto en cuatro fases. Cada fase produce un artefacto
visible que el operador revisa antes de avanzar.

1. **Investigar la causa raíz.** Antes de proponer cualquier corrección, leer
   los mensajes de error completos, los stack traces, las líneas y códigos
   señalados. Reproducir el defecto de forma fiable: ¿se puede dispararlo cada
   vez? ¿Cuáles son los pasos exactos? Si no es reproducible, reúne más
   evidencia — no se adivina. Revisar cambios recientes: git diff, commits,
   dependencias nuevas, cambios de configuración, diferencias de entorno. En
   sistemas multicapa, instrumentar cada frontera entre componentes (log de
   entrada y salida, verificación de propagación de config, estado en cada
   capa) para descubrir DÓNDE se rompe. Trazar el flujo de datos hacia atrás
   desde el síntoma hasta el origen del valor defectuoso. Declarar
   explícitamente qué se leyó y qué se omitió — el operador confirma el
   alcance antes de aislar.

2. **Analizar el patrón.** Encontrar código similar que sí funciona en el
   mismo codebase. Comparar contra la implementación de referencia leyéndola
   completa — no se hojea. Listar cada diferencia entre lo que funciona y lo
   que falla, por pequeña que sea. No asumir "eso no importa". Entender las
   dependencias, la configuración y el entorno que asume el código roto. El
   patrón es el esqueleto — sin él, la hipótesis no tiene dónde apoyarse.

3. **Formular y probar la hipótesis.** Plantear una única hipótesis clara:
   "creo que la causa raíz es X porque Y". Ser específico, no vago. Probar la
   corrección mínima: el cambio más pequeño posible, una variable a la vez.
   No se apilan varios arreglos. Si la hipótesis sobrevive la prueba mínima,
   avanza; si cae, se reemplaza por una hipótesis mejor — no se añaden
   arreglos encima de un arreglo que no funcionó. Una hipótesis sin evidencia
   es una conjetura; una hipótesis sin límite (qué la falsaría) es una
   creencia. Si no se entiende algo, decir "no entiendo X" y pedir ayuda o
   investigar más.

4. **Implementar la corrección.** Proponer un caso de prueba que falle que
   capture el defecto en su reproducción más simple. Implementar una única
   corrección que ataque la causa raíz identificada — un cambio a la vez, sin
   refactorizados de paso, sin "ya que estoy aquí". Verificar: ¿el test
   pasa? ¿No se rompió otro test? ¿El issue realmente se resolvió? Si la
   corrección no funciona, detenerse. Si se intentaron tres correcciones y
   cada una revela un problema nuevo en un sitio distinto, parar y cuestionar
   la arquitectura — no se intenta un cuarto arreglo sin discutir
   fundamentos con el operador. Esto no es una hipótesis fallida, es una
   arquitectura equivocada.

**Regla anti-skip:** no se avanza de fase sin el artefacto de la fase
anterior revisado por el operador. Si el operador pide "salta al fix", se
responde con el diagnóstico parcial y se documentan los gaps; no se salta a
corregir sin investigar ni probar. Depura en orden — siempre.

## Causa raíz sobre parche de síntoma

La distinción que define este skill: corregir la causa raíz, no parchear el
síntoma. El síntoma es lo que se ve; la causa raíz es lo que lo produce. Un
parche en el síntoma mueve el problema, lo enmascara o siembra una regresión
más cara. La investigación traza el defecto hacia atrás —desde el valor
defectuoso hasta su origen— y corrige en el origen. Si el issue es ambiental,
de timing o externo, se documenta y se implementa el manejo apropiado (retry,
timeout, mensaje de error) con monitoreo — pero la mayoría de los "no hay
causa raíz" son investigación incompleta.

## Prevenir la regresión

La corrección no termina con el fix: previene la regresión. Un caso de prueba
que falle antes del fix y pase después es el gate que separa "creo que arreglé"
de "arreglé". La prevención de regresión es parte de la fase de implementación,
no un paso opcional.

## Gobierno documental transversal

Antes de proponer o ejecutar cualquier `CREATE`, `EXPAND`, `EXTEND`, `CORRECT`,
`MIGRATE` o `DEPRECATE`, exigir un `DocumentationImpactPlanV1` completo. No declarar la
corrección terminada sin `DocumentationClosureReceiptV1` ligado al candidate y evidencia
del gate `DOCS_TRANSVERSAL_COMPLETE`; esta skill no autoaprueba ese gate. Aplicar el
contrato de [gobierno documental](references/documentation-governance.md).

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, merges, tests, builds, installs ni comandos
  de CLI externos. Toda operación git, de tests o mutación de código queda
  detrás de confirmación explícita del operador.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`superpowers:test-driven-development`,
  `superpowers:verification-before-completion`, `${CLAUDE_PLUGIN_ROOT}`, hooks,
  telemetría) — esos artefactos del referenciador se descartaron en la adaptación.
- NO auto-muta código ni auto-arranca tests ni comandos con side effects.
- Si una fase no puede completarse por falta de contexto o de acceso al
  código, se marca `coverage_gap` y se detiene — no se infiere ni se sustituye
  con una pulida conjetura.

El único entregable es el diagnóstico en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-systematic-debugging/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs
  prohibidas y completitud del fixture negativo.
- Si no hay contexto de depuración (no hay defecto declarado, no hay código
  accesible), se emite `coverage_gap` en lugar de fabricar un diagnóstico
  genérico.

## Lineage

Derivada de superpowers/systematic-debugging (obra/superpowers, MIT).
