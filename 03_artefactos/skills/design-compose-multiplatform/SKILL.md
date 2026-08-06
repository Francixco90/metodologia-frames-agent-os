---
name: design-compose-multiplatform
description: This skill should be used when the operator requests Compose Multiplatform or Kotlin Multiplatform guidance — expect/actual declarations, commonMain shared code, platform-specific sources (androidMain/iosMain/desktopMain/wasmJsMain), density and font handling cross-target, or iOS/Android/Desktop interop. It delivers prose guidance and pseudocode snippets for local evaluation only; it never executes Gradle, runs a Kotlin compile, or auto-launches build tooling.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Compose Multiplatform — KMP/CMP shared UI across Android, iOS, Desktop, Wasm

Guía de patrones Compose Multiplatform (CMP) y Kotlin Multiplatform (KMP):
código compartido en `commonMain`, declarations `expect`/`actual`, fuentes por
plataforma, densidad y tipografía cross-target, e interop iOS/Android/Desktop.
Voz MetodologIA, prosa terse, imperativa.

Derivada de genjutsu/_jutsu/compose-multiplatform/SKILL.md (AThevon/genjutsu,
MIT, commit 08a792f). El homólogo MetodologIA adapta los principios de shared
codebase CMP a un marco `local-evaluation`: describe capacidades en prosa,
entrega pseudocode rhyming, no ejecuta Gradle, no compila Kotlin, no publica,
falla cerrado ante runtime ausente.

## KMP vs CMP — clarificación

**KMP** (Kotlin Multiplatform) es la infraestructura de lenguaje y build: código
Kotlin compilado a JVM, Native (iOS, macOS, Linux, Windows) y Wasm. **CMP**
(Compose Multiplatform) es el framework de UI construido por JetBrains sobre
KMP, como port de Jetpack Compose. Se escribe una sola codebase Compose en
`commonMain` que corre en Android, iOS, Desktop (JVM) y Web (Wasm). El código
específico de plataforma vive en `androidMain`, `iosMain`, `desktopMain`,
`wasmJsMain` y se cablea vía declarations `expect`/`actual`.

KMP sin CMP existe (lógica de dominio compartida sin UI). CMP requiere KMP. La
distinción importa al elegir el escape hatch: lógica pura → KMP expect/actual;
UI con sabor de plataforma → CMP composable expect/actual o tokens en
`commonMain`.

## Receta — router

Full project structure, expect/actual code, composable expect/actual, density &
font handling, Compose Resources fonts, platform interop (iOS SwiftUI /
Android entry / embedding UIKit / animation cross-target), gotchas,
anti-patrones y performance lives en `references/cmp-receta.md` (governed,
hash-bound). Load la receta antes de emitir guidance.

| Sección                          | Where en receta                                  |
| -------------------------------- | ------------------------------------------------ |
| Estructura de proyecto           | `references/cmp-receta.md` § Estructura          |
| Patrón expect/actual             | `references/cmp-receta.md` § Patrón expect/actual |
| Composables expect/actual        | `references/cmp-receta.md` § Composables         |
| Density & Font cross-target      | `references/cmp-receta.md` § Density & Font      |
| Fonts (Compose Resources)        | `references/cmp-receta.md` § Fonts               |
| Platform interop (iOS/Android)   | `references/cmp-receta.md` § Platform interop    |
| Animation cross-target           | `references/cmp-receta.md` § Animation            |
| Gotchas (lo que NO funciona)     | `references/cmp-receta.md` § Gotchas             |
| Anti-patrones                     | `references/cmp-receta.md` § Anti-patrones        |
| Performance                       | `references/cmp-receta.md` § Performance         |

## Fail-closed

- NO CLI externo (no `./gradlew assembleX` auto-run, no `kmp gradle build`, no
  `npx`, no auto-build).
- NO red (no fetch de assets, no descarga de fuentes remotas).
- NO publicación (no push, no release, no deploy).
- NO auto-ejecución de tooling KMP/CMP. El skill describe la capacidad en prosa;
  el operador decide cuándo compilar.
- `local-evaluation` only. Si no hay runtime CMP disponible (emulador,
  dispositivo, preview IDE), marcar `coverage_gap` y documentar la validación
  pendiente.
- Toda afirmación de rendimiento cross-target requiere benchmark; sin
  benchmark, marcar `[INFERENCIA]` o `coverage_gap`.
- Cualquier duda sobre procedencia, derechos o autoridad de una fuente →
  `coverage_gap` explícito. Escalada > asunción.

## Validación

```bash
pnpm verify:skills
node skills/design-compose-multiplatform/scripts/check-skill.mjs
```

Esperado: PASS sin regresión. El script `scripts/check-skill.mjs` valida
contratos del skill (tokens requeridos, APIs prohibidas, fixture negativo
completo con `violation:` folded scalar).