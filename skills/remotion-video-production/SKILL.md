---
name: remotion-video-production
description: This skill should be used when the user asks to "author a Remotion video spec", "turn a governed source into a motion piece", "design a beat map", "build deterministic Remotion animation", "validate Remotion audio and captions", "prepare a render review", or "handoff a Remotion draft for postproduction".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires Node 22.23.1, Remotion 4.0.494, React 19, Zod 4, local assets, and an offline-capable Chromium render profile.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-design-and-validation
---

# Remotion Video Production

Convertir una fuente gobernada en una pieza Motion reproducible. Mantener Remotion como renderer
determinista: no usarlo como orquestador, memoria, repositorio de evidencia ni publicador.

Tratar toda salida como `RENDERED_DRAFT`. No inferir `FINAL`, `HUMAN_APPROVED`, `READY` o
`PUBLISHED` a partir de un render exitoso.

## Autoridad y límites

Usar Remotion `4.0.494` y Zod 4 exactamente. Mantener todas las dependencias `remotion` y
`@remotion/*` en la misma versión exacta. Rechazar rangos `^`, `~`, mezclas de versión o un
lockfile no congelado.

Consultar documentación oficial de API para resolver comportamiento. Tratar
`remotion-dev/skills` commit `62d0a68043d5adb5ff6baa1e38328855172c9d92` como referencia
estructural únicamente: su licencia de contenido no está resuelta y no se debe copiar ni adaptar
texto. Consultar `LINEAGE.yaml` antes de reutilizar cualquier material externo.

Permitir evaluación local según el registro de programa. Mantener el uso comercial o productivo
bloqueado hasta obtener un veredicto legal sobre la licencia del runtime Remotion. No convertir
esta skill en asesoría legal.

## Preflight obligatorio

Verificar antes de diseñar:

1. Confirmar un `source_snapshot_id` y claims activos ligados a un hash normalizado.
2. Confirmar derechos y autoridad para el alcance solicitado.
3. Confirmar que los assets tienen hash, procedencia, derechos, MIME y dimensiones.
4. Confirmar el perfil de salida: ancho, alto, fps, duración máxima, codec, audio y safe zones.
5. Confirmar el estado de licencia del runtime y la autorización humana aplicable.
6. Detener ante `coverage_gap`; no rellenar fuentes, claims, locators, assets ni aprobaciones.

Aceptar la fuente sintética first-party únicamente para validación local. No convertir su estado
`active` de fixture en permiso de publicación.

## Flujo de producción

### 1. Resolver el contrato documental

Producir o validar, en este orden, los siguientes work products del dossier:

1. `00-source-script.md`
2. `01-video-spec.yml`
3. `02-beat-map.yml`
4. `03-visual-philosophy.md`

Tratar esos nombres como contrato de salida. No renumerar ni sustituirlos. Conservar IDs de fuente
y claim en cada decisión material. No crear esos archivos fuera del writer autorizado.

### 2. Diseñar antes de componer

Derivar el guion únicamente de claims utilizables. Definir objetivo, audiencia, formato, duración,
mensajes permitidos, mensajes prohibidos y CTA autorizado. Convertir el guion en beats con rangos
de frame enteros, propósito, contenido, transición, audio, caption y criterio de aceptación.

Definir una filosofía visual verificable: sistema de color, tipografía, densidad, ritmo, jerarquía,
contraste, safe zones y límites de movimiento. Evitar adjetivos sin prueba operativa.

### 3. Validar props y metadatos

Definir props mediante Zod 4. Mantener una única fuente de verdad tipada. Usar
`calculateMetadata()` para calcular duración, dimensiones u otros metadatos dependientes de props.
Mantener el resultado JSON-serializable, acotado y abortable. Rechazar metadata que dependa de hora
local, red no fijada o estado mutable.

Usar `staticFile()` para assets servidos desde el directorio estático. Resolver assets antes del
render y negar red durante el render. No aceptar URLs remotas, rutas absolutas ni fonts descargadas
en tiempo de render.

### 4. Componer con reloj de frames

Derivar toda animación de `useCurrentFrame()` y `useVideoConfig()`. Tratar frames como enteros
indexados desde cero. Considerar que `useCurrentFrame()` dentro de una `Sequence` devuelve el frame
local.

Usar `interpolate()` con `extrapolateLeft: 'clamp'` y `extrapolateRight: 'clamp'` cuando el valor
deba permanecer acotado. Usar `spring()` solo para movimiento físicamente motivado y fijar su
configuración. Evitar CSS animations, transitions, keyframes, timers y tickers autónomos.

Calcular la duración de `TransitionSeries` restando el solapamiento de las transiciones. Mantener
cada `TransitionSeries.Transition` como hijo directo de `TransitionSeries`. Probar frames de borde
`T-1`, `T` y `T+1`.

### 5. Renderizar y revisar

Ejecutar primero stills de revisión y un smoke render corto. Ejecutar luego un render completo de
baja resolución para comprobar timeline, audio y captions. Solo después ejecutar el perfil de
entrega.

Comparar determinismo sobre píxeles y PCM decodificados bajo el mismo perfil fijado. No exigir
igualdad byte-a-byte del contenedor entre hosts. Registrar por separado el SHA-256 del archivo como
identidad del receipt.

Reproducir el video completo. Validar primeros y últimos frames, cortes, transiciones, overflow,
safe zones, captions, legibilidad, clipping, silencio, sincronía A/V y contenido permitido.

## Router de módulos

Cargar solo el módulo necesario y volver a este flujo para los gates:

| Módulo                         | Cargar cuando se necesite                                     |
| ------------------------------ | ------------------------------------------------------------- |
| `video-spec-authoring`         | Redactar o validar `01-video-spec.yml`.                       |
| `beat-map-design`              | Convertir guion en beats y rangos de frames.                  |
| `motion-art-direction`         | Fijar filosofía visual y límites de movimiento.               |
| `compositions-and-metadata`    | Definir props, Zod 4 y `calculateMetadata()`.                 |
| `deterministic-animation`      | Implementar animación frame-driven y revisar APIs prohibidas. |
| `timing-and-transitions`       | Secuenciar escenas y calcular solapamientos.                  |
| `assets-and-rights`            | Resolver assets, hashes, licencias y `staticFile()`.          |
| `audio-and-captions`           | Diseñar mezcla, sincronía y captions accesibles.              |
| `charts-and-data-storytelling` | Convertir datos gobernados en narrativa visual.               |
| `gsap-integration`             | Evaluar GSAP solo tras ADR y pin exacto.                      |
| `three-and-r3f`                | Integrar 3D determinista y render headless.                   |
| `lottie`                       | Evaluar animaciones Lottie y sus expresiones/assets.          |
| `rendering-and-review`         | Ejecutar smoke/full render y QA humano/técnico.               |
| `postproduction-handoff`       | Entregar hashes, cambios permitidos y trazabilidad.           |
| `edge-cases`                   | Probar bordes, inputs hostiles y fallos esperados.            |

Los módulos están en `references/<module>.md`.

## APIs y comportamientos prohibidos

Rechazar en código de render:

- `Math.random()`, `random(null)`, `Date.now()`, `new Date()` y `performance.now()`.
- `setTimeout()`, `setInterval()` y `requestAnimationFrame()`.
- `fetch()` o cualquier carga de red durante render.
- CSS `animation`, `transition` o `@keyframes`.
- `gsap.ticker`, transiciones D3 y `useFrame()` de R3F.
- Mutación global, lectura de timezone/locale no fijado o selección no determinista de assets.

Usar semillas explícitas para cualquier aleatoriedad. Materializar el resultado como dato de props
cuando la elección afecte narrativa o aprobación.

## Contrato de entrada, salida y error

Validar entradas con `schemas/render-input.schema.json`. Exigir IDs portables, hashes SHA-256,
perfil de render, props, assets y estado de licencia. Rechazar inputs que pidan `READY` o
publicación.

Validar resultados con `schemas/render-output.schema.json`. Emitir:

- `status: RENDERED_DRAFT`.
- ruta media relativa portable con `/`; rechazar `..`, `.`, segmentos vacíos, backslashes,
  `file://` y rutas absolutas POSIX o Windows.
- perfil y duración realmente producidos.
- SHA-256 del archivo y digests de frames/audio normalizados.
- referencias a logs y receipts portables.
- gaps, revisión humana pendiente y estado de licencia.

Validar fallos con `schemas/render-error.schema.json`. Devolver un código estable, fase, mensaje
sanitizado, retryability, gaps y evidencia portable. No incluir stack traces con rutas locales,
tokens, locators o contenido restringido.

## Stop rules

Detener sin renderizar cuando ocurra cualquiera:

- fuente, claim, asset o manifest sin hash válido;
- derechos o autoridad desconocidos para el alcance;
- licencia de runtime insuficiente para el uso solicitado;
- versión Remotion desalineada;
- asset remoto, font no vendorizada o acceso de red;
- API prohibida o timeline inválido;
- caption fuera de duración, audio faltante cuando sea obligatorio o clipping material;
- aprobación obsoleta respecto al hash actual;
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

Exigir PASS de los cuatro validadores antes de registrar una nueva versión de la skill.

## Recursos

- Consultar `LINEAGE.yaml` para procedencia, versiones y licencias.
- Consultar `licenses/LicenseRef-MetodologIA-Internal.md` y
  `licenses/content-license-receipt.yml` para resolver la licencia del contenido local.
- Consultar `licenses/runtime-license-verdict.yml` y su receipt hash-bound antes de superar
  evaluación local.
- Consultar `CHANGELOG.md` antes de aceptar un hash nuevo.
- Consultar los 15 archivos de `references/` mediante el router anterior.
- Consultar `schemas/` para contratos portables.
- Usar `fixtures/positive/` y `fixtures/negative/` para regresión.
- Compilar `examples/minimal-deterministic/` como prueba mínima de integración.
