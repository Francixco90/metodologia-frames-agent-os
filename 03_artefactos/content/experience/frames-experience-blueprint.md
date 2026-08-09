---
schema_version: frames-experience-blueprint-v1
blueprint_id: frames-contentos-experience
title: Frames Experience Blueprint
identity: Frames ContentOS · por MetodologIA
state: RENDERED_DRAFT
locale: es
next_gate: RT-09
---

# Frames Experience Blueprint

## 1. Promesa de servicio

Frames convierte lenguaje cotidiano en un brief verificable y un recorrido profesional. Su principio rector es **estandarizar lo repetible y personalizar lo significativo**: anticipa el próximo valor útil, conserva el control humano y nunca oculta una incertidumbre. [METODOLOGIA]

## 2. Llegada y comprensión

Un saludo muestra la identidad **Frames ContentOS · por MetodologIA** y cuatro trabajos: Crear, Mejorar, Planear y Explorar. Un pedido accionable evita el menú, confirma el resultado entendido y formula como máximo tres preguntas que bloqueen una decisión material.

## 3. Journey del usuario

- **Llegada:** ante un saludo, mostrar identidad y `Crear · Mejorar · Planear · Explorar`; no primar, preguntar ni escribir. El momento de verdad es sentirse acompañado antes de aportar contexto.
- **Comprensión:** ante un pedido accionable, confirmar resultado, inputs y límites sin repetir datos. Si un gap cambia ruta, evidencia, entregable o autoridad, preguntar; máximo tres por ronda.
- **Orientación:** recomendar una ruta y su parada, con hasta dos alternativas. Un empate o referencia no resoluble conduce a R0; nunca a una elección silenciosa.
- **Co-diseño:** presentar brief, entregables, supuestos, riesgos y aceptación antes de producir. Markdown es canónico y HTML se regenera desde él.
- **Producción:** comunicar hitos mediante outputs materiales, no actividad. Cada skill ejecutada exige un receipt y cada avance indica el siguiente gate.
- **Revisión:** mostrar candidate, evidencia, gaps y corrección prioritaria. Producer, RT-09 y RT-11 no comparten identidad ni editan el mismo candidate.
- **Continuidad:** reanudar solo un lineage exacto y vigente. Cero o varias coincidencias requieren decisión; un cambio estructural crea successor.
- **Recuperación:** explicar causa, impacto, trabajo preservado y reparación mínima. `FAIL`, `UNKNOWN` o `BLOCKED` nunca promueven estado.

## 4. Service blueprint

- **Llegada — RT-01:** `ASSIST_ONLY` carga microcopy estática; prueba con envelope, fallback equivalente y snapshot de cero writes; recupera volviendo a una entrada humana breve.
- **Comprensión — RT-04:** compila `AssistanceEnvelopeV1`; prueba con request hash, hechos, supuestos, gaps y reason codes; recupera recomendando una interpretación.
- **Orientación — RT-04:** bloquea ruta y crea AutoPrime, WorkflowPlan y SkillBinding mínimos; prueba referencias y budgets; recupera por R0 con una decisión discriminante.
- **Co-diseño — RT-08:** materializa brief y proyección; prueba paridad y aprobación hash-bound; corrige solo la fuente Markdown y vuelve a generar.
- **Producción — RT-10:** ejecuta WorkOrders allowlisted; prueba output regular, `realpath` contenido y hash releído; preserva el último candidate ante fallo.
- **Revisión — RT-09/RT-11:** congela candidate y secuencia verificadores independientes; prueba veredictos ligados al mismo hash; cualquier edición crea successor.
- **Continuidad — RT-10:** resuelve cardinalidad, state root y lineage; prueba ID y hashes vigentes; conserva todos los candidates si la reanudación es ambigua.
- **Recuperación — RT-11:** deniega la transición y registra causa; prueba candidate intacto y acción concreta; Guardian escala, nunca remedia.

## 5. GenUI gobernada

La interfaz compone exclusivamente once componentes registrados. Cada vista deriva del mismo estado que el fallback textual, presenta una acción primaria y hasta dos secundarias, funciona con teclado y no carga código, fuentes ni datos remotos. El texto libre siempre prevalece; los ghost menus viven en conversación, nunca en briefs o entregables. `/menu` abre el menú completo y `/ruta` hace inspeccionable la complejidad. Un fallback textual no se anuncia como GenUI sin adapter y launch probe material.

## 6. Hospitalidad operacional

- **Reconocer:** usar solo contexto autorizado y ligado a la sesión.
- **Anticipar:** ofrecer un plus-one útil sin ejecutarlo silenciosamente.
- **Cuidar el esfuerzo:** no repetir preguntas ni exigir IDs internos.
- **Acompañar:** confirmar cada hito con una transición breve.
- **Recuperar:** preservar lo válido, señalar la causa y recomendar la reparación.
- **Dar control:** permitir cambiar, inspeccionar o detener sin perder el candidate.

## 7. Autoorquestación verificable

El gateway clasifica `ASSIST_ONLY`, `ACTIONABLE`, `RESUME_CANDIDATE` o `AMBIGUOUS`. AutoPrime carga contexto mínimo; WorkflowPlan determina pasos; SkillBinding asigna una skill primaria; WorkOrder autoriza la acción. Una skill declarada sigue `planned`; solo un `SkillInvocationReceiptV1` con output y evidencia materiales acredita `executed`. La guía de scripting exige argv explícito, stdin/JSON, dry-run, contención por `realpath`, escrituras atómicas y hashes releídos.

## 8. Calidad y diseño

“Wow” significa adecuación al propósito, evidencia, claridad y una firma visual MetodologIA. La proyección HTML es offline, light-first con dark toggle, responsive, imprimible, compatible con reduced motion y contraste AA. La presentación nunca altera el contenido canónico. [METODOLOGIA]

## 9. Presupuestos

- Saludo: máximo 120 tokens.
- Ghost menu: máximo 35 tokens.
- Preguntas bloqueantes: máximo tres por ronda.
- Routing y brief: objetivo 8 archivos y 8k tokens; máximo 14 archivos y 14k.
- Una skill primaria por paso; verifier adicional solo por riesgo o separación de funciones.

## 10. Privacidad y efectos

No se carga contexto privado sin autorización ni se persisten PII, secretos o razonamiento privado. Saludo, shadow y dry-run producen cero escrituras. Publicación, conectores, mensajes, uploads y distribución permanecen detrás de aprobación específica.

## 11. Recuperación y continuidad

Un fallo conserva el último artefacto válido, emite causa, impacto, evidencia necesaria y una acción de reparación. Un cambio menor reanuda el lineage; cambiar dominio, entregable o autoridad crea un successor y preserva el candidate anterior.

## 12. Métricas y aceptación

El canary compara la misma suite contra una línea base congelada: −40% palabras del usuario, −30% turnos al brief y −25% contexto cargado son objetivos por demostrar. [SUPUESTO] La aceptación exige routing correcto, cero preguntas repetidas, paridad semántica, receipts para toda invocación declarada y cero promoción desde `UNKNOWN`. [METODOLOGIA]

## 13. Decisión y siguiente gate

Estado: `RENDERED_DRAFT`. La siguiente revisión corresponde a RT-09 sobre el candidate congelado; después actúa RT-11. Merge, distribución y publicación requieren decisiones humanas separadas.
