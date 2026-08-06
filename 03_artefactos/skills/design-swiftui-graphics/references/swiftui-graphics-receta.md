# SwiftUI Graphics — receta (Canvas, Path, Shape, gradientes, filtros, TimelineView, visualEffect, Metal shaders, Do Not)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## Canvas — dibujo vectorial nativo

API imperativa. Paths, gradientes, texto, blend modes sin salir de SwiftUI.
`Canvas` re-ejecuta su closure cuando el estado ancestro cambia; aíslalo con
`TimelineView` o `EquatableView` si el dibujo es costoso.

```swift
struct OndaField: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let base = Y(color: .blue, lineWidth: 2)
                var path = Path()
                path.move(to: CGPoint(x: 0, y: size.height / 2))
                for x in stride(from: 0, to: size.width, by: 4) {
                    let phase = sin(x / 40 + t)
                    path.addLine(to: CGPoint(x: x, y: size.height / 2 + phase * 40))
                }
                context.stroke(path, with: base, style: StrokeStyle(lineWidth: 2))
            }
        }
    }
}

typealias Y = GraphicsContext.Shading
```

`Canvas` ofrece `addRect`, `addEllipse`, `addLine`, `addQuadCurve`, `addCurve`,
`addRoundedRect`, `addEllipse(in:)`. Usa `context.fill(path, with:)`,
`context.stroke(path, with:style:)`. Para gradientes en stroke:
`GraphicsContext.Shading.linearGradient`, `.radialGradient`, `.angularGradient`
con `Gradient(stops:)`.

## Path custom — geometría declarativa

```swift
let star = Path { p in
    p.move(to: CGPoint(x: 50, y: 0))
    p.addLine(to: CGPoint(x: 61, y: 35))
    p.addLine(to: CGPoint(x: 98, y: 35))
    p.addLine(to: CGPoint(x: 68, y: 57))
    p.addLine(to: CGPoint(x: 79, y: 91))
    p.addLine(to: CGPoint(x: 50, y: 70))
    p.addLine(to: CGPoint(x: 21, y: 91))
    p.addLine(to: CGPoint(x: 32, y: 57))
    p.addLine(to: CGPoint(x: 2, y: 35))
    p.addLine(to: CGPoint(x: 39, y: 35))
    p.closeSubpath()
}
// stroke con dash y estilo multilinea
star.stroke(style: StrokeStyle(lineWidth: 2, dash: [4, 3]))
```

Curvas: `addQuadCurve(to:control:)` para Bézier cuadrática,
`addCurve(to:control1:control2:)` para cúbica. `StrokeStyle` admite `lineWidth`,
`lineCap`, `lineJoin`, `dash`, `miterLimit`, `lineWidth`.

## Shapes — struct reutilizable

```swift
struct ArcGauge: Shape {
    var progress: Double
    var animatableData: Double { get { progress } set { progress = newValue } }

    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.addArc(center: CGPoint(x: rect.midX, y: rect.midY),
                 radius: min(rect.width, rect.height) / 2,
                 startAngle: .degrees(0),
                 endAngle: .degrees(360 * progress),
                 clockwise: false)
        return p
    }
}
// uso
ArcGauge(progress: 0.75)
    .stroke(.angularGradient, style: StrokeStyle(lineWidth: 12, lineCap: .round))
```

`AnimatableData` habilita interpolación SwiftUI: anima el `progress` con
`.animation(.spring(), value: progress)`.

## Gradientes — linear, radial, angular con stops

```swift
LinearGradient(
    stops: [
        .init(color: .indigo, location: 0.0),
        .init(color: .pink,   location: 0.5),
        .init(color: .orange, location: 1.0)
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)

RadialGradient(
    colors: [.white, .black],
    center: .center,
    startRadius: 0,
    endRadius: 200
)

AngularGradient(
    colors: [.red, .yellow, .green, .blue, .red],
    center: .center
)
```

Regla: stops con `location` explícita para control fino; `Gradient(colors:)`
distribuye uniforme. Muchos stops sin optimizar cuesta fill; precomputa el
`Gradient` fuera del subárbol animado.

## Filtros y compositing

```swift
content
    .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
    .blur(radius: 2)
    .saturation(1.4)
    .colorInvert()           // sólo cuando invierte semántica de color
    .compositingGroup()     // agrupa capas antes del blend
    .blendMode(.overlay)
    .opacity(0.9)
```

`.compositingGroup()` rasteriza el subárbol antes del blend mode — necesario para
que el blend aplique sobre el grupo, no sobre el fondo subyacente. Sin él,
`.overlay`/`.multiply` mezclan con todo lo de atrás.

## TimelineView — animación frame-by-frame

```swift
TimelineView(.animation) { timeline in
    Canvas { context, size in
        let t = timeline.date.timeIntervalSinceReferenceDate
        // dibujo conducido por t — nunca uses Date() aquí
    }
}

TimelineView(.periodic(from: timeline.date, by: 0.1)) { timeline in
    SparkleField(phase: timeline.date.timeIntervalSinceReferenceDate)
}
```

`.animation` re-dibuja al refresh rate de pantalla. `.periodic(minimumInterval:)`
reduce frecuencia para ahorrar batería. Usa `timeline.date` como fuente única de
tiempo — nunca llames a reloj del sistema dentro de la closure.

## `.visualEffect` (iOS 17+) — geometry sin GeometryReader

```swift
ScrollView {
    LazyVStack(spacing: 16) {
        ForEach(items) { item in
            CardView(item: item)
                .visualEffect { content, proxy in
                    let y = proxy.frame(in: .scrollView).minY
                    let scale = max(0.85, min(1.0, y / 600 + 0.85))
                    return content.scaleEffect(scale).opacity(scale)
                }
        }
    }
}
```

`.visualEffect` es sólo visual: la geometry es de solo lectura y no puede
disparar state updates. No escribas `@State` dentro de la closure.

## Metal shaders acoplados a SwiftUI (iOS 17+)

Tres slots, distintos datos recibidos:

| Modificador         | Recibe              | Devuelve                                         | Coste             |
| ------------------- | ------------------- | ------------------------------------------------ | ----------------- |
| `.colorEffect`      | `(position, color)` | color transformado                               | bajo — sin vecino |
| `.distortionEffect` | `(position)`        | nueva posición de sampleo                        | medio — sampleo   |
| `.layerEffect`      | `(position, Layer)` | color final, puede samplear en `maxSampleOffset` | alto              |

```swift
Image("card")
    .resizable().scaledToFit()
    .colorEffect(ShaderLibrary.holographic(.float(elapsed)))
```

```metal
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

[[ stitchable ]]
half4 holographic(float2 position, half4 color, float time) {
    float n = position.x * 0.01 + position.y * 0.005 + time * 0.3;
    half3 rainbow = half3(
        sin(n * 2.0) * 0.5 + 0.5,
        sin(n * 2.0 + 2.094) * 0.5 + 0.5,
        sin(n * 2.0 + 4.188) * 0.5 + 0.5
    );
    half lum = dot(color.rgb, half3(0.299, 0.587, 0.114));
    return half4(mix(color.rgb, rainbow * lum * 2.0, 0.5), color.a);
}
```

`[[ stitchable ]]` expone la función al runtime de SwiftUI.
`ShaderLibrary.<nombre>(args)` enlaza desde Swift; argumentos como `.float`,
`.float2`, `.color`, `.image`. iOS 17+ únicamente — para targets menores,
fallback a gradientes, blur o Canvas.

Regla: `elapsed` viene de `timeline.date.timeIntervalSinceReferenceDate` vía
`TimelineView(.animation)` — nunca de reloj autónomo.

## Do Not

| Anti-patrón                                                             | Causa                                                              | Correcto                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Animar `.frame` (layout pass) en vez de `offset`/`scaleEffect`          | Recálculo de layout cada frame = jank; layout bloquea main thread. | `offset(y:)`, `scaleEffect`, `opacity` corren en GPU (composite-only).                      |
| `scaleEffect(0)` en salida                                              | El elemento colapsa en un agujero negro.                           | `scaleEffect(0.95)` + `opacity(0)` — mínimo visible + fundido.                              |
| Shader sin fallback para iOS <17                                        | Crashea en targets sin soporte Metal stitchable.                   | `if #available(iOS 17, *) { shader } else { gradient/blur/Canvas }`.                        |
| `Canvas` sin `accessibilityLabel` para contenido significativo          | El dibujo es invisible para VoiceOver.                             | `.accessibilityLabel("…")` y `.accessibilityAddTraits(.isImage)` cuando el Canvas comunica. |
| Gradientes con >8 stops sin optimizar                                   | Fill costoso por frame; recompute en cada layout.                  | Precomputa `Gradient(stops:)` fuera del subárbol animado; reduce stops a los necesarios.    |
| Apilar >1 `.layerEffect` en la misma vista                              | Cada uno es un render pass completo.                               | Un shader combina las ops en un solo pase.                                                  |
| `Canvas` re-dibujado en cada state change de un ancestro no relacionado | Redibuja sin intención.                                            | Aísla con `TimelineView` o `EquatableView`.                                                 |
| Colores hardcoded dentro del shader                                     | Recompila para cambiar color.                                      | Pasa colores desde Swift vía `.color(arg)`.                                                 |