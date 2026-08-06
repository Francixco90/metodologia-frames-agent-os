# Sub-skill routing — Stage 5 LOAD

Cargar siempre la fundación: **motion-principles**. Por contexto y stack detectado:

| Detectado | Cargar |
| --------- | ------ |
| Mobile context (web mobile o nativo) | mobile-principles |
| Desktop context (macOS o web desktop) | desktop-principles |
| Audit explícito o scope=full | design-audit |
| Preguntas UI/UX avanzadas | ui-ux-pro-max |
| gsap | gsap |
| framer-motion | framer-motion |
| Pure CSS / Tailwind / sin lib | css-native |
| three / @react-three | threejs-r3f |
| Canvas / generative | canvas-generative |
| Android Compose | compose-motion (siempre) + compose-graphics (si advanced) |
| Compose Multiplatform | compose-motion + compose-multiplatform + swiftui-motion si iOS interop |
| SwiftUI iOS o macOS | swiftui-motion (siempre) + swiftui-graphics (si advanced) |

## Advanced thesis trigger

Para compose-graphics / swiftui-graphics: la thesis es advanced si contiene `shader`,
`Metal`, `AGSL`, `RuntimeShader`, `MSL`, `liquid-glass`, `glassEffect`, `morphing
transition`, `M3 Expressive`, `MotionScheme`, `expressive motion`, `colorEffect`,
`distortionEffect`, `layerEffect`, `Canvas` (generative/particle/flow field), `holographic`,
`CRT`, `displacement`, `ripple`. Sino, quedarse en el base motion sub-skill.