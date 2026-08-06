# Stack-specifics — design system tokens + audit checklist

Stack-aware detail for Phase 3 (design system generation) and Phase 5 (audit). Load the
section matching the detected stack.

## Phase 3 — Design system files per stack

- **Web (Tailwind/CSS):** `tailwind.config.js` o `:root { --token: ... }`. Hex,
  `cubic-bezier(...)` easings, `rem` spacing.
- **Android Compose:** `Theme.kt`, `Color.kt`, `Type.kt`, `Shapes.kt`, `Motion.kt`. Color
  en `Color(0xFF...)`, motion en `MotionScheme` (M3 Expressive si el alcance lo justifica),
  spacing en `dp`.
- **SwiftUI (iOS/macOS):** `Color+App.swift`, `Font+App.swift`, `Animation+App.swift`,
  `Shape+App.swift`. Color vía `Color("AssetName")`/`Color(red:green:blue:)`, font vía
  `.system`/`.custom`, animación vía `.spring`/`.snappy`/`.bouncy`, spacing en `CGFloat`.
- **Compose Multiplatform:** tokens en `commonMain` con `expect/actual` para fonts/colores
  platform-specific. Misma estructura que Compose + desviaciones en `MASTER.md`.
- **Multi-stack:** `MASTER.md` con secciones delimitadas por stack, código por stack.

## Phase 5 — Audit per stack

**Web:** `AnimatePresence` en conditional renders; contraste ≥ 4.5:1; sin reflow,
`will-change` parsimonioso; 60fps (DevTools); sin divs clickeables sin role/button;
`aria-hidden` en decorativas; responsive 375/768/1024/1440px.

**Compose:** recomposition counts (Layout Inspector); sin animaciones en `width`/`height`
(`Modifier.graphicsLayer`); `Modifier.semantics` en custom; frame timing en mid-range.

**SwiftUI:** sin `body` recomputado en cambios irrelevantes; Hitches Instrument sin frames
dropeados; `.accessibilityLabel`/`.accessibilityHint` en interactivas; Reduce Motion ON y
Dynamic Type 200%.

**macOS (adicionales):** hover states; keyboard shortcuts (`Cmd+N/W/F`); multi-window
coherente; focus rings visibles.

**Native hitches:** sin jank en scroll, sin lag en transiciones (<16ms), sin main-thread
blocking (trabajo pesado off-thread).