case: El operador pide brainstormear una feature nueva y el skill recorre las cinco fases sin auto-ejecutar commits, deploys ni invocar skills de implementacion.
context: Idea suelta para una feature de exportacion de reportes en un proyecto existente, sin diseño previo.
request: >-
Quiero agregar exportacion de reportes a PDF y CSV en el panel de analitica,
pero no tengo claro como estructurarlo. Brainstorm antes de tocar codigo.
expect:

- El skill recorre la idea fase por fase y produce un diseño en prosa.
- Explorar contexto: lee README, docs y commits recientes del panel; declara que leyo y que omitio.
- Preguntar para entender: pregunta una a la vez (proposito, restricciones, criterios de exito); confirma alcance antes de generar opciones.
- Divergente: propone dos o tres enfoques con trade-offs y recomendacion; no juzga las ideas mientras las genera; aplica YAGNI.
- Convergente: agrupa y prioriza por criterios explicitos; presenta el diseño por secciones escaladas a su complejidad; pide confirmacion tras cada seccion.
- Presentar diseño y obtener aprobacion: entrega el diseño consolidado y pide aprobacion explicita del operador.
- El skill NO auto-arranca commits, deploys, installs ni invoca skills de implementacion; entrega el diseño y espera confirmacion del operador.
