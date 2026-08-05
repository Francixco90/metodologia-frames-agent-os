# ADR 0021–0026 — Registry y adapters H-03

Estado: `ACCEPTED_FOR_LOCAL_EVALUATION` · 2026-07-20. No acredita H-04, producción, distribución ni
publicación. [CONFIG]

## Decisiones

**0021 · Registry.** D3, GSAP, Three/R3F, Lottie y Remotion usan contrato estricto y refs hash-bound
para adapter, fixtures, dependencias, licencia, fallback y pruebas. Todo fallback es observable y
degrada el veredicto; `Root.tsx` y VS-001 no cambian. [METODOLOGIA]

**0022 · D3.** Se admiten únicamente `d3-array`, `d3-scale`, `d3-shape`, `d3-hierarchy` y
`d3-interpolate`. El kernel puro devuelve geometría SVG y equivalencia textual; prohíbe DOM,
transiciones, timers, red y azar. Métricas exigen unidad, denominador, período y método; un DAG no se
declara árbol. [CONFIG]

**0023 · GSAP.** Timeline pausada sobre objetos locales, `seek(frame / fps, true)`, cleanup obligatorio
y único `gsap.ticker.sleep()` gobernado. Se prohíben plugins, DOM, callbacks y reproducción autónoma.
Revalidar licencia si el OS pasa a ser un constructor visual competidor. [CONFIG]

**0024 · Three/R3F.** Cámara, luces, semilla, dimensiones, orden y ANGLE son fijos. Se prohíben
`useFrame`, loaders remotos, delta, física y azar. El smoke detecta drift; si ANGLE falla, el fallback
SVG 2D queda visible y la capacidad permanece bloqueada. [METODOLOGIA]

**0025 · Lottie.** Solo JSON first-party, local y hash-bound. Expresiones, URL, imagen, font o asset
externo bloquean. Frame explícito, autoplay/loop deshabilitados y poster separado. [CONFIG]

**0026 · Remotion.** Runtime y `@remotion/*` quedan en `4.0.494`; el wrapper lee frame/config y entrega
contexto explícito. Evaluación local permitida; uso productivo/comercial no adjudicado. Resultado:
`BLOCKED_LICENSE`. [CÓDIGO]

## Dependencias y fuentes oficiales

| Familia     | Pines H-03                                  | Licencia observada                                       | Fuente versionada                                           |
| ----------- | ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Remotion    | `4.0.494`                                   | Remotion License; producción sin adjudicar               | `github.com/remotion-dev/remotion/blob/v4.0.494/LICENSE.md` |
| R3F / Three | `9.2.0` / `0.178.0`                         | MIT                                                      | manifests npm y repositorios oficiales                      |
| Lottie      | `5.13.0`                                    | MIT; adapter bajo Remotion License                       | `github.com/airbnb/lottie-web` y tag Remotion               |
| GSAP        | `3.15.0`                                    | Standard no-charge con restricción de builder competidor | `gsap.com/community/standard-license/`                      |
| D3 modular  | `3.2.4`, `4.0.2`, `3.2.0`, `3.1.2`, `3.0.1` | ISC                                                      | manifests npm y `github.com/d3`                             |

Metadata no es asesoría legal. Cambiar versión, lock, licencia, fixture o adapter invalida la
capacidad. [METODOLOGIA]

## Alternativas y rollback

- Registry solo documental: no demuestra capacidad.
- Renderer completo: diferido a H-04.
- Fallback silencioso: falsea disponibilidad.
- Latest R3F/Three: se prefiere la pareja probada para Remotion 4.0.494.

Rollback: retirar la superficie H-03, restaurar el lock mediante su receipt y conservar evidencia
como `superseded`; H-01/H-02/VS-001 permanecen intactos. [CONFIG]
