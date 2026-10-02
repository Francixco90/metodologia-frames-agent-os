#!/usr/bin/env python3
"""Original semantic vector library; deterministic banks, separate preview gallery."""
import argparse, hashlib, html, json, math, pathlib, shutil, tempfile, zipfile
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / '03_artefactos/renderers/frames-aula/assets'
VERSION = '1.1.0'
MAX_BYTES = 30_000_000
SOURCE = '05_verificacion/scripts/build-aula-assets.py'

# Original 24-unit components. Each icon combines a domain metaphor with a
# different action/role component. Color changes never count as new graphics.
GLYPHS = {
 'book':'<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15M6 8h3M15 8h3M6 12h3M15 12h3"/>',
 'brain':'<path d="M12 4c-4-5-9 1-7 4-5 2-4 9 1 9-1 5 6 6 6 2V4m0 0c4-5 9 1 7 4 5 2 4 9-1 9 1 5-6 6-6 2M6 9l3 2-2 4m11-6-3 2 2 4"/>',
 'speech':'<path d="M3 4h18v13H9l-6 4V4M7 8h10M7 12h6"/>',
 'people':'<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 21v-3c0-7 12-7 12 0v3m2 0v-4c0-4 6-4 6 0v4"/>',
 'calendar':'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M7 2v5M17 2v5M7 13h2m4 0h2m-8 4h2m4 0h2"/>',
 'flask':'<path d="M8 2h8M9 2v7L3 19c-1 2 1 3 3 3h12c2 0 4-1 3-3L15 9V2M6 16h12"/><circle cx="10" cy="18" r="1"/>',
 'clipboard':'<rect x="4" y="4" width="16" height="18" rx="2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 10h8M8 14h8M8 18h5"/>',
 'chip':'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M8 2v4m4-4v4m4-4v4M8 18v4m4-4v4m4-4v4M2 8h4m-4 4h4m-4 4h4m12-8h4m-4 4h4m-4 4h4"/>',
 'gear':'<path d="m10 2 4 0 1 3 3-1 2 3-2 3 4 1v4l-4 1 2 3-2 3-3-1-1 3h-4l-1-3-3 1-2-3 2-3-4-1v-4l4-1-2-3 2-3 3 1z"/><circle cx="12" cy="13" r="4"/>',
 'briefcase':'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V3h8v4M2 12l10 4 10-4M10 13h4v4h-4z"/>',
 'database':'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0M3 18c0 4 18 4 18 0"/>',
 'palette':'<path d="M12 2C-2 2-1 20 11 22c6 0 0-6 6-6 8 0 7-14-5-14z"/><circle cx="7" cy="8" r="1"/><circle cx="13" cy="6" r="1"/><circle cx="18" cy="10" r="1"/><circle cx="5" cy="14" r="1"/>',
 'shield':'<path d="M12 2 3 6v7c0 5 6 8 9 10 3-2 9-5 9-10V6zM8 12l3 3 6-7"/>',
 'compass':'<circle cx="12" cy="12" r="10"/><path d="m16 7-3 8-6 3 3-8zM12 2v2m0 16v2M2 12h2m16 0h2"/>',
 'target':'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="m12 12 9-9M17 3h4v4"/>',
 'wrench':'<path d="M21 3c-5-3-10 1-8 6L3 19l2 3L16 12c5 2 9-3 6-8l-4 4-3-3z"/>',
 'eye':'<path d="M2 12c6-10 14-10 20 0-6 10-14 10-20 0z"/><circle cx="12" cy="12" r="3"/>',
 'pen':'<path d="m3 21 1-6L17 2l5 5L9 20zM4 15l5 5M14 5l5 5"/>',
 'board':'<rect x="2" y="3" width="20" height="14" rx="1"/><path d="M6 22l6-5 6 5M6 7h12M6 11h8"/>',
 'person':'<circle cx="12" cy="6" r="4"/><path d="M4 22v-4c0-8 16-8 16 0v4M8 17v5m8-5v5"/>',
 'layers':'<path d="m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
 'cap':'<path d="m1 8 11-6 11 6-11 6zM5 10v7c4 4 10 4 14 0v-7M22 8v10"/>',
 'question':'<path d="M7 7c0-7 11-7 11 0 0 5-6 3-6 8"/><circle cx="12" cy="20" r="1"/>',
 'bulb':'<path d="M8 17C-1 6 7 1 12 2c6 0 12 5 4 15zM8 20h8M10 23h4M12 14V9m-3 0 3 3 3-3"/>',
 'refresh':'<path d="M4 8a9 9 0 0 1 16 0M4 8V2m0 6h6M20 16a9 9 0 0 1-16 0m16 0v6m0-6h-6"/>',
 'check':'<path d="m3 12 6 7L21 4"/>',
 'flag':'<path d="M4 23V2h15l-3 5 3 5H4"/>',
 'arrow':'<path d="M2 12h19m-7-7 7 7-7 7"/>',
 'star':'<path d="m12 2 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/>',
 'heart':'<path d="M12 22C-7 10 5-6 12 5c7-11 19 5 0 17z"/>',
 'clock':'<circle cx="12" cy="12" r="10"/><path d="M12 5v8l5 3"/>',
 'link':'<path d="m8 14-2 2c-6 6-12-1-6-6l5-5c4-4 8-2 9 1m2 4 2-2c6-6 12 1 6 6l-5 5c-4 4-8 2-9-1M8 16l8-8"/>',
 'search':'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',
 'chart':'<path d="M3 2v19h19M6 16l5-6 4 3 6-8M17 5h4v4"/>',
 'document':'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8M8 19h5"/>',
 'code':'<path d="m8 5-6 7 6 7m8-14 6 7-6 7M14 2l-4 20"/>',
 'lock':'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M7 10V7c0-7 10-7 10 0v3M12 15v4"/>',
 'warning':'<path d="m12 2 11 20H1zM12 8v6"/><circle cx="12" cy="18" r="1"/>',
 'grid':'<rect x="2" y="2" width="20" height="20" rx="1"/><path d="M2 9h20M2 15h20M9 2v20m6-20v20"/>',
 'puzzle':'<path d="M3 3h7c-3 8 7 8 4 0h7v7c-8-3-8 7 0 4v7h-7c3-8-7-8-4 0H3v-7c8 3 8-7 0-4z"/>',
 'play':'<path d="m6 2 16 10L6 22z"/>',
 'pause':'<path d="M6 3v18M18 3v18"/>',
 'stop':'<rect x="3" y="3" width="18" height="18" rx="1"/>',
 'plus':'<path d="M12 2v20M2 12h20"/>',
 'minus':'<path d="M2 12h20"/>',
 'branch':'<path d="M4 22V7h15M4 15h15"/><circle cx="4" cy="3" r="2"/><circle cx="20" cy="7" r="2"/><circle cx="20" cy="15" r="2"/>',
 'merge':'<path d="M3 2v5c0 7 9 2 9 12M21 2v5c0 7-9 2-9 12M12 18v4"/>',
 'ear':'<path d="M6 8C6-1 21-1 21 9c0 8-7 5-7 11-3 5-7 1-7-2M10 9c0-6 7-5 7 0 0 5-5 2-5 6"/>',
 'hand':'<path d="M7 13V4c0-4 4-4 4 0v7-9c0-3 4-3 4 0v9-6c0-3 4-3 4 0v8l2-5c1-3 5-1 3 2l-4 10H9L2 14c-2-3 2-5 5-1z"/>',
 'balance':'<path d="M12 2v20M4 22h16M3 6h18M5 6l-4 9h8zM19 6l-4 9h8z"/>',
 'globe':'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="5" ry="10"/><path d="M2 12h20M4 6h16M4 18h16"/>',
 'leaf':'<path d="M21 2C1 0-3 24 12 21 22 19 21 12 21 2zM3 22 17 7M9 16V8m0 8h8"/>',
 'cloud':'<path d="M5 20C-3 18-1 9 6 9 7-1 21 1 21 10c8 2 4 11 0 10z"/>',
 'laptop':'<path d="M4 2h16v15H4zM1 21l3-4h16l3 4zM8 6h8M8 10h6"/>',
 'phone':'<rect x="6" y="1" width="12" height="22" rx="2"/><path d="M10 4h4"/><circle cx="12" cy="20" r="1"/>',
 'robot':'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M12 6V2M7 12h2m6 0h2M8 17h8M1 10v6m22-6v6"/>',
 'rocket':'<path d="M8 17C5 11 10 3 20 2c0 10-6 16-12 15zM8 9H3l-2 7h7m7 1v6l7-2v-6M4 19l-2 4 5-2"/><circle cx="15" cy="7" r="2"/>',
 'coins':'<ellipse cx="8" cy="5" rx="6" ry="3"/><path d="M2 5v10c0 4 12 4 12 0V5M2 10c0 4 12 4 12 0M14 11c12-5 12 8 4 10h-4"/>',
 'cart':'<path d="M1 2h3l4 15h12l3-12H5M8 20h1m10 0h1"/>',
 'factory':'<path d="M2 22V10l7-6v7l7-6v6h6v11zM18 11V2h4v9M6 16h3m4 0h3m2 0h2"/>',
 'truck':'<rect x="1" y="5" width="13" height="13"/><path d="M14 10h5l4 5v3h-9M17 10v5h6"/><circle cx="6" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>',
 'sliders':'<path d="M2 6h20M2 12h20M2 18h20"/><rect x="5" y="3" width="4" height="6"/><rect x="14" y="9" width="4" height="6"/><rect x="8" y="15" width="4" height="6"/>',
 'ruler':'<path d="m1 17 16-16 6 6L7 23zM6 12l3 3m1-7 3 3m1-7 3 3"/>',
 'crop':'<path d="M6 1v17h17M1 6h17v17M10 6h8v8"/>',
 'loop':'<path d="M12 12C-5-5-5 29 12 12c17-17 17 17 0 0z"/>',
 'battery':'<rect x="1" y="6" width="20" height="12" rx="1"/><path d="M21 10h2v4h-2M5 10v4m4-4v4m4-4v4m4-4v4"/>',
 'key':'<circle cx="7" cy="7" r="5"/><path d="m11 11 11 11m-7-7 3-3m0 6 3-3"/>',
 'pin':'<path d="M12 23C-6 8 7-5 12 2c5-7 18 6 0 21z"/><circle cx="12" cy="9" r="3"/>',
 'funnel':'<path d="M1 2h22l-8 10v8l-6 3V12z"/>',
 'map':'<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3zM8 2v17m8-14v17"/>',
 'chart-pie':'<path d="M12 2v10h10c0 13-20 13-20 0 0-6 4-10 10-10zM15 2c4 0 7 3 7 7h-7z"/>',
 'bars':'<path d="M2 22V14h5v8m3 0V8h5v14m3 0V2h5v20"/>',
 'table':'<rect x="2" y="3" width="20" height="18" rx="1"/><path d="M2 9h20M2 15h20M8 3v18"/>',
 'terminal':'<rect x="1" y="3" width="22" height="18" rx="2"/><path d="m5 8 4 4-4 4m7 0h7"/>',
 'cube':'<path d="m12 2 10 5v10l-10 5-10-5V7zM2 7l10 5 10-5m-10 5v10"/>',
}

# Each row is concept-id : label : semantic marker. No aliases or recolors.
ICON_FAMILIES = {
 'learning':('book','Aprendizaje','reading:Lectura:eye|guided-practice:Práctica guiada:pen|lesson:Lección:board|class:Clase:people|teacher:Docente:person|schedule:Horario:calendar|curriculum:Currículo:layers|graduation:Graduación:cap|inquiry:Pregunta de aprendizaje:question|understanding:Comprensión:bulb|recall:Recuperación:refresh|mastery:Dominio:check|milestone:Hito:flag|transfer:Transferencia:arrow|excellence:Excelencia:star|motivation:Motivación:heart'),
 'cognition':('brain','Pensamiento','attention:Atención:eye|memory:Memoria:database|hypothesis:Hipótesis:question|insight:Comprensión súbita:bulb|reflection:Reflexión:refresh|reasoning:Razonamiento:gear|connection:Conexión:link|abstraction:Abstracción:layers|analysis:Análisis:search|synthesis:Síntesis:merge|imagination:Imaginación:palette|bias:Sesgo:warning|empathy:Empatía:heart|focus:Foco:target|metacognition:Metacognición:compass|mental-model:Modelo mental:cube'),
 'communication':('speech','Comunicación','message:Mensaje:document|listening:Escucha:ear|dialogue:Diálogo:people|presentation:Presentación:board|storytelling:Relato:book|question:Consulta:question|answer:Respuesta:check|feedback:Retroalimentación:refresh|announcement:Anuncio:flag|translation:Traducción:globe|clarity:Claridad:bulb|channel:Canal:phone|agreement:Acuerdo:link|privacy:Comunicación privada:lock|tone:Tono:sliders|call-to-action:Llamado a la acción:arrow'),
 'collaboration':('people','Colaboración','team:Equipo:person|roles:Roles:briefcase|handoff:Entrega entre roles:arrow|co-creation:Cocreación:palette|peer-review:Revisión entre pares:eye|consensus:Consenso:check|shared-goal:Objetivo compartido:target|shared-plan:Plan compartido:calendar|conflict:Conflicto:warning|mediation:Mediación:balance|community:Comunidad:globe|mentoring:Mentoría:cap|support:Apoyo:heart|coordination:Coordinación:gear|network:Red:link|partnership:Alianza:puzzle'),
 'planning':('calendar','Planificación','agenda:Agenda:document|deadline:Fecha límite:clock|priority:Prioridad:star|roadmap:Hoja de ruta:map|milestones:Hitos de planificación:flag|dependency:Dependencia:link|capacity:Capacidad:battery|iteration:Iteración:refresh|scope:Alcance:crop|objective:Objetivo:target|backlog:Trabajo pendiente:layers|resource:Recurso:briefcase|risk:Riesgo previsto:warning|appointment:Cita:person|decision-date:Fecha de decisión:balance|launch:Lanzamiento:rocket'),
 'research':('flask','Investigación','experiment:Experimento:play|observation:Observación:eye|research-question:Pregunta de investigación:question|protocol:Protocolo:document|sample:Muestra:people|measurement:Medición:ruler|variable:Variable:sliders|control:Control:lock|replication:Réplica:refresh|finding:Hallazgo:search|validation:Validación:check|model:Modelo:cube|trial:Prueba comparativa:balance|source:Fuente:book|discovery:Descubrimiento:bulb|limitation:Límite de investigación:warning'),
 'evidence':('clipboard','Evidencia','source:Fuente documental:book|provenance:Procedencia:link|verification:Verificación:check|citation:Cita:document|observation:Registro observado:eye|result:Resultado:chart|trace:Trazabilidad:map|receipt:Recibo:flag|hash:Integridad de archivo:key|audit:Auditoría:search|gap:Brecha de evidencia:warning|archive:Archivo:database|comparison:Comparación de evidencia:balance|review:Revisión de evidencia:person|version:Versión:layers|confidence:Confianza calibrada:sliders'),
 'technology':('chip','Tecnología','computer:Computador:laptop|mobile:Dispositivo móvil:phone|cloud:Nube:cloud|automation:Automatización:gear|ai:Asistencia de IA:robot|code:Código:code|command:Comando:terminal|storage:Almacenamiento:database|interface:Interfaz:grid|integration:Integración:link|security:Seguridad tecnológica:shield|access:Acceso:key|offline:Funcionamiento local:lock|deployment:Despliegue:rocket|configuration:Configuración:sliders|diagnostic:Diagnóstico técnico:search'),
 'process':('gear','Proceso','workflow:Flujo de trabajo:arrow|start:Inicio:play|pause:Pausa:pause|stop:Parada:stop|iteration:Ciclo de mejora:refresh|branch:Bifurcación:branch|merge:Convergencia:merge|stage:Etapa:layers|checkpoint:Control de paso:check|bottleneck:Cuello de botella:funnel|procedure:Procedimiento:document|handover:Transferencia operativa:people|exception:Excepción:warning|control:Control de proceso:sliders|continuous:Ciclo continuo:loop|finish:Finalización:flag'),
 'business':('briefcase','Negocio','value:Valor:coins|customer:Cliente:person|market:Mercado:globe|offer:Oferta:cart|strategy:Estrategia:compass|growth:Crecimiento:chart|investment:Inversión:plus|cost:Coste:minus|revenue:Ingreso:arrow|operations:Operación:factory|delivery:Entrega:truck|agreement:Acuerdo comercial:check|opportunity:Oportunidad:bulb|commercial-risk:Riesgo comercial:warning|partner:Socio:people|portfolio:Portafolio:layers'),
 'data':('database','Datos','dataset:Conjunto de datos:table|metric:Métrica:ruler|trend:Tendencia:chart|distribution:Distribución:bars|proportion:Proporción:chart-pie|filter:Filtro:funnel|query:Consulta:search|quality:Calidad de datos:check|join:Unión de datos:link|lineage:Linaje:map|pipeline:Canalización:arrow|access:Acceso a datos:key|privacy:Privacidad de datos:lock|insight:Lectura de datos:bulb|dashboard:Tablero:grid|snapshot:Instantánea:clock'),
 'design':('palette','Diseño','composition:Composición:grid|prototype:Prototipo:cube|layout:Distribución:layers|typography:Tipografía:book|color:Color:eye|proportion:Proporción visual:ruler|crop:Recorte:crop|iteration:Iteración visual:refresh|accessibility:Accesibilidad:person|interaction:Interacción:hand|pattern:Patrón:puzzle|motion:Movimiento:play|balance:Balance visual:balance|system:Sistema visual:gear|review:Revisión visual:check|direction:Dirección creativa:compass'),
 'ethics':('shield','Ética','consent:Consentimiento:hand|privacy:Privacidad:lock|fairness:Equidad:balance|transparency:Transparencia:eye|responsibility:Responsabilidad:person|rights:Derechos:key|care:Cuidado:heart|sustainability:Sostenibilidad:leaf|inclusion:Inclusión:people|evidence:Ética de evidencia:clipboard|provenance:Autoría y procedencia:link|risk:Riesgo ético:warning|review:Revisión ética:check|boundary:Límite:stop|public-interest:Interés público:globe|accountability:Rendición de cuentas:document'),
 'facilitation':('compass','Facilitación','opening:Apertura:play|framing:Encuadre:crop|instruction:Consigna:board|timebox:Bloque de tiempo:clock|discussion:Discusión:speech|grouping:Agrupación:people|participation:Participación:hand|silence:Pausa reflexiva:pause|energizer:Activación:rocket|redirect:Redirección:arrow|reveal:Revelado:eye|summary:Síntesis de sesión:merge|parking-lot:Temas pendientes:pin|debrief:Debrief:refresh|closing:Cierre de sesión:flag|next-step:Siguiente paso:target'),
 'assessment':('target','Evaluación','criterion:Criterio:ruler|rubric:Rúbrica:grid|quiz:Comprobación:question|performance:Desempeño:play|portfolio:Evidencias de logro:layers|self-assessment:Autoevaluación:person|peer-assessment:Coevaluación:people|formative:Evaluación formativa:refresh|summative:Evaluación final:flag|feedback:Feedback de logro:speech|achievement:Logro:check|progress:Progreso:chart|gap:Brecha de logro:warning|mastery:Dominio evaluado:cap|readiness:Preparación:clock|recognition:Reconocimiento:star'),
 'operations':('wrench','Operación','maintenance:Mantenimiento:gear|configuration:Ajustes:sliders|repair:Reparación:puzzle|monitor:Monitoreo:eye|incident:Incidente:warning|recovery:Recuperación:refresh|checklist:Lista operativa:clipboard|capacity:Capacidad operativa:battery|service:Servicio:person|support:Soporte:heart|queue:Cola:layers|delivery:Distribución:truck|inventory:Inventario:database|handoff:Traspaso operativo:arrow|safety:Seguridad operativa:shield|completion:Trabajo terminado:check'),
}

FAMILIES = {
 'journey':('route','Recorrido','Journey','Percurso','Parcours',['flow','start-to-finish','milestones','dependency-path','parallel-tracks','route-choice','return-loop','handoff']),
 'ladder':('layers','Progresión','Progression','Progressão','Progression',['steps','levels','scaffold','skill-stack','from-example','independence','progression','competence']),
 'cycle':('loop','Ciclo','Cycle','Ciclo','Cycle',['orbit','observe-act','plan-do-review','hypothesis-test','feedback-loop','continuous-improvement','repeat-with-evidence','learning-loop']),
 'checkpoint':('shield','Validación','Validation','Validação','Validation',['gate','entry-criteria','review-point','evidence-check','acceptance','human-decision','ready-check','release-gate']),
 'comparison':('balance','Comparación','Comparison','Comparação','Comparaison',['contrast','before-after','alternative-paths','trade-offs','claim-evidence','benefit-limit','same-different','decision-matrix']),
 'learning':('book','Aprendizaje','Learning','Aprendizagem','Apprentissage',['opening','demonstration','practice','recall','checkpoint','feedback','transfer','closing']),
 'discussion':('speech','Discusión','Discussion','Discussão','Discussion',['prompt','turn-taking','perspectives','agreement','challenge','synthesis','question-ladder','shared-insight']),
 'experiment':('flask','Experimento','Experiment','Experimento','Expérience',['hypothesis','variables','control','procedure','measurement','result','replication','interpretation']),
 'evidence':('clipboard','Evidencia','Evidence','Evidência','Preuve',['observe','source-chain','claim-proof','uncertainty','traceability','comparison','review','receipt']),
 'system':('gear','Sistema','System','Sistema','Système',['components','interfaces','dependency','bottleneck','feedback','boundaries','layers','whole-part']),
 'decision':('compass','Decisión','Decision','Decisão','Décision',['options','criteria','trade-off','evidence','threshold','choice','consequence','next-step']),
 'transformation':('rocket','Cambio','Change','Mudança','Changement',['current-desired','gap','bridge','migration','staged-change','adoption','capability','sustain']),
 'concept':('brain','Concepto','Concept','Conceito','Concept',['definition','parts','relationships','analogy','counterexample','model','classification','application']),
 'time':('clock','Tiempo','Time','Tempo','Temps',['timeline','timebox','sequence','parallel','milestones','cadence','deadline','horizon']),
 'team':('people','Equipo','Team','Equipe','Équipe',['roles','handoff','coordination','shared-goal','contribution','agreement','support','network']),
 'data':('database','Datos','Data','Dados','Données',['source-output','quality','filter','lineage','classification','aggregation','comparison','interpretation']),
 'reflection':('eye','Reflexión','Reflection','Reflexão','Réflexion',['debrief','notice','assumption','question','reframe','learning','commitment','next-experiment']),
 'strategy':('map','Estrategia','Strategy','Estratégia','Stratégie',['intent','priorities','resources','alignment','pathways','trade-offs','portfolio','review']),
 'feedback':('refresh','Retroalimentación','Feedback','Feedback','Retour',['observation','specific-example','impact','suggestion','dialogue','adjustment','follow-up','closed-loop']),
 'transfer':('link','Transferencia','Transfer','Transferência','Transfert',['new-context','similarity','adaptation','constraints','application','evidence','support','continuity']),
}
GLYPHS['route'] = '<path d="M3 21V4h8v16h10V4M17 8l4-4 3 4"/><circle cx="3" cy="21" r="2"/>'
CORE_SCENES = ['flow','steps','orbit','gate','contrast','learning-opening','learning-demonstration','learning-practice','learning-recall','learning-feedback','learning-transfer','learning-closing','evidence-observe','decision-options','team-roles','reflection-debrief']
LABELS = {
 'context':('Contexto','Context','Contexto','Contexte'), 'goal':('Objetivo','Goal','Objetivo','Objectif'),
 'action':('Acción','Action','Ação','Action'), 'evidence':('Evidencia','Evidence','Evidência','Preuve'),
 'question':('Pregunta','Question','Pergunta','Question'), 'model':('Modelo','Model','Modelo','Modèle'),
 'practice':('Práctica','Practice','Prática','Pratique'), 'transfer':('Transferencia','Transfer','Transferência','Transfert'),
 'observation':('Observación','Observation','Observação','Observation'), 'interpretation':('Interpretación','Interpretation','Interpretação','Interprétation'),
 'adjustment':('Ajuste','Adjustment','Ajuste','Ajustement'), 'review':('Revisión','Review','Revisão','Revue'),
 'option':('Opciones','Options','Opções','Options'), 'criteria':('Criterios','Criteria','Critérios','Critères'),
 'decision':('Decisión','Decision','Decisão','Décision'), 'source':('Fuente','Source','Fonte','Source'),
 'claim':('Afirmación','Claim','Afirmação','Affirmation'), 'limit':('Límite','Limit','Limite','Limite'),
 'person':('Persona','Person','Pessoa','Personne'), 'role':('Rol','Role','Papel','Rôle'),
 'handoff':('Entrega','Handoff','Entrega','Passation'), 'result':('Resultado','Result','Resultado','Résultat'),
 'hypothesis':('Hipótesis','Hypothesis','Hipótese','Hypothèse'), 'test':('Prueba','Test','Teste','Test'),
 'before':('Antes','Before','Antes','Avant'), 'after':('Después','After','Depois','Après'),
 'input':('Entrada','Input','Entrada','Entrée'), 'output':('Salida','Output','Saída','Sortie'),
 'resource':('Recursos','Resources','Recursos','Ressources'), 'support':('Apoyo','Support','Apoio','Soutien'),
 'feedback':('Feedback','Feedback','Feedback','Retour'), 'commitment':('Compromiso','Commitment','Compromisso','Engagement'),
}
NODES = {
 'learning':('question','model','practice','transfer'), 'discussion':('question','person','review','result'),
 'experiment':('hypothesis','test','observation','result'), 'evidence':('source','claim','review','limit'),
 'system':('input','action','feedback','output'), 'decision':('option','criteria','evidence','decision'),
 'transformation':('before','goal','action','after'), 'concept':('question','model','practice','result'),
 'time':('before','action','review','after'), 'team':('person','role','handoff','result'),
 'data':('source','input','review','output'), 'reflection':('observation','interpretation','adjustment','commitment'),
 'strategy':('goal','resource','action','review'), 'feedback':('observation','result','adjustment','review'),
 'transfer':('context','model','support','action'), 'checkpoint':('criteria','evidence','review','decision'),
 'comparison':('before','after','evidence','limit'), 'cycle':('observation','action','review','adjustment'),
}

def sha(data): return hashlib.sha256(data).hexdigest()
def jsonbytes(value): return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode()
def write(root, name, data):
 p=root/name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)
def localized(values): return dict(zip(('es','en','pt','fr'),values))
def icon_svg(base, marker):
 return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(3 3) scale(1.8)">'+GLYPHS[base]+'</g><circle cx="50" cy="50" r="13" fill="#ffffff" stroke="none"/><g transform="translate(40 40) scale(.83)">'+GLYPHS[marker]+'</g></svg>\n').encode()

def scene(family, variant, ident):
 motif,es,en,pt,fr,_ = FAMILIES[family]
 composition=('route','orbit','comparison','layers','matrix','fork','bridge','cycle')[variant]
 positions=[[(120,275),(350,275),(580,275),(810,275)],[(480,155),(775,300),(480,440),(185,300)],[(230,200),(230,385),(730,200),(730,385)],[(480,155),(480,245),(480,335),(480,425)],[(260,220),(700,220),(260,395),(700,395)],[(480,150),(250,305),(710,305),(480,445)],[(155,280),(370,205),(590,350),(805,280)],[(270,190),(690,190),(690,410),(270,410)]][variant]
 shapes=[]
 def add(tag,attrs,token='ink',slot=None):
  row={'tag':tag,'attrs':attrs,'token':token}
  if slot:row['slot']=slot
  shapes.append(row)
 add('text',{'x':480,'y':48,'text-anchor':'middle','font-size':28,'font-weight':700},slot='title')
 # Family-specific vector metaphor remains meaningful even without labels.
 for child in ET.fromstring('<g>'+GLYPHS[motif]+'</g>'):
  attrs=dict(child.attrib);attrs['transform']='translate(445 66) scale(2.8)';attrs['fill']='none';attrs['stroke-width']=1.3
  add(child.tag,attrs,'accent')
 if variant==1:add('ellipse',{'cx':480,'cy':300,'rx':295,'ry':150,'fill':'none','stroke-width':3},'muted')
 if variant==2:
  add('line',{'x1':480,'y1':150,'x2':480,'y2':460,'stroke-width':3},'accent')
  add('path',{'d':'M442 290h76m-18-18 18 18-18 18','fill':'none','stroke-width':4},'accent')
 if variant==3:
  for i in range(4):add('rect',{'x':150+i*32,'y':125+i*82,'width':660-i*64,'height':72,'rx':12,'fill':'none','stroke-width':2},'muted')
 if variant==4:
  add('rect',{'x':70,'y':145,'width':820,'height':345,'rx':12,'fill':'none','stroke-width':2},'muted')
  add('line',{'x1':480,'y1':145,'x2':480,'y2':490,'stroke-width':2},'muted')
  add('line',{'x1':70,'y1':315,'x2':890,'y2':315,'stroke-width':2},'muted')
 if variant==6:add('path',{'d':'M70 390Q480 0 890 390M70 390h820','fill':'none','stroke-width':5},'accent')
 edges=([(0,1),(1,2),(2,3)] if variant in (0,3,6) else [(0,1),(0,2),(1,3),(2,3)] if variant==5 else [(0,1),(1,2),(2,3),(3,0)] if variant in (1,7) else [(0,2),(1,3)] if variant==2 else [])
 for start,end in edges:
  x1,y1=positions[start];x2,y2=positions[end]
  add('line',{'x1':x1,'y1':y1,'x2':x2,'y2':y2,'stroke-width':3},'muted')
  angle=math.atan2(y2-y1,x2-x1);cx=(x1+x2)/2;cy=(y1+y2)/2
  pts=[(cx+12*math.cos(angle),cy+12*math.sin(angle)),(cx+10*math.cos(angle+2.4),cy+10*math.sin(angle+2.4)),(cx+10*math.cos(angle-2.4),cy+10*math.sin(angle-2.4))]
  add('path',{'d':'M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in pts)+'Z','stroke-width':1},'accent')
 keys=NODES.get(family,('context','goal','action','evidence'))
 slots=[{'id':'title','role':'thesis','label':localized((es,en,pt,fr)),'maxChars':66,'width':800,'maxLines':2}]
 for i,(x,y) in enumerate(positions):
  # Clear surfaces make the connecting lines stop visually behind each node.
  add('rect',{'x':x-102,'y':y-34,'width':204,'height':68,'rx':12,'stroke-width':2},'surface')
  add('rect',{'x':x-102,'y':y-34,'width':204,'height':68,'rx':12,'fill':'none','stroke-width':2},'accent' if i==3 else 'ink')
  slot='abcd'[i];add('text',{'x':x,'y':y+7,'text-anchor':'middle','font-size':24,'font-weight':600},slot=slot)
  slots.append({'id':slot,'role':keys[i],'label':localized(LABELS[keys[i]]),'maxChars':32,'width':180,'maxLines':2})
 portrait=[]
 def mobile(tag,attrs,token='ink',slot=None):
  row={'tag':tag,'attrs':attrs,'token':token}
  if slot:row['slot']=slot
  portrait.append(row)
 mobile('text',{'x':210,'y':46,'text-anchor':'middle','font-size':26,'font-weight':700},slot='title')
 for child in ET.fromstring('<g>'+GLYPHS[motif]+'</g>'):
  attrs=dict(child.attrib);attrs.update(transform='translate(187 104) scale(1.9)',fill='none');attrs['stroke-width']=1.3;mobile(child.tag,attrs,'accent')
 mobile_positions=[(210,225),(210,365),(210,505),(210,645)]
 if variant==4:
  for y in (167,447):mobile('rect',{'x':24,'y':y,'width':372,'height':256,'rx':18,'fill':'none','stroke-width':2},'muted')
 if variant==3:
  for i in range(4):mobile('rect',{'x':22+i*6,'y':161+i*138,'width':376-i*12,'height':546-i*138,'rx':18,'fill':'none','stroke-width':2},'muted')
 for start,end in edges:
  x1,y1=mobile_positions[start];x2,y2=mobile_positions[end]
  if end==start+1:
   mobile('line',{'x1':210,'y1':y1+50,'x2':210,'y2':y2-50,'stroke-width':3},'muted');cy=(y1+y2)/2
   mobile('path',{'d':f'M200 {cy-6}L210 {cy+6}L220 {cy-6}','fill':'none','stroke-width':3},'accent')
  else:
   track=12 if start%2==0 or end==0 else 408
   mobile('path',{'d':f'M{x1} {y1}H{track}V{y2}H{x2}','fill':'none','stroke-width':3},'muted')
   direction=1 if track<210 else -1
   mobile('path',{'d':f'M{track+direction*12} {y2-8}L{track+direction*24} {y2}L{track+direction*12} {y2+8}','fill':'none','stroke-width':3},'accent')
 for i,(x,y) in enumerate(mobile_positions):
  mobile('rect',{'x':40,'y':y-50,'width':340,'height':100,'rx':16,'stroke-width':2},'surface')
  mobile('rect',{'x':40,'y':y-50,'width':340,'height':100,'rx':16,'fill':'none','stroke-width':2},'accent' if i==3 else 'ink')
  mobile('text',{'x':x,'y':y+8,'text-anchor':'middle','font-size':24,'font-weight':600},slot='abcd'[i])
 mobile_slots=[{**s,'width':370 if s['id']=='title' else 310,'maxLines':3 if s['id']=='title' else 2} for s in slots]
 return {'schemaVersion':'frames-aula-scene-v1','id':ident,'viewBox':[0,0,960,540],'composition':composition,'meaning':f'{es}: {FAMILIES[family][-1][variant].replace("-"," ")}. La disposición muestra relaciones, no magnitudes.','description':f'Cuatro elementos en composición {composition}, con marcador semántico {family}.','shapes':shapes,'slots':slots,'relationships':[{'from':'abcd'[a],'to':'abcd'[b]} for a,b in edges],'portrait':{'viewBox':[0,0,420,740],'shapes':portrait,'slots':mobile_slots,'relationships':[{'from':'abcd'[a],'to':'abcd'[b]} for a,b in edges],'semanticEquivalence':'Same nodes, labels and directed relations; portrait reflows instead of shrinking.'},'motion':{'enabled':False,'kind':'none','duration':0,'loop':False},'limits':{'quantitativeScale':False,'labelMaxChars':32,'notFor':'Gráficos estadísticos o afirmaciones científicas sin evidencia.'}}

def profile(edition):
 token_source=ROOT/'brand/tokens/brand-tokens.yml'
 meto=edition=='metodologia'
 return {'schemaVersion':'frames-aula-brand-v2','edition':edition,'name':'MetodologIA' if meto else 'Tu marca','wordmark':'MetodologIA' if meto else None,'logo':None,'colors':{'ink':'#0a122a' if meto else '#152238','accent':'#8a6d00' if meto else '#334155','accentFill':'#e0b400' if meto else '#dbe4ed','canvas':'#f5f7fa' if meto else '#f8fafc','surface':'#ffffff','surfaceAlt':'#f1f5f9','muted':'#576472','textSoft':'#334155','border':'#cbd5e1'},'typography':{'heading':{'family':'Poppins' if meto else 'system-ui','weight':700,'file':'fonts/Poppins-Bold.ttf' if meto else None,'sha256':'983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c' if meto else None},'body':{'family':'Montserrat' if meto else 'system-ui','weight':400,'file':'fonts/Montserrat-VariableFont_wght.ttf' if meto else None,'sha256':'0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7' if meto else None}},'source':{'path':'brand/tokens/brand-tokens.yml','sha256':sha(token_source.read_bytes()),'scope':'MetodologIA authored tokens; neutral white-label profile is original'} ,'license':'MIT','fontLicense':'OFL-1.1','limits':['No automatic identity override in MetodologIA','No fictional logo','White text on gold is forbidden','Fonts remain OFL-1.1']}

def font_files():
 return {'fonts/Poppins-Bold.ttf':ROOT/'brand/fonts/vendor/poppins/Poppins-Bold.ttf','fonts/Montserrat-VariableFont_wght.ttf':ROOT/'brand/fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf','fonts/OFL-Poppins.txt':ROOT/'brand/fonts/vendor/poppins/OFL.txt','fonts/OFL-Montserrat.txt':ROOT/'brand/fonts/vendor/montserrat/OFL.txt'}

def library():
 files={};icons=[];scenes=[];source={'path':SOURCE,'sha256':sha(pathlib.Path(__file__).read_bytes()),'basis':'original vector composition','externalFragmentsReused':False}
 for family,(base,domain,concepts) in ICON_FAMILIES.items():
  rows=concepts.split('|');assert len(rows)==16
  for i,row in enumerate(rows):
   suffix,title,marker=row.split(':');ident=family+'-'+suffix;svg='icons/'+ident+'.svg';data=icon_svg(base,marker);files[svg]=data
   icons.append({'id':ident,'svg':svg,'sha256':sha(data),'title':title,'meaning':f'{domain}: {title.lower()}. El motivo {base} identifica el dominio y {marker} identifica la acción o el rol.','tags':[family,suffix,marker],'uses':[f'Señalar {title.lower()} en formación o presentaciones.'],'params':{'color':'Inherit currentColor from the verified brand profile','size':'Minimum 32 CSS px for the composite icon'},'limits':['Not a logo','Do not use as the only accessible label','No quantitative or scientific claim implied'],'license':'MIT','source':source,'example':{'label':title,'assetRef':{'id':ident,'kind':'icon'}},'core':i<2})
 for family,values in FAMILIES.items():
  for variant,suffix in enumerate(values[-1]):
   ident=suffix if suffix in ('flow','steps','orbit','gate','contrast') else family+'-'+suffix
   data=jsonbytes(scene(family,variant,ident));path='scenes/'+ident+'.json';files[path]=data;d=json.loads(data)
   scenes.append({'id':ident,'path':path,'sha256':sha(data),'title':d['meaning'].split('.')[0],'meaning':d['meaning'],'tags':[family,d['composition'],suffix],'uses':[f'Explicar {suffix.replace("-"," ")} mediante relaciones visibles y etiquetas editables.'],'params':{slot['id']:{'type':'localized-text','maxChars':slot['maxChars'],'role':slot['role']} for slot in d['slots']},'limits':['Four editable concept nodes, maximum 32 characters each','Title maximum 66 characters','No clipping; oversized labels must block','Not a quantitative chart'],'license':'MIT','source':source,'example':{'scene':ident,'sceneParams':{s['id']:s['label'] for s in d['slots']}},'core':ident in CORE_SCENES})
 assert len(icons)==256 and len(scenes)==160 and sum(x['core'] for x in icons)==32 and sum(x['core'] for x in scenes)==16
 assert len({x['sha256'] for x in icons})==256, 'Duplicate icon geometry'
 geometric=[sha(jsonbytes({'viewBox':json.loads(files[x['path']])['viewBox'],'shapes':json.loads(files[x['path']])['shapes']})) for x in scenes]
 assert len(set(geometric))==160, 'Duplicate scene geometry'
 catalog={'schemaVersion':'frames-aula-asset-catalog-v1','version':VERSION,'edition':'shared-geometry','icons':icons,'scenes':scenes,'compositionPolicy':'Distinct domain/action vector combinations and diagram relationships; aliases and recolors do not count.','core':{'icons':32,'scenes':16},'source':source}
 return files,catalog

def svg_preview(data,colors,portrait=False):
 diagram=data['portrait'] if portrait else data
 root=ET.Element('svg',{'xmlns':'http://www.w3.org/2000/svg','viewBox':' '.join(map(str,diagram['viewBox'])),'role':'img','aria-label':data['meaning']})
 for row in diagram['shapes']:
  attrs={k:str(v) for k,v in row['attrs'].items()};token=colors[row['token']];tag=row['tag']
  attrs.setdefault('fill',token if tag in ('rect','circle','ellipse','text') else 'none');attrs.setdefault('stroke',token if tag!='text' else 'none')
  node=ET.SubElement(root,tag,attrs)
  if row.get('slot'):
   slot=next(s for s in diagram['slots'] if s['id']==row['slot']);text=slot['label']['es'];size=int(attrs['font-size']);limit=max(10,int(slot['width']/(size*.6)))
   lines=[];current=''
   for word in text.split():
    if current and len(current)+1+len(word)>limit:lines.append(current);current=word
    else:current=(current+' '+word).strip()
   if current:lines.append(current)
   for i,line in enumerate(lines):
    span=ET.SubElement(node,'tspan',{'x':attrs['x'],'dy':str(-((len(lines)-1)*size*.6) if i==0 else size*1.2)});span.text=line
 return ET.tostring(root,encoding='utf-8')+b'\n'

def zip_files(files,dest):
 dest.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
  for name,data in sorted(files.items()):
   info=zipfile.ZipInfo(name,(2026,10,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)

def generate(dest, canonical=False, assets_dest=None):
 files,catalog=library();license_bytes=(ROOT/'03_artefactos/renderers/frames-aula/LICENSE').read_bytes()
 fonts={name:path.read_bytes() for name,path in font_files().items()}
 font_pins={'fonts/Poppins-Bold.ttf':'983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c','fonts/Montserrat-VariableFont_wght.ttf':'0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7','fonts/OFL-Poppins.txt':'6be04893d770899a015649c7aa3b582f871b272f8747a92b78b17c3e5c8b2573','fonts/OFL-Montserrat.txt':'8b7141c03fa4f8d44e6345d5d4931709290f0f67875e452e95ac1fd3a027802e'}
 for name,digest in font_pins.items():assert sha(fonts[name])==digest,'Font source hash mismatch: '+name
 notices={'schemaVersion':'frames-aula-component-notices-v1','originalOnlyScope':'icons-and-scenes','components':[{'paths':['icons/**','scenes/**'],'license':'MIT','rights':'original authored vector compositions'},{'paths':['fonts/Poppins-Bold.ttf','fonts/OFL-Poppins.txt'],'license':'OFL-1.1','source':'google/fonts@389b770410cc0b7c21c85673bfa2077420fe7f65/ofl/poppins','sha256':sha(fonts['fonts/Poppins-Bold.ttf'])},{'paths':['fonts/Montserrat-VariableFont_wght.ttf','fonts/OFL-Montserrat.txt'],'license':'OFL-1.1','source':'google/fonts@389b770410cc0b7c21c85673bfa2077420fe7f65/ofl/montserrat','sha256':sha(fonts['fonts/Montserrat-VariableFont_wght.ttf'])}],'trademarkNotice':'File licenses do not grant trademark rights. MetodologIA wordmark remains its owner identity; neutral edition has no logo.'}
 canonical_assets=assets_dest or ASSETS
 if canonical:
  for name,data in files.items():write(canonical_assets,name,data)
  write(canonical_assets,'catalog.json',jsonbytes(catalog));write(canonical_assets,'component-notices.json',jsonbytes(notices));write(canonical_assets,'LICENSE',license_bytes)
  core={**catalog,'icons':[x for x in catalog['icons'] if x['core']],'scenes':[x for x in catalog['scenes'] if x['core']]}
  for row in core['icons']+core['scenes']:
   name=row.get('svg',row.get('path'));write(canonical_assets/'core',name,files[name])
  write(canonical_assets/'core','catalog.json',jsonbytes(core));write(canonical_assets/'core','component-notices.json',jsonbytes(notices));write(canonical_assets/'core','LICENSE',license_bytes)
  for name,data in fonts.items():write(canonical_assets/'core',name,data)
  for edition in ('metodologia','white-label'):
   data=jsonbytes(profile(edition));write(canonical_assets,'profiles/'+edition+'.json',data);write(canonical_assets/'core','profiles/'+edition+'.json',data)
 summaries=[]
 for edition,repo in [('metodologia','metodologia-aula-assets'),('white-label','white-label-aula-assets')]:
  target=dest/'public-repos'/repo;pr=profile(edition);edition_catalog={**catalog,'edition':edition}
  runtime={**files,**fonts,'catalog.json':jsonbytes(edition_catalog),'profiles/'+edition+'.json':jsonbytes(pr),'tokens/brand.json':jsonbytes(pr),'LICENSE':license_bytes,'component-notices.json':jsonbytes(notices),'README.md':('# '+repo+' '+VERSION+'\n\n256 original semantic icons and 160 original scene compositions. Core: 32 icons / 16 scenes. Selected assets compile into offline HTML. Scene text is editable through title/a/b/c/d. No numbers or research claims are animated.\n\nIcons/scenes/code MIT; fonts retain OFL-1.1 and their bundled copyright notices. `originalOnly` applies only to icons/scenes. Gallery previews ship separately. Produced examples remain RENDERED_DRAFT.\n').encode()}
  manifest={'schemaVersion':'frames-aula-asset-bank-v1','version':VERSION,'edition':edition,'license':'MIT','originalOnly':True,'originalOnlyScope':'icons-and-scenes','componentNotices':'component-notices.json','compatibility':['frames-aula-v1','frames-aula-scene-v1'],'files':{name:sha(data) for name,data in sorted(runtime.items())}}
  runtime['manifest.json']=jsonbytes(manifest)
  assert len(runtime)<=1024 and sum(map(len,runtime.values()))<=MAX_BYTES
  for name,data in runtime.items():write(target,name,data)
  archive=target/'dist'/f'{repo}-{VERSION}.zip';zip_files(runtime,archive)
  previews={};gallery=[]
  for row in catalog['scenes']:
   data=json.loads(files[row['path']]);desktop=svg_preview(data,pr['colors']);portrait=svg_preview(data,pr['colors'],True)
   previews['previews/'+row['id']+'-desktop.svg']=desktop;previews['previews/'+row['id']+'-portrait.svg']=portrait
   links='<a href="previews/'+row['id']+'-desktop.svg">Abrir escritorio</a> · <a href="previews/'+row['id']+'-portrait.svg">Abrir retrato</a>'
   gallery.append('<article><h2>'+html.escape(row['title'])+'</h2>'+desktop.decode()+'<details><summary>Variante retrato</summary>'+portrait.decode()+'</details><p>'+html.escape(row['meaning'])+'</p><code>'+row['id']+'</code><p>'+links+'</p></article>')
  for row in catalog['icons']:
   gallery.append('<article class="icon"><h2>'+html.escape(row['title'])+'</h2>'+files[row['svg']].decode()+'<p>'+html.escape(row['meaning'])+'</p><code>'+row['id']+'</code></article>')
  font_css='@font-face{font-family:Poppins;src:url(../fonts/Poppins-Bold.ttf);font-weight:700}@font-face{font-family:Montserrat;src:url(../fonts/Montserrat-VariableFont_wght.ttf);font-weight:400 700}' if edition=='metodologia' else ''
  preview_index='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+repo+' · galería</title><style>'+font_css+'body{font:16px/1.5 '+pr['typography']['body']['family']+',system-ui;color:'+pr['colors']['ink']+';background:'+pr['colors']['canvas']+';margin:24px}h1,h2{font-family:'+pr['typography']['heading']['family']+',system-ui}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px}article{background:white;padding:20px;border-radius:16px}svg{width:100%;height:auto}.icon svg{width:64px;height:64px}h2{font-size:20px}code{overflow-wrap:anywhere}summary,a{min-height:44px;display:inline-block;padding:8px 0}summary:focus-visible,a:focus-visible{outline:3px solid '+pr['colors']['accent']+';outline-offset:3px}@media(max-width:600px){body{margin:16px}article{padding:12px}}</style><h1>'+repo+' · 256 iconos / 160 escenas</h1><p>Galería original · parámetros editables · assets sin magnitudes estadísticas ni claims. No requiere servicios externos.</p><main>'+''.join(gallery)+'</main></html>'
  previews['index.html']=preview_index.encode();previews['LICENSE']=license_bytes;previews['README.md']=('Gallery previews are original MIT vector compositions. Extract this archive alongside the matching runtime bank: it creates gallery/ and never replaces the runtime manifest. MetodologIA gallery reads the OFL fonts already present in ../fonts; font files and copyright notices remain in the runtime bank. No network is required. Preview variants do not count as additional scenes.\n').encode()
  preview_manifest={'version':VERSION,'runtimeArchiveSha256':sha(archive.read_bytes()),'previewScenes':160,'previewVariants':320,'fontSource':'Matching runtime bank ../fonts (OFL-1.1)','files':{name:sha(data) for name,data in previews.items()}};previews['manifest.json']=jsonbytes(preview_manifest)
  # Only remove obsolete names from this generator's own 1.1.0 staging tree.
  for row in catalog['scenes']:
   old_preview=target/'gallery/previews'/(row['id']+'.svg')
   if old_preview.is_file() and not old_preview.is_symlink():old_preview.unlink()
  previous=target/'gallery/manifest.json'
  if previous.is_file():
   old=json.loads(previous.read_text())
   if old.get('version')==VERSION:
    for name in set(old.get('files',{}))-set(previews):
     p=target/'gallery'/name
     if p.is_file() and p.resolve().is_relative_to((target/'gallery').resolve()) and sha(p.read_bytes())==old['files'][name]:p.unlink()
  for name,data in previews.items():write(target/'gallery',name,data)
  gallery_zip=target/'dist'/f'{repo}-{VERSION}-gallery.zip';zip_files({'gallery/'+name:data for name,data in previews.items()},gallery_zip)
  summary={'edition':edition,'repository':repo,'version':VERSION,'archive':'dist/'+archive.name,'sha256':sha(archive.read_bytes()),'manifestSha256':sha(runtime['manifest.json']),'catalogSha256':sha(runtime['catalog.json']),'files':len(runtime),'uncompressedBytes':sum(map(len,runtime.values())),'icons':256,'scenes':160,'galleryArchiveSha256':sha(gallery_zip.read_bytes())}
  write(target,'release.json',jsonbytes(summary));write(target,'SHA256SUMS',(summary['sha256']+'  dist/'+archive.name+'\n'+summary['galleryArchiveSha256']+'  dist/'+gallery_zip.name+'\n').encode());summaries.append(summary)
 pins={}
 for row in summaries:
  owner='JaviMetodologIA' if row['edition']=='metodologia' else 'JaviMontano';repository=f'https://github.com/{owner}/{row["repository"]}'
  pins[row['edition']]={'repository':repository,'tag':'v'+VERSION,'archive':repository+'/releases/download/v'+VERSION+'/'+pathlib.PurePosixPath(row['archive']).name,'sha256':row['sha256'],'manifestSha256':row['manifestSha256'],'optional':True,'networkRuntimeRequired':False}
 if canonical:write(canonical_assets,'bank-pins.json',jsonbytes(pins))
 write(dest,'asset-release-summary.json',jsonbytes({'version':VERSION,'banks':summaries}));return summaries

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--dest',required=True);parser.add_argument('--canonical',action='store_true');parser.add_argument('--check',action='store_true');a=parser.parse_args()
 if a.check:
  with tempfile.TemporaryDirectory() as temporary:
   expected_assets=pathlib.Path(temporary)/'canonical-assets'
   generate(pathlib.Path(temporary),a.canonical,expected_assets);assert json.loads((pathlib.Path(a.dest)/'asset-release-summary.json').read_text())['version']==VERSION
   for name in ('metodologia-aula-assets','white-label-aula-assets'):
    expected=pathlib.Path(temporary)/'public-repos'/name;actual=pathlib.Path(a.dest)/'public-repos'/name
    for p in expected.rglob('*'):
     if p.is_file():assert p.read_bytes()==(actual/p.relative_to(expected)).read_bytes(),p.name
   if a.canonical:
    for p in expected_assets.rglob('*'):
     if p.is_file():assert p.read_bytes()==(ASSETS/p.relative_to(expected_assets)).read_bytes(),p.name
  print('PASS deterministic asset banks');return
 print(json.dumps(generate(pathlib.Path(a.dest).resolve(),a.canonical),ensure_ascii=False))
if __name__=='__main__':main()
