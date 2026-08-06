---
name: design-canvas-generative
description: This skill should be used when the operator requests algorithmic or generative art with HTML Canvas 2D — particles, flow fields, noise, fractals, L-systems, particle pools, double buffer trails, or DPR-aware canvas rendering. It delivers prose guidance and pseudocode snippets for local evaluation only; it never executes canvas code, runs a browser, or auto-launches build tooling.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Canvas Generative — arte algorítmico con Canvas 2D

Derivada de genjutsu/_jutsu/canvas-generative/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El homólogo MetodologIA adapta el principio — arte generativo y algorítmico con HTML Canvas 2D — en voz terse e imperativa, sin copiar prosa vendor. Todo snippet es pseudocódigo para evaluación local; el operador confirma antes de cualquier ejecución. Sin runtime Canvas disponible, marca `coverage_gap`.

## Cuándo usar

- Arte algorítmico o generativo en HTML Canvas 2D: partículas, flow fields, ruido procedural.
- Fractales, L-systems, recursive tree drawing, turtle graphics.
- Trails acumulativos (double buffer / offscreen canvas) que requieren fade controlado.
- Renders que deben verse nítidos en Retina/HiDPI (DPR-aware sizing).
- Loops de animación con requestAnimationFrame y delta-time acotado.
- Patrones de rendimiento: pre-asignación de partículas (pool), zero allocation en hot loop.

## Setup — DPR-aware sizing y RAF loop

### DPR-Aware Sizing

Todo canvas debe verse nítido en Retina/HiDPI. El buffer interno se dimensiona en píxeles físicos; el CSS lo escala al tamaño lógico. Omitir DPR produce blurry output.

Pseudocódigo (no ejecutar):

```text
setupCanvas(canvas, w, h):
  dpr = dispositivo.devicePixelRatio o 1
  canvas.width  = w * dpr
  canvas.height = h * dpr
  canvas.style.width  = w + "px"
  canvas.style.height = h + "px"
  ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)
  retorna ctx
```

### Resize Handler

Observar el contenedor y re-renderizar tras resize. Reconectar el observer al mutar el layout.

```text
handleResize(canvas, ctx, draw):
  ro = new ResizeObserver
  ro.on((entry) => {
    { w, h } = entry.contentRect
    dpr = dispositivo.devicePixelRatio o 1
    canvas.width  = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    draw()
  })
  ro.observe(canvas.parentElement)
  retorna () => ro.disconnect()
```

### Animation Loop (RAF)

Loop con requestAnimationFrame y delta-time acotado para evitar espiral de muerte tras un tab switch.

```text
loop(tiempo):
  dt = min((tiempo - prevTime) / 1000, 0.1)   // cap delta
  prevTime = tiempo
  update(dt)
  render(ctx)
  animId = requestAnimationFrame(loop)

// start: animId = requestAnimationFrame(loop)
// stop:  cancelAnimationFrame(animId)
```

## Noise — Perlin / Simplex / Worley

| Tipo    | Características                            | Mejor para                                        |
| ------- | ------------------------------------------ | ------------------------------------------------- |
| Perlin  | Suave, bias de grid, más barato            | Terreno, nubes, texturas orgánicas suaves         |
| Simplex | Sin artefactos de grid, mejores gradientes | Flow fields, movimiento orgánico, tiling seamless |
| Worley  | Distancia al punto más cercano, celdas     | Voronoi, caustics, grietas, texturas celulares    |

Reglas de uso:

- Escalar siempre las coordenadas de entrada (dividir por `noiseScale`); coordenadas crudas producen ruido visual.
- Usar octavas (fractal Brownian motion) para detalle: sumar múltiples llamadas a noise con frecuencia creciente y amplitud decreciente.
- Sembrar el generador de ruido para reproducibilidad.

Patrón fBm (pseudocódigo):

```text
fbm(x, y, octavas=4, lacunaridad=2, ganancia=0.5):
  valor = 0; amp = 1; freq = 1; maxAmp = 0
  for i in 0..octavas:
    valor += amp * noise2D(x * freq, y * freq)
    maxAmp += amp
    amp *= ganancia
    freq *= lacunaridad
  retorna valor / maxAmp   // normaliza a [-1, 1]
```

## Particle Systems — pool pattern (sin GC pressure)

Pre-asignar un array fijo. Nunca `new` ni `splice` en runtime. El pool reutiliza slots: spawn toma el siguiente slot libre; kill intercambia con el último vivo y reduce el contador.

```text
POOL_SIZE = 10000
particles = array(POOL_SIZE) pre-asignado
aliveCount = 0

// init pool: cada slot = { x, y, vx, vy, life, maxLife, activo: false }

spawn(x, y):
  si aliveCount >= POOL_SIZE: retorna
  p = particles[aliveCount++]
  p.x = x; p.y = y
  p.vx = (rng() - 0.5) * 2       // fuente aleatoria externa, no Math.random
  p.vy = (rng() - 0.5) * 2
  p.life = 0
  p.maxLife = 60 + rng() * 60
  p.activo = true

update():
  for i in (aliveCount-1)..0:
    p = particles[i]
    p.x += p.vx; p.y += p.vy
    p.life++
    si p.life >= p.maxLife:
      particles[i] = particles[--aliveCount]
      particles[aliveCount] = p
      p.activo = false
```

## Flow Fields

Grilla de vectores angulares que dirigen partículas. Receta clásica generativa.

1. **Build grid**: dividir canvas en celdas, computar un ángulo por celda desde ruido.
2. **Lookup**: la posición de la partícula mapea a una celda; recuperar el ángulo.
3. **Steer**: aplicar el ángulo como velocidad, acumular entre frames, amortiguar para evitar velocidad runaway.

```text
cols = ceil(width / cellSize)
rows = ceil(height / cellSize)
field = Float32Array(cols * rows)

// llenar con ángulos derivados de ruido
for y in 0..rows:
  for x in 0..cols:
    field[y * cols + x] = noise2D(x * 0.05, y * 0.05) * TWO_PI

followField(p):
  col = floor(p.x / cellSize)
  row = floor(p.y / cellSize)
  si en rango:
    angulo = field[row * cols + col]
    p.vx += cos(angulo) * force
    p.vy += sin(angulo) * force
  p.vx *= 0.98   // damping
  p.vy *= 0.98
```

## Fractals & L-Systems

Un L-system codifica estructura recursiva como reescritura de strings + turtle graphics.

| Componente | Rol                                                  |
| ---------- | ---------------------------------------------------- |
| Axiom      | String inicial (p. ej. `"F"`)                        |
| Rules      | Reglas de producción (p. ej. `"F" -> "F[+F]F[-F]F"`) |
| Angle      | Ángulo de giro del turtle por `+`/`-`                |
| Iterations | Cuántas veces aplicar las reglas                     |

```text
lsystem(axiom, rules, iteraciones):
  actual = axiom
  for i in 0..iteraciones:
    actual = actual.map(c => rules[c] o c).join("")
  retorna actual

drawLSystem(ctx, commands, len, angle):
  stack = []
  for c in commands:
    según c:
      'F': lineTo(x += cos(a) * len, y += sin(a) * len)
      '+': a += angle
      '-': a -= angle
      '[': stack.push({ x, y, a })
      ']': { s = stack.pop(); x = s.x; y = s.y; a = s.a; moveTo(s.x, s.y) }
```

## Double Buffer — trails sin flicker

Renderizar a un canvas offscreen y luego blittear al visible. Elimina flicker y habilita efectos de trail con fade controlado.

```text
offscreen = createElement("canvas")
offscreen.width  = canvas.width
offscreen.height = canvas.height
offCtx = offscreen.getContext("2d")

render():
  // dibujar a offscreen
  offCtx.fillStyle = rgba(0, 0, 0, 0.05)   // trail fade
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height)
  drawParticles(offCtx)
  // blit a screen
  ctx.drawImage(offscreen, 0, 0)
```

## Do Not — 4 reglas fail-closed

1. **Nunca `clearRect` cada frame para trails.** El clearing destruye el trail. Usar un fill semi-transparente que fade el frame previo.
2. **Nunca `getImageData` dentro del animation loop.** `getImageData` hace readback desde GPU — extremadamente lento. Muestrear una vez y cachear el colorMap si es imprescindible.
3. **Siempre respetar DPR para sharpness.** Un canvas sin scaling DPR se ve blurry en Retina. Ver setup arriba.
4. **Nunca allocate en el hot loop.** Sin `new`, sin spread, sin creación de arrays dentro de `update()` o `render()`. Pre-asignar todo (pool pattern).

## Runtime boundary

Esta skill es `execution_scope: local-evaluation`. El agente entrega prosa + pseudocódigo; no ejecuta canvas, no abre navegador, no auto-lanza build tooling, no publica. Cualquier ejecución requiere confirmación explícita del operador. Sin runtime Canvas disponible, marca `coverage_gap` en vez de inferir resultado.
