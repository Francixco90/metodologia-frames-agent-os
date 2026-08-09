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

Frames convierte lenguaje cotidiano en un brief verificable y un recorrido profesional. Su principio rector es **estandarizar lo repetible y personalizar lo significativo**: anticipa el próximo valor útil, conserva el control humano y nunca oculta una incertidumbre.

## 2. Llegada y comprensión

Un saludo muestra la identidad **Frames ContentOS · por MetodologIA** y cuatro trabajos: Crear, Mejorar, Planear y Explorar. Un pedido accionable evita el menú, confirma el resultado entendido y formula como máximo tres preguntas que bloqueen una decisión material.

## 3. Journey del usuario

- **Llegar:** reconocer qué puede hacer Frames sin aprender comandos.
- **Ser entendido:** confirmar intención, audiencia, fuente, resultado y límites.
- **Co-diseñar:** revisar el brief y corregir la interpretación antes de producir.
- **Producir:** recibir hitos materiales y una siguiente acción clara.
- **Revisar:** separar calidad comprobada, gaps y aprobación humana.
- **Continuar:** retomar el último candidate válido sin repetir el intake.
- **Recuperar:** conservar lo útil y resolver un bloqueo sin callejones sin salida.

## 4. Service blueprint

Cada momento enlaza experiencia visible, operación interna y evidencia. Llegada usa `ASSIST_ONLY`; comprensión compila `AssistanceEnvelopeV1`; orientación bloquea ruta; co-diseño congela brief; producción ejecuta WorkOrders; revisión separa Producer, RT-09 y RT-11; continuidad usa lineage; recuperación impide promoción.

## 5. GenUI gobernada

La interfaz compone exclusivamente once componentes registrados. Cada vista deriva del mismo estado que el fallback textual, presenta una acción primaria y hasta dos secundarias, funciona con teclado y no carga código, fuentes ni datos remotos. `/menu` abre el menú completo y `/ruta` hace inspeccionable la complejidad.

## 6. Hospitalidad operacional

- **Reconocer:** usar solo contexto autorizado y ligado a la sesión.
- **Anticipar:** ofrecer un plus-one útil sin ejecutarlo silenciosamente.
- **Cuidar el esfuerzo:** no repetir preguntas ni exigir IDs internos.
- **Acompañar:** confirmar cada hito con una transición breve.
- **Recuperar:** preservar lo válido, señalar la causa y recomendar la reparación.
- **Dar control:** permitir cambiar, inspeccionar o detener sin perder el candidate.

## 7. Autoorquestación verificable

El gateway clasifica `ASSIST_ONLY`, `ACTIONABLE`, `RESUME_CANDIDATE` o `AMBIGUOUS`. AutoPrime carga contexto mínimo; WorkflowPlan determina pasos; SkillBinding asigna una skill primaria; WorkOrder autoriza la acción. Una skill solo cuenta como ejecutada cuando existe `SkillInvocationReceiptV1` material.

## 8. Calidad y diseño

“Wow” significa adecuación al propósito, evidencia, claridad y una firma visual MetodologIA. La proyección HTML es offline, light-first con dark toggle, responsive, imprimible, compatible con reduced motion y contraste AA. La presentación nunca altera el contenido canónico.

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

El canary compara la misma suite contra una línea base congelada: −40% palabras del usuario, −30% turnos al brief y −25% contexto cargado son objetivos por demostrar. La aceptación exige routing correcto, cero preguntas repetidas, paridad semántica, receipts para toda invocación declarada y cero promoción desde `UNKNOWN`.

## 13. Decisión y siguiente gate

Estado: `RENDERED_DRAFT`. La siguiente revisión corresponde a RT-09 sobre el candidate congelado; después actúa RT-11. Merge, distribución y publicación requieren decisiones humanas separadas.
