# GDN-001 — Guardian review

## Decisión

**Verdict: `REVISE_LOCAL_CLOSEOUT`.**

El paquete demuestra evidencia técnica local válida para Web y Remotion, pero no puede cerrar la
Fase 1 porque sus manifiestos de proyecto y su matriz de trazabilidad no reflejan el
`RENDER_VALIDATED` ya demostrado por recibos hash-bound. [CÓDIGO][DOC]

Esta decisión:

- no concede `SOURCE_LOCKED`;
- no concede `GUARDIAN_PASS`;
- no representa aprobación humana `H01`;
- no concede `HUMAN_APPROVED`, `READY`, release ni `PUBLISHED`;
- no autoriza conectores, distribución ni publicación. [CONFIG]

El estado gobernado permanece `BLOCKED_BEFORE_SOURCE_LOCK`. La evidencia técnica de render permanece
`RENDER_VALIDATED`, con alcance `technical_local_only_not_a_governed_transition_receipt`. [CONFIG]

## Alcance e independencia

- Revisión: `GDN-001`.
- Proyecto: `vs-001-source-to-campaign`.
- Rol: Guardian RT-11 independiente.
- Modo: read-only sobre producción; este review no remedia archivos del productor. [CONFIG]
- Baseline Git observado: `b32e766`, con implementación posterior presente en el working tree. [CÓDIGO]
- Superficie escrita por Guardian: únicamente este informe y su recibo estructurado asociado. [CÓDIGO]

## Hallazgo bloqueante

### P1 — Drift entre estado declarado y evidencia técnica

Los recibos y el manifiesto audiovisual declaran de forma consistente:

- `projects/vs-001-source-to-campaign/remotion/06-render-manifest.yml`:
  `technical_validation_state: RENDER_VALIDATED`;
- `projects/vs-001-source-to-campaign/remotion/receipts/render-output.json`:
  `technicalValidationState: RENDER_VALIDATED` y
  `stateEffect: NONE_ON_GOVERNED_WORKFLOW`;
- `receipts/renders/RCP-REMOTION-VS001-001.json`: render `succeeded`, artifact SHA-256
  `b37d3327e1a3c46fe5f0586a912f62bd831abf8faec046efe419ef238f394010`. [CÓDIGO]

Sin embargo, tres superficies de control permanecen rezagadas:

1. `registries/projects/project-registry.yml:11` declara
   `technical_validation_state: IN_PROGRESS`, y `:18` mantiene el video en
   `technical_state: IN_PROGRESS`.
2. `projects/vs-001-source-to-campaign/project.yml:4` mantiene `state: INGESTED`; sus work products
   Web y Remotion siguen en `DEFINED` en `:10` y `:13`, sin registrar los estados técnicos ya
   probados.
3. `docs/program/requirements-traceability.md:38-43` conserva R-023 y R-024 en `in_progress` y
   R-028 en `implemented_pending_final_qa`, con evidencia narrativa anterior al render y a la
   inspección AV completados. [DOC]

Esto rompe la coherencia entre recibos, registro, manifiesto de proyecto y trazabilidad. El riesgo
no es una falsa promoción gobernada —los gates siguen correctamente bloqueados— sino que un
consumidor operativo obtenga una lectura técnica contradictoria según el archivo consultado.
[INFERENCIA]

### Remediación requerida al Lead

El writer autorizado debe reconciliar las tres superficies con la evidencia
`RENDER_VALIDATED`, manteniendo explícitamente separadas:

- la validación técnica local de Web y Remotion;
- el estado gobernado `BLOCKED_BEFORE_SOURCE_LOCK`;
- los pendientes de playback humano, Guardian re-review, H01, derechos y release. [CONFIG]

La corrección no debe promover el proyecto a `SOURCE_LOCKED`, `GUARDIAN_PASS`, `HUMAN_APPROVED`,
`READY` ni `PUBLISHED`. Después de la corrección, debe ejecutarse nuevamente el check de proyectos y
solicitarse una revalidación Guardian independiente. [CONFIG]

## Evidencia técnica que sí pasa

### Repositorio y contratos

- `pnpm check:repo`: PASS; gates G01, G04, G05, G06, G07, G08 y G09 permanecen fail-closed.
  [CÓDIGO]
- `pnpm typecheck`: PASS. [CÓDIGO]
- `pnpm lint`: PASS. [CÓDIGO]
- `pnpm test`: PASS, 29 archivos y 241 pruebas. [CÓDIGO]
- `pnpm format:check`: PASS. [CÓDIGO]
- `pnpm committee:validate`: PASS; cinco propuestas, veinte evaluaciones cruzadas y decisión
  hash-bound sin razonamiento privado persistido. [CÓDIGO]
- Validadores focales de Skill Foundry y contrato NotebookLM: PASS para evaluación local.
  [CÓDIGO]

### Fuente, claims, marca y privacidad

- Corpus canónico: `0/4`; el sistema falla cerrado antes de `SOURCE_LOCKED`. [CONFIG]
- Ocho fuentes registradas; solo el fixture first-party sintético y Prompt V6 operan dentro de su
  alcance declarado. [DOC]
- Tres claims activos, trazables al fixture sintético y limitados a prueba contractual local.
  Claims de performance, resultados de cliente, comparación y promesa comercial permanecen
  bloqueados. [CONFIG]
- La identidad visible de los artefactos revisados es MetodologIA; referencias de terceros se
  limitan a procedencia técnica. [DOC]
- El scan de privacidad de la superficie versionable pasó sin secretos, PII ni locators privados.
  [CÓDIGO]

### Web

- Build receipt `RCP-WEB-VS001-BUILD-001`: output SHA-256
  `12c722ba072b71e5da56af10a6837c11890a13d17d6c3fee510fd51c65d3b7d4`, coincidente con
  `artifact/index.html`. [CÓDIGO]
- Smoke visual desktop `1440×1000` y mobile `390×844`: PASS; `lang=es`, un H1, seis H2, un
  `main`, tres referencias de fuente, sin overflow horizontal ni errores de consola. [CÓDIGO]
- Inspección visual Guardian: jerarquía, contraste, estado `RENDERED DRAFT`, límite deliberado y
  trazabilidad permanecen visibles en ambos viewports. [DOC]

### Remotion

- Review A y B: SHA-256 idéntico
  `b37d3327e1a3c46fe5f0586a912f62bd831abf8faec046efe419ef238f394010`. [CÓDIGO]
- Framemd5 normalizado A/B: byte-identical; digest de píxeles normalizados
  `d5f0cc1a5abef9e0488933cf992291d8e7fce870ece5b4219ae31b213de22898`.
  [CÓDIGO]
- ffprobe independiente: H.264, `1080×1920`, 30 fps, `1231` frames, `41.033333 s`,
  `yuv420p`, `bt709`, exactamente un stream de video. [CÓDIGO]
- Smoke: SHA-256 `e0c787e31827ff509f1ad2b421a06ef87f326beb67b3d7326ac6844a465a94f9`,
  `270×480`, 30 fps, 90 frames, 3 s y un stream de video. [CÓDIGO]
- Los 27 review shots coinciden con sus hashes declarados; SSIM mínimo registrado `0.975161`,
  superior al umbral `0.97`. [CÓDIGO]
- El postproduction ledger registra pass-through inspection sin mutación semántica de media.
  [DOC]

### n8n y ausencia de release

- Workflow n8n inactivo, dos nodos, sin credenciales, red ni publicación; operación limitada a
  dry-run/propose-only. [CONFIG]
- No existe `receipts/releases/`; el área de approvals audiovisuales contiene solo README y
  template, sin recibo H01. [CÓDIGO]
- No se observó autorización de release o publicación. [CÓDIGO]

## Coverage gaps y límites residuales

- Cuatro fuentes canónicas del programa: `0/4`. [coverage_gap]
- Binding NotebookLM live no seleccionado; no puede promover fuentes. [coverage_gap]
- Elegibilidad comercial y release/commit upstream de los binarios de fuentes tipográficas no
  resueltos. [coverage_gap]
- Prueba autoritativa Linux con network namespace y equivalencia cross-host pendientes.
  [coverage_gap]
- Playback humano completo, decisión Guardian posterior a remediación y aprobación H01 ausentes.
  [coverage_gap]
- Conectores y distribución externa no autorizados. [coverage_gap]
- La consulta de advisories de dependencias no cerró por indisponibilidad DNS del registry en el
  entorno restringido; no se infiere un PASS de seguridad de dependencias. [coverage_gap]

## Condición de revalidación

Solicitar un nuevo RT-11 cuando:

1. registro de proyectos, manifiesto de proyecto y matriz R-023/R-024/R-028 reflejen de forma
   coherente la evidencia técnica;
2. los estados gobernados continúen bloqueados y sin promoción implícita;
3. `pnpm check:repo`, el check reforzado de proyectos, format y tests pasen sobre la revisión;
4. el diff de remediación esté limitado a writers autorizados y venga acompañado de hashes
   actualizados. [CONFIG]

Hasta entonces, el cierre local de Fase 1 permanece en `REVISE_LOCAL_CLOSEOUT`. [CONFIG]
