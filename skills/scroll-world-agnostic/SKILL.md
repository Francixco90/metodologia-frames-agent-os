---
name: scroll-world-agnostic
description: This skill should be used when the user asks to "build a scroll-scrub cinematic landing page", "create an immersive scroll-through world", "make a guided visual journey", "build a scroll-driven experience", or "create a diorama-style hero". Orchestrates scroll-driven web experiences with model-agnostic adapters for image/video generation, coordinating narrative, scenes, assets, movement, continuity, assembly and validation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Scroll World Agnostic

Derivada de `scroll-world` (oso95/scroll-world, MIT). Adaptacion local
clean-room model-agnostic. Vendor reference:
`skills/vendor/scroll-world/SKILL.md` (read-only). Patron Fal AI del vendor
`skills/vendor/cinematic-scroll/SKILL.md` (read-only).

Orquesta experiencias web guiadas por scroll donde el visitante viaja a traves
de escenas conectadas. model-agnostic: ningun modelo, proveedor, API, CLI o
framework es obligatorio.

## model_agnostic: true (declaracion explicita)

El nucleo de esta skill no exige:

- un modelo especifico;
- un proveedor especifico;
- una API especifica;
- una CLI especifica;
- un framework especifico;
- credenciales especificas;
- generacion de medios obligatoria.

Las capacidades externas se representan mediante adaptadores reemplazables.

## Orden de ejecucion

```
scroll-experience-foundations
        down
cinematic-scroll-quality
        down
scroll-world-agnostic  (esta skill)
        down
validaciones
        down
uso opcional de vendors
```

## Proposito

Producir landing pages tipo "vuelo a traves del mundo" donde el scroll barre
una cadena de escenas conectadas. El nucleo detecta capacidades disponibles,
elige una estrategia compatible y consume generacion de medios mediante
adaptadores opcionales.

## Activacion

Activar cuando el usuario pide una experiencia cinematografica guiada por scroll:
"scroll-scrub world", "immersive landing page", "guided visual journey",
"diorama hero", "browse-through-the-industry".

## No activacion

No activar para CRUD, formularios, dashboards, CMS, API-only backends, o tareas
que no involucren scroll-driven motion o cinematic web.

## Estrategias soportadas

1. **Secuencia visual continua**: stills conectados por scroll.
2. **Escenas conectadas**: dive clips + connector clips con seam law.
3. **Video scrub**: pre-rendered video chain scrubbed by scroll position.
4. **Secuencia de imagenes**: fallback sin video, stills animados con CSS.
5. **WebGL**: 3D scenes (requiere adaptador opcional).
6. **DOM/CSS**: animacion pura con scroll-timeline nativo.
7. **Fallback estatico**: HTML sin JavaScript.

## Contratos de adaptadores (opcionales, reemplazables)

```
ImageProvider.generate(request) -> AssetResult
VideoProvider.generate(request) -> AssetResult
MediaInspector.inspect(asset) -> MediaMetadata
RuntimeVerifier.verify(target) -> VerificationResult
```

Cada adaptador es opcional. Si ningun adaptador esta disponible, la skill
degrada gracefully a fallback estatico o secuencia de imagenes.

### ImageProvider

```
Input: ImageRequest { prompt: string, aspectRatio?: string, resolution?: string }
Output: AssetResult { assetPath: string, format: string, sha256: string, metadata: MediaMetadata }
```

### VideoProvider

```
Input: VideoRequest { prompt: string, startImage?: string, endImage?: string, duration?: number }
Output: AssetResult { assetPath: string, format: string, sha256: string, metadata: MediaMetadata }
```

### MediaInspector

```
Input: assetPath: string
Output: MediaMetadata { width: number, height: number, duration?: number, codec?: string, fps?: number }
```

### RuntimeVerifier

```
Input: target: string (URL or path)
Output: VerificationResult { passed: boolean, checks: Check[], score?: number }
```

## Adaptadores concretos (opcionales, multi-provider)

El contrato `VideoProvider` admite cualquier proveedor. Tres adaptadores
concretos (opcionales, referencias de arquitectura vendor read-only):

- **SeedanceAdapter** — generacion de video via Seedance.
- **HiggsfieldAdapter** — generacion de video via Higgsfield.
- **FalAIAdapter** — generacion de video/imagen via fal.ai. Patron
  arquitectural del vendor `cinematic-scroll`
  (`skills/vendor/cinematic-scroll/SKILL.md`): `lib/fal-models.ts` adapta
  parametros por modelo (FLUX.2/Gemini/Imagen), `@fal-ai/server-proxy`
  mantiene `FAL_KEY` server-side, `fal.subscribe` (<=5 escenas) o
  `fal.queue.submit` + webhook (>5). Nunca exponer `FAL_KEY` en cliente.

`@fal-ai/client` es dependencia opcional/lazy del proyecto consumidor, no de
esta skill. Sin adaptadores, degradar a fallback estatico (ver Invariantes).
El seam law (frame-identico entre escenas) es provider-agnostic.

## Deteccion de capacidades

Antes de elegir estrategia, verificar:

1. Esta disponible un ImageProvider? (opcional)
2. Esta disponible un VideoProvider? (opcional)
3. Esta disponible MediaInspector (ffmpeg/ffprobe)? (opcional)
4. Esta disponible RuntimeVerifier (browser headless)? (opcional)

La eleccion de estrategia depende de las capacidades detectadas, no de
supuestos sobre el entorno.

## Procedimiento

### 1. Entrevista (agnostica)

Collectar: SUBJECT, STORY_BEATS, PALETTE, STYLE, CAMERA_STYLE, MOBILE_OPTIN.
No asumir un proveedor. Preguntar abiertamente.

### 2. Fundamentos (delegar a scroll-experience-foundations)

Asegurar narrativa, accesibilidad, performance, SEO y progressive enhancement
antes de efectos complejos.

### 3. Direccion cinematografica (delegar a cinematic-scroll-quality)

Definir tokens, storyboard, capítulos, ritmo, continuidad y quality gate.

### 4. Deteccion de capacidades

Verificar adaptadores disponibles. Elegir estrategia en base a lo detectado.

### 5. Generacion de assets (si hay adaptadores)

Si ImageProvider y/o VideoProvider estan disponibles:

- Generar stills de escenas (via ImageProvider).
- Generar clips de video (via VideoProvider) si la estrategia es video scrub.
- Aplicar seam law: conectores deben ser frame-identicos con vecinos.

Si no hay adaptadores:

- Usar assets suministrados por el usuario.
- O degradar a secuencia de imagenes / DOM-CSS / fallback estatico.

### 6. Seam law (principio agnostico, clave para continuidad)

Los conectores entre escenas deben ser frame-identicos: el end-frame del
clip A debe ser visualmente identico al start-frame del clip B. Esto es un
principio universal aplicable a cualquier generador de video, no solo a un
modelo especifico.

### 7. Encode (agnostico)

Si se procesa video, usar settings scrub-friendly (universales):

- Desktop: GOP corto, CRF moderado, faststart.
- Mobile: resolucion reducida, GOP mas corto.
  Estos settings son agnosticos del proveedor.

### 8. Ensamble

Ensamblar el motor de scroll con los assets generados o suministrados.
El motor debe ser vanilla JS (zero-dependency) o CSS scroll-timeline nativo.

### 9. QA (agnostico)

- Verificar que el scroll barre la cadena sin cortes visibles.
- Verificar `prefers-reduced-motion`.
- Verificar mobile (parallax reducido o deshabilitado).
- Verificar contenido esencial sin JavaScript.

## Invariantes

1. La skill funciona sin ningun proveedor de imagenes.
2. La skill funciona sin ningun proveedor de video.
3. La skill funciona sin navegador (analisis estatico).
4. La skill funciona sin shell (fallback estatico).
5. Una dependencia ausente produce un fallo controlado, no un crash.
6. El movimiento reducido mantiene contenido y acciones.
7. El contenido esencial permanece disponible sin JavaScript.
8. No se escriben archivos fuera del workspace.

## Manejo de errores

- Si un adaptador falla: registrar el error y degradar a fallback.
- Si un asset no se genera: registrar y continuar con assets disponibles.
- Si el navegador no esta disponible: analisis estatico solamente.
- Si el shell no esta disponible: fallback estatico HTML.

## Fallbacks

1. Sin ImageProvider: usar assets suministrados por el usuario.
2. Sin VideoProvider: secuencia de imagenes con animacion CSS.
3. Sin navegador: analisis estatico del HTML.
4. Sin shell: fallback estatico HTML sin pipeline de encode.
5. Sin adaptadores: DOM/CSS scroll animation con scroll-timeline nativo.

## Limites

- No garantiza continuidad perfecta de seams sin verificacion runtime.
- No garantiza calidad visual sin verificacion perceptual.
- La generacion de medios depende de adaptadores externos opcionales.

## Criterio de cierre

- Confirmar que la estrategia elegida es compatible con las capacidades detectadas.
- Confirmar que los fundamentos (scroll-experience-foundations) se aplicaron.
- Confirmar que la direccion cinematografica (cinematic-scroll-quality) se respeto.
- Confirmar seam law verificada (si estrategia incluye video).
- Confirmar fallbacks documentados.
- Confirmar contenido esencial accesible sin JavaScript.
- Reportar estrategia, adaptadores usados, gaps y siguiente accion.

## Atribuciones

Inspirada funcionalmente en `scroll-world` por cyw/oso95 (MIT, commit 71cc36d3).
Adaptacion local model-agnostic con contratos de adaptadores reemplazables.
