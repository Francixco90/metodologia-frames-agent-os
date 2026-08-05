---
name: gstack-openclaw-investigate
description: This skill should be used when debugging a failure, fixing a bug, investigating an error or stack trace, performing root cause analysis, or responding to reports of unexpected behavior.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-openclaw-investigate — Investigación sistemática de causa raíz

## Cuándo invocar esta skill

Invócala cuando se depura una falla, se investiga un error o un stack trace,
se responde a un reporte de comportamiento inesperado, o se ejecuta root cause
analysis. La skill cubre el ciclo completo: reproducir, aislar, formular
hipótesis de causa raíz, verificar la hipótesis contra evidencia, y solo
entonces proponer un fix. El principio rector es estricto: **no se propone ni
aplica ningún fix sin antes haber confirmado la causa raíz**.

## Ley de hierro

**No fix sin causa raíz confirmada primero.**

Parchear síntomas genera debugging de whack-a-mole: cada fix que no ataca la
causa raíz hace que el siguiente bug sea más difícil de encontrar. La skill
investiga primero, verifica la hipótesis contra evidencia, y solo después
propone el fix. Si la hipótesis no se confirma, se recolecta más evidencia —no
se adivina.

## Frontera de ejecución

La skill es **evaluación local**: lee código, traza el camino del fallo,
formula hipótesis y propone veredictos. No muta el repositorio por sí misma.
Cualquier fix, patch o cambio de código está **gated en confirmación
explícita del usuario**: la skill presenta el fix propuesto con su evidencia y
espera autorización antes de aplicar nada. Si el usuario no confirma, no hay
escritura. La skill no ejecuta comandos de red, no publica, no realiza
llamadas externas.

## Fases de la investigación

### Fase 1 — Recolección de evidencia

Reúne contexto antes de formular cualquier hipótesis.

1. **Síntomas**: Lee los mensajes de error, stack traces y pasos de
   reproducción. Si el usuario no aportó contexto suficiente, haz **una**
   pregunta a la vez —no un cuestionario de cinco preguntas simultáneas.

2. **Camino del código**: Traza la ruta desde el síntoma hacia atrás hasta las
   causas posibles. Busca todas las referencias, lee la lógica alrededor del
   punto de fallo.

3. **Cambios recientes**: Revisa el historial del archivo afectado. Si antes
   funcionaba, la causa raíz está en el diff —una regresión.

4. **Reproducción**: ¿Puedes disparar el bug deterministamente? Si no,
   recolecta más evidencia antes de continuar. Sin reproducción, no hay
   verificación posible.

5. **Memoria de sesiones previas**: Revisa si ya hubo debugging en la misma
   zona. Bugs recurrentes en los mismos archivos son un smell arquitectural,
   no una coincidencia.

Salida de la fase: una **hipótesis de causa raíz** específica y testeable —un
claim concreto sobre qué está mal y por qué.

### Fase 2 — Análisis de patrones

Verifica si el bug encaja en un patrón conocido:

- **Race condition**: intermitente, dependiente del timing. Mirar acceso
  concurrente a estado compartido.
- **Propagación de nil/null**: NoMethodError, TypeError. Faltan guards sobre
  valores opcionales.
- **Corrupción de estado**: datos inconsistentes, actualizaciones parciales.
  Revisar transacciones, callbacks, hooks.
- **Falla de integración**: timeout, respuesta inesperada. Llamadas a APIs
  externos, fronteras de servicio.
- **Configuration drift**: funciona local, falla en staging/prod. Env vars,
  feature flags, estado de DB.
- **Stale cache**: muestra datos viejos, se corrige al limpiar cache. Redis,
  CDN, cache de navegador.

También revisar issues conocidos del proyecto y el git log de la zona. Bugs
recurrentes en los mismos archivos son smell arquitectural.

Si el bug no encaja en un patrón conocido, buscar la categoría del error. Antes
de buscar, **sanitizar**: quitar hostnames, IPs, rutas de archivo, SQL y datos
de cliente. Se busca la categoría del error, no el mensaje crudo.

### Fase 3 — Verificación de hipótesis

Antes de proponer **cualquier** fix, verifica la hipótesis contra evidencia.

1. **Confirmar la hipótesis**: añadir un log temporal, aserción o salida de
   debug en el punto sospechado. Correr la reproducción. ¿La evidencia
   coincide? Si no, la hipótesis es errónea —volver a la Fase 1, recolectar
   más evidencia, no adivinar.

2. **Regla de 3 strikes**: si 3 hipótesis fallan, **detenerse**. Decir al
   usuario: "3 hipótesis testeadas, ninguna coincide. Esto puede ser un issue
   arquitectural, no un bug simple." Opciones: continuar con una hipótesis
   nueva (describirla), escalar a revisión humana, o instrumentar y esperar a
   atraparlo la próxima vez.

**Red flags** —si ves alguno, bajar la velocidad:

- "Quick fix for now": no existe "for now". Se fixea bien o se escala.
- Proponer un fix antes de trazar el flujo de datos: estás adivinando.
- Cada fix revela un problema nuevo en otro lado: capa equivocada, no código
  equivocado.

### Fase 4 — Implementación (gated)

Una vez confirmada la causa raíz, la skill **propone** el fix al usuario y
espera confirmación explícita antes de aplicar nada.

1. **Fixear la causa raíz, no el síntoma**: el cambio mínimo que elimina el
   problema real.

2. **Diff mínimo**: pocos archivos tocados, pocas líneas cambiadas. Resistir
   el refactor de código adyacente.

3. **Test de regresión** que:
   - **Falla** sin el fix (prueba que el test es significativo).
   - **Pasa** con el fix (prueba que el fix funciona).

4. **Suite completa**: sin regresiones.

5. **Si el fix toca >5 archivos**: flagear el blast radius al usuario antes de
   proceder. Es grande para un bug fix.

### Fase 5 — Verificación y reporte

**Verificación fresca**: reproducir el escenario original del bug y confirmar
que está fixeado. Esto no es opcional.

Correr la suite de tests.

Emitir un reporte estructurado:

**DEBUG REPORT**

- **Síntoma**: lo que el usuario observó.
- **Causa raíz**: lo que realmente estaba mal.
- **Fix**: qué se cambió, con referencias a archivos.
- **Evidencia**: salida del test, reproducción mostrando que el fix funciona.
- **Test de regresión**: ubicación del nuevo test.
- **Relacionados**: bugs previos en la misma zona, notas arquitecturales.
- **Estado**: DONE | DONE_WITH_CONCERNS | BLOCKED.

Guardar el reporte en `memory/` con la fecha de hoy para que futuras sesiones
puedan referenciarlo.

## Reglas operativas

- **3+ intentos de fix fallidos: detenerse y cuestionar la arquitectura.**
  Arquitectura equivocada, no hipótesis fallida.
- **Nunca aplicar un fix que no puedes verificar.** Si no puedes reproducir
  y confirmar, no se shippea.
- **Nunca decir "this should fix it".** Verificar y probar. Correr los tests.
- **Si el fix toca >5 archivos**: flagear al usuario antes de proceder.
- **Estados de cierre**:
  - DONE: causa raíz encontrada, fix aplicado, test de regresión escrito,
    todos los tests pasan.
  - DONE_WITH_CONCERNS: fixeado pero no se puede verificar completamente
    (bug intermitente, requiere staging).
  - BLOCKED: causa raíz incierta tras investigación, escalado.

## Límite fail-closed

La skill **no aplica ningún fix sin confirmación explícita del usuario**.
Antes de cualquier escritura, la skill presenta: la causa raíz confirmada, el
fix propuesto, el diff mínimo, el test de regresión planificado y el blast
radius. Si el usuario no confirma, no hay escritura. Si la verificación falla
(reproducción no determinística, suite roja, evidencia insuficiente), la skill
surfacea el problema al usuario con diagnóstico accionable —no aplica
silenciosamente, no auto-decide.

No hay mutación del repositorio sin autorización. No hay publicación. La skill
es evaluación local respecto al repo: lee, traza, formula y propone. La
escritura está gated en confirmación.

Derivada de gstack-openclaw-investigate (garrytan/gstack, MIT).
