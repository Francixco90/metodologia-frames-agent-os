---
schema_version: multimedia-library-v1
content_sha256: 1deeff8fcd4478b23ad6ec152fe7e4717498b5b475bfe9b440926416a390473a
design_profile: metodologia-html-v7
state: RENDERED_DRAFT
---

# Biblioteca Universal de Creación Multimedia

Diez workflows ejecutables. Cada etapa carga solo su prompt, templates y skills asignadas. [CONFIG]

```mermaid
flowchart LR
  P00 --> P01 --> P02 --> P03 --> P04 --> P05 --> P06 --> P07 --> P08 --> P09
```

## P00 · Define tu sistema creativo

Define perfil, Brand OS, voz o piloto, una modalidad por vez y bajo aprobación.

- Prompt: [p00-definir-sistema/prompt-spec.md](../p00-definir-sistema/prompt-spec.md)
- Estado: DEFINED
- Deliverables:
  - **Charter de marca** (`brand-charter-v1`) · final · obligatorio · md/html/pdf · gate `G14` — Alinear identidad, promesa, audiencia, voz, canales, límites y autoridad de marca.
  - **Brand OS** (`brand-os-v1`) · intermediate · obligatorio · md/html/json · gate `G14` — Traducir el charter aprobado a reglas, tokens y decisiones reutilizables por herramientas.
  - **Muestra de calibración** (`calibration-sample-v1`) · intermediate · obligatorio · md/html · gate `G14` — Demostrar voz y sistema visual con ejemplos aprobables y contraejemplos.
  - **Plan piloto** (`pilot-plan-v1`) · final · obligatorio · md/html · gate `G14` — Acotar el primer uso del sistema con alcance, owner, coste, riesgo y criterio de aprendizaje.
- Skills: metodologia-brand-router, content-os-core, dev-writing-plans
- Gates: G13, G14

1. **S01:** Resolver identidad y autoridad de marca. · skill: `metodologia-brand-router` · gate: `G13` · stop: Bloquear si identidad, autoridad o consentimiento no son inequívocos.
2. **S02:** Definir voz, canal y audiencia sin mezclar perfiles. · skill: `content-os-core` · gate: `G13` · stop: Bloquear ante mezcla de perfiles o contexto insuficiente.
3. **S03:** Fijar tokens creativos y restricciones del piloto. · skill: `dev-writing-plans` · gate: `G14` · stop: Detener si el piloto excede alcance o carece de aprobación.

## P01 · Convierte tu día a día en oportunidades de contenido

Convierte material cotidiano en oportunidades trazables sin obligar a publicarlo.

- Prompt: [p01-curar-material/prompt-spec.md](../p01-curar-material/prompt-spec.md)
- Estado: CLASSIFIED
- Deliverables:
  - **Ficha de captura** (`capture-card-v1`) · intermediate · obligatorio · md/html/json · gate `G14` — Registrar una fuente con hash, autoridad, derechos, relevancia y limitaciones.
  - **Registro de triage** (`triage-record-v1`) · intermediate · obligatorio · md/html/csv · gate `G14` — Clasificar material por utilidad, riesgo, duplicidad, vigencia y siguiente acción.
  - **Digest y shortlist** (`digest-shortlist-v1`) · final · obligatorio · md/html · gate `G14` — Seleccionar materiales utilizables y declarar exclusiones y gaps.
- Skills: content-os-registry, content-os-media, metodologia-find-skills
- Gates: G14

1. **S01:** Inventariar y preservar material con procedencia. · skill: `content-os-registry` · gate: `G14` · stop: Bloquear si faltan fuente, hash o autoridad.
2. **S02:** Clasificar relevancia, sensibilidad, derechos y destino. · skill: `content-os-media` · gate: `G14` · stop: Bloquear material sensible o sin derechos verificables.
3. **S03:** Seleccionar y priorizar el material utilizable. · skill: `metodologia-find-skills` · gate: `G14` · stop: Detener si ningún elemento supera el preclear de evidencia y derechos.

## P02 · Investiga y fortalece una idea

Verifica claims, encuentra matices y convierte fuentes en decisiones editoriales.

- Prompt: [p02-investigar/prompt-spec.md](../p02-investigar/prompt-spec.md)
- Estado: DISCOVERED
- Deliverables:
  - **Registro de claims** (`claim-register-v1`) · intermediate · obligatorio · md/html/csv · gate `G14` — Vincular cada afirmación con evidencia, autoridad, límite, estado y revisor.
  - **Mapa de oportunidades** (`opportunity-map-v1`) · final · obligatorio · md/html · gate `G14` — Priorizar problemas, audiencias, mensajes y formatos respaldados por evidencia.
  - **Banco de preguntas** (`question-bank-v1`) · intermediate · obligatorio · md/html · gate `G14` — Conservar preguntas abiertas, impacto, owner, fuente esperada y stop rule.
- Skills: content-os-core, content-os-registry
- Gates: G14

1. **S01:** Formular preguntas verificables desde el shortlist. · skill: `content-os-core` · gate: `G14` · stop: Detener si la pregunta no puede vincularse a una decisión editorial.
2. **S02:** Buscar evidencia solo en fuentes autorizadas. · skill: `content-os-registry` · gate: `G14` · stop: Marcar UNKNOWN y bloquear si la evidencia es insuficiente.
3. **S03:** Sintetizar oportunidades, matices y límites. · skill: `content-os-core` · gate: `G14` · stop: Bloquear cualquier oportunidad basada en claims no verificados.

## P03 · Crea el brief o la campaña

Define una pieza, sistema de derivados, serie o campaña con funciones distintas.

- Prompt: [p03-crear-brief/prompt-spec.md](../p03-crear-brief/prompt-spec.md)
- Estado: DIRECTION_APPROVED
- Deliverables:
  - **Brief y mapa de campaña** (`brief-campaign-map-v1`) · final · obligatorio · md/html/pdf · gate `MW_BRIEF_APPROVED` — Convertir el pedido en audiencia, problema, acción, arquitectura y criterios de aceptación.
  - **Charter de campaña** (`campaign-charter-v1`) · final · condicional: mode=campana-o-colaboracion · md/html/pdf · gate `MW_BRIEF_APPROVED` — Fijar alcance, resultado, governance, piezas, hitos, medición y autoridad de campaña.
  - **Presentación ejecutiva** (`executive-presentation-v1`) · intermediate · condicional: requested=true or decision_audience=leadership · md/html/pptx/pdf · gate `MW_BRIEF_APPROVED` — Sintetizar decisión, evidencia, propuesta, inversión, riesgos y próximos gates para liderazgo.
  - **Conceptos A/B** (`ab-concepts-v1`) · intermediate · obligatorio · md/html · gate `MW_BRIEF_APPROVED` — Comparar dos rutas creativas con hipótesis, evidencia, coste, riesgo y criterio de decisión.
  - **Definition of Ready** (`definition-of-ready-v1`) · final · obligatorio · md/html · gate `MW_BRIEF_APPROVED` — Bloquear producción hasta resolver evidencia, ownership, formato, assets, presupuesto y aprobación.
- Skills: content-os-creative, content-os-product-launch-video, content-os-core, dev-writing-plans
- Gates: G13, G14, MW_BRIEF_APPROVED

1. **S01:** Interpretar intención, audiencia, objetivo y evidencia. · skill: `content-os-creative` · gate: `G13` · stop: Formular como máximo tres preguntas; volver a P02 si falta evidencia.
2. **S02:** Elegir arquitectura de pieza, serie o campaña. · skill: `dev-writing-plans` · gate: `G13` · stop: Reducir a pieza única si la oportunidad no sostiene una campaña.
3. **S03:** Definir conceptos A/B, riesgos y criterios de éxito. · skill: `content-os-creative` · gate: `G13` · stop: Bloquear conceptos que alteren claims o excedan restricciones.
4. **S04:** Comprobar Definition of Ready y solicitar decisión. · skill: `dev-writing-plans` · gate: `MW_BRIEF_APPROVED` · stop: Detener antes de producir hasta recibir aprobación inequívoca del brief.

## P04 · Construye un calendario editorial realista

Ordena capacidad, dependencias y fechas desde investigación hasta aprendizaje.

- Prompt: [p04-calendarizar/prompt-spec.md](../p04-calendarizar/prompt-spec.md)
- Estado: DEFINED
- Deliverables:
  - **Cronograma editorial** (`editorial-calendar-v1`) · final · obligatorio · md/html/csv · gate `G14` — Secuenciar piezas, hitos, dependencias, owners y gates en el tiempo.
  - **Parrilla de contenidos** (`content-grid-v1`) · final · condicional: content_count>1 or mode=calendario-de-campana · md/html/csv · gate `G14` — Mapear cada publicación a audiencia, objetivo, canal, formato, hook, CTA, fuente y métrica.
  - **Tablero de producción** (`board-v1`) · intermediate · obligatorio · md/html/csv · gate `G14` — Exponer trabajo, estado, capacidad, bloqueos y siguiente gate por ítem.
  - **Plan por lotes** (`batch-plan-v1`) · intermediate · obligatorio · md/html · gate `G14` — Agrupar producción compatible sin romper dependencias, calidad ni capacidad.
- Skills: dev-executing-plans, content-os-core
- Gates: G14

1. **S01:** Priorizar entregables y secuencia de producción. · skill: `dev-executing-plans` · gate: `G14` · stop: Omitir P04 para una pieza única sin dependencias ni calendario.
2. **S02:** Asignar hitos, dependencias y capacidad. · skill: `dev-executing-plans` · gate: `G14` · stop: Reducir al primer sprint si la capacidad no es verificable.
3. **S03:** Definir lotes y medición antes de extender. · skill: `content-os-core` · gate: `G14` · stop: Bloquear un lote que exceda capacidad o no tenga criterio de aprendizaje.

## P05 · Diseña la pieza multimedia

Convierte un brief aprobado en guion, secuencia, continuidad y mapa de activos.

- Prompt: [p05-disenar-pieza/prompt-spec.md](../p05-disenar-pieza/prompt-spec.md)
- Estado: SPEC_APPROVED
- Deliverables:
  - **Especificación creativa** (`creative-spec-v1`) · final · obligatorio · md/html · gate `G14` — Definir narrativa, formato, estructura, copy, visuales, audio, CTA y aceptación de la pieza.
  - **Ficha de familia de pieza** (`piece-family-spec-v1`) · intermediate · obligatorio · md/html · gate `G14` — Especializar la pieza como imagen, miniclip, gráfica, carrusel o historia sin perder el brief.
  - **Biblia de continuidad** (`continuity-bible-v1`) · intermediate · obligatorio · md/html · gate `G14` — Mantener personajes, objetos, estilo, secuencia, claims y transiciones coherentes.
  - **Mapa de activos** (`asset-map-v1`) · intermediate · obligatorio · md/html/csv · gate `G14` — Enumerar cada activo, fuente, owner, formato, dependencia y criterio de aceptación.
  - **Pack de prompts de producción** (`universal-prompts-v1`) · final · obligatorio · md/html/json · gate `G14` — Proveer prompts trazables para imágenes, miniclips, gráficas, carruseles e historias.
  - **Sistema de derivados** (`derivatives-v1`) · final · condicional: content_count>1 or derivative_requested=true · md/html · gate `G14` — Derivar formatos y canales desde una pieza matriz preservando claims, identidad y lineage.
- Skills: content-os-creative, content-os-motion-graphics, content-os-remotion-bridge, design-compose-graphics
- Gates: MW_SPEC_APPROVED, G14

1. **S01:** Elegir medio y ruta creativa desde el brief aprobado. · skill: `content-os-creative` · gate: `MW_SPEC_APPROVED` · stop: Crear un prototipo de bajo costo si el medio no puede justificarse.
2. **S02:** Diseñar narrativa, secuencia y continuidad. · skill: `content-os-motion-graphics` · gate: `MW_SPEC_APPROVED` · stop: Bloquear si la narrativa altera claims o rompe continuidad.
3. **S03:** Mapear activos, prompts y derivados. · skill: `design-compose-graphics` · gate: `G14` · stop: Bloquear cualquier activo sin fuente, owner, formato o criterio de aceptación.

## P06 · Crea los activos multimedia

Genera, guía o especifica activos por etapas, con evidencia y estado exacto.

- Prompt: [p06-crear-activos/prompt-spec.md](../p06-crear-activos/prompt-spec.md)
- Estado: BUILD_VALIDATED
- Deliverables:
  - **Paquete de piezas candidatas** (`asset-package-v1`) · final · obligatorio · md/html/image/video/audio · gate `G14` — Empaquetar piezas materiales y companions hash-bound sin afirmar aprobación.
  - **Manifiesto de activos** (`asset-manifest-v1`) · intermediate · obligatorio · md/html/json · gate `G14` — Registrar archivo, hash, procedencia, derechos, tool run y relación con la especificación.
  - **Reporte de capacidad** (`capability-report-v1`) · intermediate · obligatorio · md/html · gate `G14` — Declarar qué pudo producirse, qué quedó bloqueado y qué requiere una ruta alternativa.
  - **Evidencia de ejecución** (`tool-run-evidence-v1`) · intermediate · obligatorio · md/html/json · gate `G14` — Vincular inputs, herramienta, versión, parámetros, outputs, hashes y errores del run.
- Skills: content-os-core, content-os-remotion-create, content-os-remotion-render, content-os-media
- Gates: MW_ASSET_REVIEW, G14

1. **S01:** Ejecutar preflight de capacidad, derechos y herramientas. · skill: `content-os-core` · gate: `MW_ASSET_REVIEW` · stop: Bloquear herramienta, fuente o activo no autorizado.
2. **S02:** Producir o capturar activos por etapas. · skill: `content-os-remotion-create` · gate: `MW_ASSET_REVIEW` · stop: Limitar a prototipo no publicable si persiste riesgo o falta capacidad.
3. **S03:** Registrar procedencia y comprobar continuidad. · skill: `content-os-media` · gate: `MW_ASSET_REVIEW` · stop: Bloquear outputs sin archivo material, hash o lineage.
4. **S04:** Empaquetar el candidate sin promover su estado. · skill: `content-os-remotion-render` · gate: `G14` · stop: RENDERED_DRAFT no concede aprobación, readiness ni publicación.

## P07 · Revisa material multimedia

Diagnostica solo lo observable y transforma hallazgos en correcciones priorizadas.

- Prompt: [p07-revisar/prompt-spec.md](../p07-revisar/prompt-spec.md)
- Estado: REVIEW_SHOTS_APPROVED
- Deliverables:
  - **Reporte de revisión** (`review-report-v1`) · final · obligatorio · md/html · gate `G14` — Evaluar contenido, marca, evidencia, derechos, accesibilidad y calidad visual.
  - **Veredicto** (`verdict-v1`) · final · obligatorio · md/html/json · gate `G14` — Emitir PASS, REVISE o BLOCKED con evidencia y siguiente gate, sin remediar.
  - **Cambios prioritarios** (`top5-changes-v1`) · intermediate · obligatorio · md/html · gate `G14` — Priorizar hasta cinco cambios por impacto, evidencia, owner y riesgo de regresión.
- Skills: design-audit-genjutsu, content-os-core
- Gates: G14

1. **S01:** Revisar contenido y marca solo sobre material observable. · skill: `design-audit-genjutsu` · gate: `G14` · stop: Solicitar copia o descripción si el material no abre; nunca inventar.
2. **S02:** Verificar evidencia, derechos y accesibilidad. · skill: `content-os-core` · gate: `G14` · stop: UNKNOWN, evidencia ausente o check manual no ejecutado bloquean.
3. **S03:** Priorizar hasta cinco correcciones verificables. · skill: `design-audit-genjutsu` · gate: `G14` · stop: No remediar desde el rol verifier; emitir REVISE o BLOCKED.

## P08 · Edita, compone y reutiliza

Monta, compone, localiza y reutiliza con lineage, QC y rollback.

- Prompt: [p08-editar/prompt-spec.md](../p08-editar/prompt-spec.md)
- Estado: POSTPRODUCTION_VALIDATED
- Deliverables:
  - **Candidate editado** (`edit-candidate-v1`) · final · obligatorio · md/html/image/video/audio · gate `G14` — Materializar un successor candidate preservando lineage, claims, assets y estado.
  - **Lista de decisiones de edición** (`edl-v1`) · intermediate · obligatorio · md/html/csv · gate `G14` — Trazar cada cambio a un hallazgo, ubicación, acción, owner y resultado.
  - **Matriz de exportación** (`export-matrix-v1`) · intermediate · obligatorio · md/html/csv · gate `G14` — Definir formatos, dimensiones, duración, peso, nombre, canal y checksum de exportación.
- Skills: content-os-remotion-render, remotion-video-production-v2, content-os-seam-craft
- Gates: MW_EDIT_APPROVED, G14

1. **S01:** Priorizar cambios y preparar un successor candidate. · skill: `content-os-seam-craft` · gate: `MW_EDIT_APPROVED` · stop: Preservar el candidate anterior y su lineage inmutable.
2. **S02:** Editar, componer o localizar según el EDL. · skill: `content-os-remotion-render` · gate: `MW_EDIT_APPROVED` · stop: Volver a P06 si falta un activo; no fabricar sustitutos no autorizados.
3. **S03:** Comparar, probar regresiones y definir exportación. · skill: `content-os-remotion-render` · gate: `G14` · stop: Bloquear diferencias no explicadas, QC incompleto o rollback ausente.

## P09 · Empaqueta, publica, conversa o aprende

Separa empaque, publicación, comunidad y aprendizaje para operar con control.

- Prompt: [p09-distribuir/prompt-spec.md](../p09-distribuir/prompt-spec.md)
- Estado: READY
- Deliverables:
  - **Paquete por plataforma** (`platform-package-v1`) · final · obligatorio · md/html/json · gate `G17` — Preparar archivos, copy, metadata, alt text y checklist por canal sin publicar.
  - **Registro de publicación** (`publication-record-v1`) · intermediate · obligatorio · md/html/json · gate `G17` — Preparar el registro que solo se completa con evidencia externa de publicación autorizada.
  - **Dashboard de resultados** (`results-dashboard-v1`) · final · condicional: observed-results available · md/html/csv · gate `G17` — Comparar baseline, objetivos y métricas observadas sin inventar datos ni causalidad.
  - **Reporte de aprendizaje** (`learning-report-v1`) · final · obligatorio · md/html · gate `G17` — Convertir resultados observados en decisiones, límites, hipótesis y siguiente experimento.
- Skills: metodologia-brand-router, instagram-content-orchestration, instagram-carousel-production
- Gates: MW_DISTRIBUTION_AUTHORIZED, G15, G17

1. **S01:** Validar autorización, estado y hash del candidate. · skill: `metodologia-brand-router` · gate: `MW_DISTRIBUTION_AUTHORIZED` · stop: Sin aprobación humana inequívoca, preparar package y detener.
2. **S02:** Adaptar el paquete al canal sin mutar el contenido aprobado. · skill: `instagram-content-orchestration` · gate: `G15` · stop: Bloquear adaptación que altere claims, marca o autorización.
3. **S03:** Preparar checklist y registro de publicación. · skill: `instagram-carousel-production` · gate: `G17` · stop: No publicar, enviar ni activar conectores desde este workflow.
4. **S04:** Registrar baseline y aprendizaje sin inventar métricas. · skill: `instagram-content-orchestration` · gate: `G17` · stop: Marcar coverage_gap si no existen datos observables.

> RENDERED_DRAFT ≠ HUMAN_APPROVED ≠ READY ≠ PUBLISHED. [CONFIG]
