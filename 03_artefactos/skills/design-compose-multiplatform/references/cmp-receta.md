# Compose Multiplatform — receta (project structure, expect/actual, density, interop, gotchas, anti-patterns, perf)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## Estructura de proyecto — commonMain 80-95%

```
composeApp/
├── src/
│   ├── commonMain/        ← Compose compartido (mayoría del app)
│   │   └── kotlin/
│   ├── androidMain/       ← Android (Activity, Context)
│   ├── iosMain/           ← iOS (UIKit/UIView interop)
│   ├── desktopMain/      ← JVM desktop (java.awt/swing si hace falta)
│   └── wasmJsMain/       ← Wasm web target
├── build.gradle.kts
iosApp/                    ← Xcode project que consume el framework generado
androidApp/                ← Android Application module (a veces merge en composeApp)
```

Regla de oro: `commonMain` debe retener 80-95% del código en un proyecto CMP bien
arquitectado. Si `iosMain` o `androidMain` crecen más allá de unos cientos de
líneas, probablemente se está filtrando preocupación de plataforma hacia lógica
de UI que podría quedar compartida. Mover a `commonMain` con tokens o
`expect`/`actual` tipado.

## Patrón expect/actual

El escape hatch de KMP cuando se necesita implementación distinta por target. Se
declara el contrato una vez en `commonMain`, se implementa una vez por target.

```kotlin
// commonMain
expect fun openShareSheet(text: String)

// androidMain
actual fun openShareSheet(text: String) {
    // Intent ACTION_SEND con chooser
}

// iosMain
actual fun openShareSheet(text: String) {
    // UIActivityViewController presentado desde keyWindow
}
```

`expect`/`actual` aplica a funciones top-level, clases, type aliases y
propiedades. La firma en `actual` debe matchear exacta: modificadores, valores
default, tipos. El compilador enforce el contrato; no hay reflection ni
`System.getProperty` para detectar plataforma — eso rompe en Wasm/Native.

### Composables expect/actual

Los composables siguen las mismas reglas. Útil cuando una feature necesita una
API Compose específica de plataforma (Android `RuntimeShader`, iOS `UIKitView`,
Desktop `SwingPanel`).

```kotlin
// commonMain
@Composable
expect fun PlatformBlur(modifier: Modifier = Modifier, content: @Composable () -> Unit)

// androidMain — graphicsLayer + renderEffect
// iosMain — UIKitView con UIVisualEffectView
```

Regla: `expect` composables deben ser la excepción, no la norma. La mayoría de
las diferencias de "feel" de plataforma se afinan vía tokens (colores, corner
radii, spring stiffness) en `commonMain`, no vía code paths separados.

## Density & Font handling cross-target

`LocalDensity` varía por target: Android refleja el DPI bucket del dispositivo
(1.0, 1.5, 2.0, 3.0); iOS se computa desde `UIScreen.scale` (típicamente 2.0 o
3.0 Retina); Desktop depende del screen scaling (1.0 default, 2.0 Retina,
configurable en Windows); Wasm sigue `window.devicePixelRatio`.

No hardcodear ratios `Dp`-to-pixel. Confiar en `Dp` y `LocalDensity` para la
conversión. Si se necesita un valor exacto de pixel (ej. `Canvas` draw),
convertir explícito:

```kotlin
val density = LocalDensity.current
val pxValue = with(density) { 16.dp.toPx() }
```

Evitar leer `density` dentro de loops calientes; cachear la conversión.

`LocalConfiguration.current` es **Android-only** y vive en `androidMain`. Para CMP
preferir las alternativas cross-platform en `commonMain`:
`LocalWindowInfo.current.containerSize` (IntSize), `LocalDensity.current`,
`LocalLayoutDirection.current`, `BoxWithConstraints { maxWidth; maxHeight }`.
Si se necesitan características reales del dispositivo (orientación, idiom,
modelo), envolver el acceso en `expect`/`actual` y pasar un objeto tipado como
`PlatformInfo` a la capa común.

### Fonts cross-platform vía Compose Resources

`org.jetbrains.compose.resources` es el plugin de recursos compartido. Se
depositan fuentes en `commonMain/composeResources/font/` y el plugin Gradle
genera un accessor tipado `Res`.

```
composeApp/src/commonMain/composeResources/
├── font/
│   ├── Inter-Regular.ttf
│   └── Inter-Bold.ttf
├── drawable/
│   └── logo.svg
└── values/
    ├── strings.xml          ← locale default
    └── strings.fr.xml       ← francés
```

Uso en `commonMain`:
`FontFamily(Font(Res.font.Inter_Regular), Font(Res.font.Inter_Bold))`. Mismo
patrón para `Res.drawable.logo`, `Res.string.app_name` (vía
`stringResource(...)`), `Res.file.config` (bytes vía `Res.readBytes(...)`).

No fallback a `FontFamily.SansSerif` esperando SF Pro en iOS: Compose en iOS trae
su propia cadena de fallback. Bundle SF Pro vía Compose Resources si la licencia
lo permite, o usar `UIKitView` con `UILabel` nativo para texto con system font.

## Platform interop

### iOS — SwiftUI consume el framework CMP

CMP produce un `UIViewController` que se inserta en una app SwiftUI. KMP genera
una función top-level Kotlin (comúnmente `MainViewController()` o
`ComposeUIViewController { ... }`) que retorna un `UIViewController`. Se envuelve
con `UIViewControllerRepresentable`.

```kotlin
// iosMain/kotlin/main.ios.kt
fun MainViewController(): UIViewController = ComposeUIViewController { AppContent() }
```

```swift
// iOS app target
struct ComposeContent: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        Main_iosKt.MainViewController()
    }
    func updateUIViewController(_ vc: UIViewController, context: Context) {}
}
```

El nombre Kotlin se manguea a `Main_iosKt.MainViewController()` porque el
archivo es `main.ios.kt`. Verificar los headers del framework generado si el
símbolo sorprende.

### Android — entry point directo

Sin ceremonia de interop en Android. La Activity hostea el composable común vía
`setContent { ... }`. Si se necesita pasar `Context` o `Activity` a
`commonMain`, exponerlo vía DI graph o `expect class PlatformContext` en
`commonMain` con `actual class PlatformContext(val context: Context)` en
`androidMain`.

### Embedding SwiftUI/UIKit dentro de Compose iOS (dirección inversa)

Usar `UIKitView` para un factory de `UIView`, o `UIKitViewController` para
`UIViewController`. Para vistas SwiftUI: envolver en `UIHostingController`
expuesto vía un bridge Swift `@objc`, luego llamar desde Kotlin vía headers
generados (cinterop).

### Animation cross-target

Todas las APIs de animación (`animate*AsState`, `AnimatedVisibility`,
`updateTransition`, `SharedTransitionLayout`) funcionan idénticas cross-target
en CMP 1.7+. Spring tuning escrito en `commonMain` produce la misma física en
Android e iOS. Gestures (`Modifier.draggable`, `Modifier.pointerInput`)
funcionan cross-platform con la misma surface.

Deltas a vigilar: iOS first-frame más lento (bootstrap Skia ~150-300ms cold);
Wasm puede tartamudear en primer frame (JIT warmup); pre-warmear paths
críticos o esconder motion hasta que sea interactivo.

## Gotchas — lo que NO funciona

- **Drawer state en iOS**: `ModalNavigationDrawer` swipe-to-open del leading
  edge choca con el back-swipe de iOS. Usar trigger de botón o mover el área de
  swipe 30dp+ hacia adentro.
- **`LayoutDirection.Rtl`**: Android maneja RTL nativo; iOS Compose tuvo bugs en
  1.6 (text alignment, padding inversions). Mejorado en 1.7+, pero verificar con
  strings reales en árabe/hebreo.
- **Soft keyboard en iOS**: `imePadding()` funciona en Android out-of-the-box.
  En iOS Compose 1.6+ requiere `IOSKeyboardEventListener` o un observer
  `WindowInsets` cableado vía la capa de plataforma.
- **`java.util.UUID`, `java.io.File`** y otras APIs JVM-only están prohibidas en
  `commonMain` si se ship-a a iOS o Wasm. Usar `kotlinx.uuid`, `kotlinx-io`, o
  el port multiplatform de `okio`.
- **`Color.parseHex(...)`** no existe en Compose. Usar `Color(0xFFRRGGBB)` o una
  extensión mínima.

## Anti-patrones

| Mal                                                                                   | Bien                                                                      | Por qué                                                                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Reflection o `System.getProperty("os.name")` para detectar plataforma en `commonMain` | `expect`/`actual` con objeto tipado `Platform`                            | Reflection rompe en Wasm/Native; `expect`/`actual` es el contrato que el compilador enforce    |
| Asumir que `Context` de Android es alcanzable en `commonMain`                         | Inyectar dependencia tipada vía `expect class PlatformContext` o DI scope | `Context` no existe en iOS/Desktop/Wasm; no compila para esos targets                          |
| Hardcodear colores Material que se ven bien en Android pero discordantes en iOS       | Definir design system en `commonMain`, ajustar 2-3 tokens vía `actual`    | La consistencia cross-platform es buena, pero iOS nota cuando un Material blue se siente ajeno |
| `LaunchedEffect(Unit) { while(true) { delay(16); ... } }` en `commonMain`             | `rememberInfiniteTransition()` o scopear a lifecycle events               | Loops de coroutine tight drenan batería en iOS; infinite transitions pausan cuando offscreen   |

## Performance

- **iOS first-frame**: más lento que Android (Skia bootstrap ~150-300ms cold).
  Mantener splash visible hasta la primera emisión de composición, o pre-warmear
  con un composable raíz transparente.
- **Wasm bundle size**: apuntar a <2MB comprimido. Tree-shake deps pesados,
  lazy-load pantallas secundarias vía `kotlinx.coroutines` deferred composition,
  inspeccionar el output `.wasm` en `wasmJsBrowserDistribution`.
- **Desktop**: cold start rápido en JVM; AOT vía Kotlin/Native es overkill para
  desktop salvo que se necesite un binary de archivo único.
- **Android**: mismo baseline que Jetpack Compose — perfilar con compose
  compiler stability metrics y `Layout Inspector` recomposition counts.