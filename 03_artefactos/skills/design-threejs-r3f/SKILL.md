---
name: design-threejs-r3f
description: This skill should be used when the operator requests Three.js or React Three Fiber guidance — scene setup, materials, lighting, useFrame animation loops, instancing for 10k+ objects, custom shaders, postprocessing (Bloom/Noise/Vignette), or Drei helpers. It delivers prose guidance and pseudocode snippets for local evaluation only; it never executes a WebGL render, runs a dev server, or auto-launches build tooling.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Three.js + React Three Fiber — R3F scene/material/light/shader/postprose guidance

Derivada de genjutsu/_jutsu/threejs-r3f/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El
homólogo MetodologIA adapta el conocimiento de escena 3D web (Three.js + React Three Fiber) al
contexto local-evaluation: produce prosa explicativa y snippets de pseudocódigo para evaluación
local del operador. Nunca ejecuta un render WebGL, no levanta un dev server, no instala
dependencias, no toca la red. Toda ejecución de CLI externo (vite, npm run dev, npx, build
tooling) requiere confirmación explícita del operador; por defecto se describe la capability y
se marca `coverage_gap` si falta tooling local. fail-closed: una ausencia no se sustituye por
una inferencia pulida.

## Cuándo usar

- El operador pide guía sobre Three.js vanilla o React Three Fiber (R3F).
- Setup de escena: Canvas, cámara, mesh, geometries, materiales (MeshStandard / MeshPhysical).
- Lighting rigs: ambient, directional, point, spot, hemisphere, HDRI Environment.
- Bucle de animación `useFrame` con `THREE.Clock` / `state.clock` / `state.delta`.
- Instancing para 10k+ objetos (`InstancedMesh`, `useInstancedMesh`, `Instances` de Drei).
- Shaders custom: `ShaderMaterial`, `shaderMaterial` de Drei, uniforms, GLSL vertex/fragment.
- Postprocessing: `@react-three/postprocessing` `EffectComposer`, Bloom, Noise, Vignette,
  ChromaticAberration.
- Helpers Drei: OrbitControls, Environment, ContactShadows, Float, useGLTF, useTexture.

## Cuándo NO usar

- El operador quiere ejecutar un render o levantar un dev server → requiere confirmación
  explícita; esta skill describe, no ejecuta. Marcar `coverage_gap` si no hay runtime local.
- Animación 2D / UI pura (CSS transforms, Canvas 2D) → fuera de dominio WebGL.
- El operador pide publicación o deployment → `publication_authority: false`.

## Cómo — patrones por dominio

### Scene / Camera / Mesh

La escena R3F se monta declarativamente con `<Canvas>` de `@react-three/fiber`. El `Canvas`
define cámara, DPR, flags de GL y envuelve el contenido en `<Suspense>` (los loaders GLTF,
texturas, HDRI lanzan promesas que Suspense atrapa). Mantén el componente padre del Canvas
mínimo: re-renders del padre se propagan a la escena entera. Aísla el Canvas en su propio
componente para evitar remontajes que pierden estado y recargan assets.

Pseudocódigo de setup mínimo:

```tsx
<Canvas camera={{position: [0, 2, 5], fov: 45}} dpr={[1, 2]} gl={{antialias: true}}>
  <Suspense fallback={null}>
    <Scene />
  </Suspense>
</Canvas>
```

Reglas: `dpr={[1, 2]}` clampea el pixel ratio (Retina sin derretir GPU); `alpha: false` acelera
compositing; `frameloop="demand"` solo renderiza cuando algo cambia (escenas estáticas).

Hooks R3F: `useFrame((state, delta) => {})` para lógica por frame (mutar refs, nunca setState);
`useThree()` para acceder a gl/scene/camera/size/pointer (destructure solo lo necesario);
`useLoader`/`useGLTF`/`useTexture` para cargar recursos (requieren Suspense en el ancestro).

### Materials

- `meshStandardMaterial`: PBR base (metalness, roughness, envMapIntensity). Cubre la mayoría.
- `meshPhysicalMaterial`: extensión con clearcoat, transmission, iridescence, sheen.
- `MeshTransmissionMaterial` (Drei): vidrio/cristal/líquido con refracción performante.
- Regla: sube `emissive` o `color` por encima de 1.0 para que Bloom lo detecte (Bloom es selectivo
  por defecto, `luminanceThreshold={1}` = nada brilla salvo explícito).

### Lighting

Rigs típicos: Studio (ambient + directional con sombras + fill), HDRI (`<Environment
preset="studio" />` — presets: apartment, city, dawn, forest, lobby, night, park, studio, sunset,
warehouse), Outdoor (sunset + directional sun + hemisphere), Dramatic (fondo negro, fog,
spotLight angosto, alto contraste). Sombras: `castShadow` en la luz, `shadow-mapSize` a 2048,
`receiveShadow`/`castShadow` en meshes. Cost: cada shadow-casting light añade un render pass.

### useFrame loop — THREE.Clock / state.clock / state.delta

Usa `delta` para animación framerate-independent (`meshRef.current.rotation.y += delta * 0.5`).
Usa `state.clock.elapsedTime` para efectos basados en tiempo (uniforms de shader, ondas). Para
tiempo, usa SIEMPRE `THREE.Clock` / `state.clock` / `state.delta`. Nunca `Date()` ni derivados
(wall-clock no es monotónico y rompe la loop). El token `Date()` está prohibido en esta skill.

Anti-patrones duros:

- **Nunca setState dentro de useFrame**: re-render de React 60x/segundo. Mutar refs.
- **Nunca alojar en la loop**: `new THREE.Vector3()` por frame = GC spikes = stutter. Reutiliza
  objetos vía `useMemo` y `.set()` / `.copy()`.
- **Nunca olvidar dispose**: texturas, geometrías y materiales viven en GPU; al desmontar el
  componente React NO se liberan. R3F auto-dispone con primitivas JSX; para recursos manuales,
  dispón en cleanup de `useEffect`.
- **Nunca re-renderizar el padre del Canvas**: estado en el padre fuerza remount del Canvas =
  flash, estado perdido, assets recargados. Aísla el Canvas.

### Instancing (10k+ objetos)

Para 100+ meshes idénticos (partículas, árboles, crowds), usa `InstancedMesh` /
`useInstancedMesh` (R3F) o `<Instances>` / `<Instance>` de Drei (declarativo). Una sola draw
call para miles de objetos. Setea matrices por instancia (`dummyObject3D.setMatrixAt`) y
actualiza `instanceMatrix.needsUpdate = true`. Target: <100 draw calls, <1M triángulos, 60fps
en GPU mid-range. Monitorea con `stats-gl` o `r3f-perf`.

### Shaders — ShaderMaterial / uniforms / GLSL

Patrón: declara vertex/fragment como template strings GLSL, uniforms en `useMemo` (evita
recrear objetos por render), actualiza uniforms en `useFrame` vía ref al material
(`materialRef.current.uniforms.uTime.value = state.clock.elapsedTime`). Usa `/* glsl */` tag
para highlighting. Drei ofrece `shaderMaterial(uniforms, vertex, fragment)` + `extend({Name})`
para que los uniforms se vuelvan props JSX con setters auto-generados.

Pseudocódigo:

```tsx
const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color('#ff6600') } }), [])
useFrame((state) => { materialRef.current.uniforms.uTime.value = state.clock.elapsedTime })
<mesh><planeGeometry /><shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={v} fragmentShader={f} /></mesh>
```

### Postprocessing

`@react-three/postprocessing` expone `<EffectComposer>` que mergea efectos en un solo pass
(performante por diseño). Efectos: `Bloom` (luminanceThreshold, intensity, luminanceSmoothing),
`Noise` (granulado), `Vignette` (oscurecido de bordes), `ChromaticAberration` (offset
cromático). El orden dentro de EffectComposer importa. Bloom es selectivo: levanta
`emissive`/`color` >1.0 para que brille.

### Drei helpers

| Helper                        | Uso                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| `OrbitControls`               | cámara orbital con `makeDefault`                                   |
| `Environment`                 | HDRI lighting por preset                                           |
| `ContactShadows`              | sombra de contacto suave sin shadow map                            |
| `Float`                       | animación idle flotante (speed, rotationIntensity, floatIntensity) |
| `useGLTF` / `useGLTF.preload` | cargar .glb/.gltf (devuelve nodes, materials, scene)               |
| `useTexture`                  | texturas con Suspense                                              |
| `Detailed`                    | LOD — swap geometry por distancia                                  |
| `Center`                      | auto-centrar grupo de meshes                                       |
| `PresentationControls`        | drag-to-rotate para showcases                                      |
| `Instances`                   | instancing declarativo                                             |

Performance: `dispose={null}` en `<primitive>` para recursos compartidos (evita auto-dispose);
`useGLTF` + Draco (compresión 70-90%); `useTexture` + KTX2 (texturas comprimidas 1/4 VRAM);
`frameloop="demand"` + `invalidate()` para escenas estáticas; offscreen canvas para rendering
fuera del main thread.

## fail-closed / coverage_gap

- **fail-closed**: esta skill describe capability, no ejecuta. Si el operador pide render
  WebGL, dev server, build o publicación, la skill exige confirmación explícita antes de
  cualquier CLI externo. Sin confirmación, marca `coverage_gap` y entrega solo prosa.
- **coverage_gap**: si falta tooling local (no hay runtime WebGL, no hay postprocessing
  instalado, no hay Drei), declara el gap explícitamente; no asumas ni infieras disponibilidad.
- **execution_scope: local-evaluation**: el output es guía + pseudocódigo para que el
  operador evalúe localmente. No es código ejecutable auto-lanzado.

## Quick Reference de sub-recursos del vendor

| Necesidad                                      | Referencia vendor (read-only)   |
| ---------------------------------------------- | ------------------------------- |
| Boilerplate de escena, lighting rigs, controls | `references/scene-setup.md`     |
| Patrones GLSL, uniforms, ShaderMaterial        | `references/shaders.md`         |
| Principios de animación, easing, timing        | `../motion-principles/SKILL.md` |
| GSAP + Three.js integration                    | `../gsap/SKILL.md`              |
