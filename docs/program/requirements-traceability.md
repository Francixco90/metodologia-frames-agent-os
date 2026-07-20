# Prompt Maestro V6 — trazabilidad de requisitos

## Autoridad y normalización

- Fuente lógica: `SRC-PROMPT-MAESTRO-V6`.
- SHA-256 del texto recibido: `19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2`.
- Clasificación: `product_requirements_authority`.
- Este documento es una vista mutable del estado actual de trazabilidad; no constituye bytes
  normalizados de la fuente ni una proyección inmutable. La autoridad portable e inmutable del
  Prompt Maestro V6 está en `inbox/first-party/SRC-PROMPT-MAESTRO-V6.projection.yml`. [CONFIG]
- Regla de cierre: `implemented` significa construido; no implica `READY`, release ni publicación.

## Matriz

| ID    | Requisito normalizado                                                                           | Estado                        | Evidencia o bloqueo                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| R-001 | Repositorio nuevo, aislado y autocontenido                                                      | implemented_local_promotion   | Clon Git limpio creado en Documents; instalación fijada y validación reproducible no produjeron drift versionado.  |
| R-002 | Una sola identidad visible: MetodologIA                                                         | implemented                   | `AGENTS.md`, checks de privacidad y artefactos Web/Motion.                                                         |
| R-003 | Núcleo compartido con Red Web y Red Contenido/Motion                                            | implemented                   | `core/`, `networks/web/`, `networks/content/`, expediente VS-001.                                                  |
| R-004 | Inbox, fuentes, proyectos, memoria, skills, comités, approvals, receipts y Guardian compartidos | implemented_with_gates        | Directorios y contratos presentes; Guardian y H01 aún sin decisión positiva.                                       |
| R-005 | n8n es adaptador opcional, no cerebro                                                           | implemented_dry_run           | Adapter v2, workflow inactivo, sin credenciales ni red.                                                            |
| R-006 | NotebookLM declara binding, pregunta, fuentes y cobertura                                       | implemented_fail_closed       | Contrato y validator cubren RT-01..RT-11 + cuatro workflows; binding live ausente conserva `coverage_gap`.         |
| R-007 | Comité material de cinco especialistas                                                          | implemented                   | Cinco propuestas, veinte revisiones cruzadas, rúbrica, dissent y síntesis P02.                                     |
| R-008 | No persistir chain-of-thought privado                                                           | implemented                   | Solo propuestas, evidencia, supuestos, scores, objeciones, decisión y lineage.                                     |
| R-009 | Registrar y clasificar fuentes Remotion iniciales                                               | partial_controlled            | Video/post/docs/repo/screenshot se conservan como referencias; corpus canónico sigue 0/4.                          |
| R-010 | Promesas promocionales nunca son benchmark                                                      | implemented                   | Claims registry usa solo fixture first-party y bloquea claims de desempeño.                                        |
| R-011 | Remotion es renderer determinista, no orquestador ni publicador                                 | implemented                   | ADR-011, renderer frame-driven y gates externos.                                                                   |
| R-012 | `RENDERED_DRAFT` no equivale a `FINAL`, `READY` o `PUBLISHED`                                   | implemented                   | Schemas, badges persistentes y tests negativos.                                                                    |
| R-013 | Skill legacy genérica en cuarentena                                                             | implemented                   | `stitch-remotion-walkthrough`, sin código externo copiado.                                                         |
| R-014 | Skill canónica con 15 módulos especializados                                                    | implemented                   | `skills/remotion-video-production/`.                                                                               |
| R-015 | Skill con lineage, licencia, schemas, fixtures, validadores y ejemplo compilable                | implemented_local_scope       | `LINEAGE.yaml` canónico, hashes, cuatro validadores y QA independiente pasan; licencia productiva sigue bloqueada. |
| R-016 | Dossier audiovisual documental completo                                                         | implemented_qa_passed         | Documentos 00–07, props, assets, captions, src, committee, approvals, 27 review shots y receipts verificados.      |
| R-017 | Video spec, beat map y component registry con campos operativos                                 | implemented_qa_passed         | Schemas, 53 pruebas focales y QA A07/A08 independiente pasan.                                                      |
| R-018 | RT-01 a RT-11 con separación producer/verifier/Guardian/H01                                     | implemented                   | Contratos y ownership; Guardian no puede remediar.                                                                 |
| R-019 | Animación gobernada por frame y metadata calculada                                              | implemented                   | `useCurrentFrame`, `useVideoConfig`, `interpolate`, clamps y `calculateMetadata`.                                  |
| R-020 | Sin reloj, red, timers, CSS animations ni aleatoriedad no fijada                                | implemented                   | Check estático y tests offline fail-closed.                                                                        |
| R-021 | Assets, fuentes, locale, timezone y versiones fijados                                           | implemented_local_scope       | Assets first-party procedurales, fonts locales, versiones exactas y hashes.                                        |
| R-022 | Estados y gates audiovisuales explícitos                                                        | implemented_fail_closed       | Máquina de estados y manifests; gates externos permanecen bloqueados.                                              |
| R-023 | Review shots reales, smoke y dos renders completos                                              | implemented_technical_local   | Smoke fresco, A/B byte-idénticos, 27 stills y contact sheet ligados por receipts.                                  |
| R-024 | QA de schema, código, visuales, streams, captions, safe zones y determinismo                    | implemented_automated_qa      | H.264/BT.709/video-only, 1231 frames, guards y SSIM pasan; playback humano sigue pendiente.                        |
| R-025 | Fixtures audiovisuales adversariales obligatorios                                               | implemented_automated_matrix  | Matriz hostil y pruebas Remotion independientes pasan; Linux namespace/cross-host siguen como gap.                 |
| R-026 | n8n recibe únicamente paquete aprobado y hash-bound                                             | implemented_fail_closed       | Ocho evidencias, H01 canónico, reintentos, callback, kill-switch y replay revalidado.                              |
| R-027 | Publicación y conectores en dry-run/propose-only                                                | implemented                   | `AUTHORIZE_RELEASE` ausente; no hay activación ni envío.                                                           |
| R-028 | Primer vertical slice Web + Motion reproducible                                                 | implemented_technical_local   | Web `BUILD_VALIDATED`; Motion `RENDER_VALIDATED`; estado gobernado sigue bloqueado.                                |
| R-029 | Evidencia sin secretos, PII ni rutas privadas                                                   | implemented_local_scan_passed | Scan de privacidad pasa sobre la superficie versionable; se repetirá en destino final.                             |
| R-030 | Cierre con archivos, decisiones, agentes, fuentes, tests, gaps, riesgos y estado                | pending_closeout              | Se completa después de Guardian y promoción.                                                                       |

## Límites de aceptación

El vertical slice puede alcanzar `RENDER_VALIDATED` como evidencia técnica local. No puede alcanzar
`SOURCE_LOCKED`, `GUARDIAN_PASS`, `HUMAN_APPROVED`, `READY` ni `PUBLISHED` mientras falten el corpus
canónico, la elegibilidad de licencia, el playback humano, el Guardian independiente o la
autorización correspondiente. [CONFIG][coverage_gap]
