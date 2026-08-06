---
name: remotion-video-production
description: This skill should be used when the user asks to "author a Remotion video spec", "turn a governed source into a motion piece", "design a beat map", "build deterministic Remotion animation", "validate Remotion audio and captions", "prepare a render review", or "handoff a Remotion draft for postproduction".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires Node 22.23.1, Remotion 4.0.494, React 19, Zod 4, local assets, and an offline-capable Chromium render profile.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-design-and-validation
---

# Remotion Video Production

Convertir una fuente gobernada en una pieza Motion reproducible. Remotion es renderer
determinista, no orquestador, memoria, evidencia ni publicador.

Tratar toda salida como `RENDERED_DRAFT`; un render exitoso no infiere `FINAL`, `HUMAN_APPROVED`,
`READY` ni `PUBLISHED`.

## Autoridad y límites

Usar Remotion `4.0.494` y Zod 4 exactamente. `remotion` y `@remotion/*` en la misma versión
exacta; rechazar rangos `^`, `~`, mezclas de versión o lockfile no congelado.

Consultar la documentación oficial de API para resolver comportamiento. Tratar el commit
`remotion-dev/skills` `62d0a68043d5adb5ff6baa1e38328855172c9d92` como referencia estructural
únicamente: licencia de contenido no resuelta, no copiar ni adaptar texto. Consultar
`LINEAGE.yaml` antes de reutilizar material externo.

Permitir evaluación local según el registro de programa; uso comercial o productivo bloqueado
hasta un veredicto legal sobre la licencia del runtime Remotion. No es asesoría legal.

## Preflight obligatorio

Verificar antes de diseñar:

1. Confirmar un `source_snapshot_id` y claims activos ligados a un hash normalizado.
2. Confirmar derechos y autoridad para el alcance solicitado.
3. Confirmar que los assets tienen hash, procedencia, derechos, MIME y dimensiones.
4. Confirmar el perfil de salida: ancho, alto, fps, duración máxima, codec, audio y safe zones.
5. Confirmar el estado de licencia del runtime y la autorización humana aplicable.
6. Detener ante `coverage_gap`; no rellenar fuentes, claims, locators ni aprobaciones.

Aceptar la fuente sintética first-party solo para validación local; su estado `active` de fixture
no es permiso de publicación.

## Flujo de producción

### 1. Resolver el contrato documental

Producir o validar, en este orden, los work products del dossier:

1. `00-source-script.md`
2. `01-video-spec.yml`
3. `02-beat-map.yml`
4. `03-visual-philosophy.md`

Esos nombres son contrato de salida: no renumerar ni sustituir. Conservar IDs de fuente y claim
en cada decisión material. No crear esos archivos fuera del writer autorizado.

### 2. Diseñar antes de componer

Derivar el guion únicamente de claims utilizables. Definir objetivo, audiencia, formato,
duración, mensajes permitidos/prohibidos y CTA autorizado. Convertirlo en beats con rangos
de frame enteros, propósito, contenido, transición, audio, caption y criterio de aceptación.

Definir una filosofía visual verificable: color, tipografía, densidad, ritmo, jerarquía,
contraste, safe zones y límites de movimiento. Evitar adjetivos sin prueba operativa.

### 3. Validar props y metadatos

Definir props con Zod 4 como única fuente de verdad tipada. Usar `calculateMetadata()` para
duración, dimensiones u otros metadatos dependientes de props; mantener el resultado
JSON-serializable, acotado y abortable. Rechazar metadata que dependa de hora local, red no fijada
o estado mutable.

Usar `staticFile()` para assets del directorio estático. Resolver assets antes del render y negar
red durante el render; no aceptar URLs remotas, rutas absolutas ni fonts descargadas en tiempo de
render.

### 4. Componer con reloj de frames

Derivar toda animación de `useCurrentFrame()` y `useVideoConfig()`. Frames como enteros
indexados desde cero; `useCurrentFrame()` dentro de una `Sequence` devuelve el frame local.

Usar `interpolate()` con `extrapolateLeft: 'clamp'` y `extrapolateRight: 'clamp'` para valores
acotados. Usar `spring()` solo para movimiento físicamente motivado y fijar su configuración.
Evitar CSS animations, transitions, keyframes, timers y tickers autónomos.

Calcular la duración de `TransitionSeries` restando el solapamiento de transiciones. Mantener
cada `TransitionSeries.Transition` como hijo directo de `TransitionSeries`. Probar frames de borde
`T-1`, `T` y `T+1`.

### 5. Renderizar y revisar

Ejecutar primero stills de revisión y un smoke render corto, luego un render completo de baja
resolución para comprobar timeline, audio y captions; solo después ejecutar el perfil de entrega.

Comparar determinismo sobre píxeles y PCM decodificados bajo el mismo perfil fijado; no exigir
igualdad byte-a-byte del contenedor entre hosts. Registrar el SHA-256 del archivo como identidad
del receipt.

Reproducir el video completo. Validar primeros/últimos frames, cortes, transiciones, overflow,
safe zones, captions, legibilidad, clipping, silencio y sincronía A/V.

## Router de módulos

Cargar solo el módulo necesario y volver al flujo para los gates:

| Módulo                         | Cargar cuando se necesite                                  |
| ------------------------------ | ---------------------------------------------------------- |
| `video-spec-authoring`         | Redactar/validar `01-video-spec.yml`.                      |
| `beat-map-design`              | Beats y rangos de frames.                                  |
| `motion-art-direction`         | Filosofía visual y límites de movimiento.                  |
| `compositions-and-metadata`    | Props, Zod 4 y `calculateMetadata()`.                      |
| `deterministic-animation`      | Animación frame-driven; revisar APIs prohibidas.           |
| `keyframe-pose-contract`       | Contrato de poses: sujetos, estados visibles, seek-safe.   |
| `timing-and-transitions`       | Secuenciar escenas y solapamientos.                        |
| `assets-and-rights`            | Assets, hashes, licencias y `staticFile()`.                |
| `audio-and-captions`           | Mezcla, sincronía y captions accesibles.                   |
| `charts-and-data-storytelling` | Datos gobernados en narrativa visual.                      |
| `gsap-integration`             | GSAP solo tras ADR y pin exacto.                           |
| `three-and-r3f`                | 3D determinista y render headless.                         |
| `lottie`                       | Animaciones Lottie, expresiones y assets.                   |
| `rendering-and-review`         | Smoke/full render y QA humano/técnico.                     |
| `postproduction-handoff`       | Hashes, cambios permitidos y trazabilidad.                |
| `edge-cases`                   | Bordes, inputs hostiles y fallos esperados.                |

## APIs y comportamientos prohibidos

Rechazar en código de render:

- `Math.random()`, `random(null)`, `Date.now()`, `new Date()` y `performance.now()`.
- `setTimeout()`, `setInterval()` y `requestAnimationFrame()`.
- `fetch()` o cualquier carga de red durante render.
- CSS `animation`, `transition` o `@keyframes`.
- `gsap.ticker`, transiciones D3 y `useFrame()` de R3F.
- Mutación global, lectura de timezone/locale no fijado o selección no determinista de assets.

Usar semillas explícitas para cualquier aleatoriedad; materializar el resultado como dato de props
cuando afecte narrativa o aprobación.

## Contrato de entrada, salida y error

Validar entradas con `schemas/render-input.schema.json`: IDs portables, hashes SHA-256, perfil de
render, props, assets y licencia. Rechazar inputs que pidan `READY` o publicación.

Validar resultados con `schemas/render-output.schema.json`. Emitir:

- `status: RENDERED_DRAFT`.
- ruta media relativa portable con `/`; rechazar `..`, `.`, segmentos vacíos, backslashes,
  `file://` y rutas absolutas.
- perfil y duración producidos.
- SHA-256 del archivo y digests de frames/audio.
- referencias a logs y receipts portables.
- gaps, revisión humana pendiente y licencia.

Validar fallos con `schemas/render-error.schema.json`: código estable, fase, mensaje sanitizado,
retryability, gaps y evidencia portable. No incluir stack traces con rutas locales, tokens,
locators o contenido restringido.

## Stop rules

Detener sin renderizar cuando ocurra cualquiera:

- fuente/claim/asset/manifest sin hash válido;
- derechos/autoridad desconocidos para el alcance;
- licencia de runtime insuficiente;
- versión Remotion desalineada;
- asset remoto, font no vendorizada o red;
- API prohibida o timeline inválido;
- caption fuera de duración, audio faltante obligatorio o clipping material;
- aprobación obsoleta vs hash actual;
- producer, verifier y Guardian sin separación;
- output que exponga secretos, PII, locators o rutas privadas.

Emitir `coverage_gap` y el próximo gate comprobable. No degradar silenciosamente una animación ni
sustituir una fuente.

## Checks

Ejecutar desde la raíz:

```bash
node skills/remotion-video-production/scripts/check-skill.mjs
node skills/remotion-video-production/scripts/check-contracts.mjs
node skills/remotion-video-production/scripts/check-sources.mjs
node skills/remotion-video-production/scripts/check-example.mjs
```

Exigir PASS de los cuatro validadores antes de registrar una nueva versión.

## Recursos

- `licenses/LicenseRef-MetodologIA-Internal.md` y `licenses/content-license-receipt.yml`:
  licencia del contenido local.
- `licenses/runtime-license-verdict.yml` y su receipt hash-bound antes de superar evaluación
  local.
- `CHANGELOG.md` antes de aceptar un hash nuevo.
- `fixtures/positive/` y `fixtures/negative/` para regresión.
- `examples/minimal-deterministic/` como prueba mínima de integración.
