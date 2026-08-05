# Arquitectura — Scroll Skills Stack

**Version:** 1.0.0
**Fecha:** 2026-08-01
**Rama:** feat/model-agnostic-scroll-skills

---

## Diagrama de la pila

```
scroll-experience-foundations  (fundamentos: narrativa, a11y, perf, SEO)
        |
        | prerrequisito
        v
cinematic-scroll-quality  (calidad: tokens, guardrails, choreography, doctor)
        |
        | prerrequisito
        v
scroll-world-agnostic  (orquestador principal: estrategias, adaptadores, seam law)
        |
        | despues de validaciones
        v
uso opcional de vendors  (skills/vendor/ — referencia aislada)
```

## Principios arquitectonicos

### 1. Model-agnostic por disennn

El nucleo de scroll-world-agnostic no exige modelo, proveedor, API, CLI ni framework.
Las capacidades externas se representan como adaptadores opcionales y reemplazables:

```
ImageProvider.generate(request) -> AssetResult    [opcional]
VideoProvider.generate(request) -> AssetResult    [opcional]
MediaInspector.inspect(asset) -> MediaMetadata     [opcional]
RuntimeVerifier.verify(target) -> VerificationResult [opcional]
```

Si ningun adaptador esta disponible, la skill degrada gracefulamente.

### 2. Separacion de responsabilidades

| Skill                         | Responsabilidad                              | No hace                          |
| ----------------------------- | -------------------------------------------- | -------------------------------- |
| scroll-experience-foundations | Fundamentos invariantes (a11y, perf, SEO)    | No disennn efectos cinematicos   |
| cinematic-scroll-quality      | Calidad cinematografica (tokens, guardrails) | No orquesta el pipeline          |
| scroll-world-agnostic         | Orquestacion del pipeline completo           | No define fundamentos ni calidad |

### 3. Orden de ejecucion formalizado

El manifiesto (`docs/scroll-skills/scroll-skills-manifest.json`) impide:

- dependencias circulares;
- nombres duplicados;
- entrypoints ambiguos;
- vendors como nucleo obligatorio;
- ejecucion de complementarias despues de la principal cuando su salida es prerrequisito.

### 4. Aislamiento de vendors

Las fuentes originales se instalan en `skills/vendor/` como referencia aislada:

- No se ejecutan automaticamente;
- No sobrescriben las skills propias;
- No son dependencias obligatorias;
- Estan fijadas por commit hash auditado;
- Los componentes peligrosos (installers, templates de framework, binarios) se excluyen.

## Estrategias soportadas por scroll-world-agnostic

| #   | Estrategia                | Requiere                           | Fallback              |
| --- | ------------------------- | ---------------------------------- | --------------------- |
| 1   | Secuencia visual continua | Stills (suministrados o generados) | Secuencia de imagenes |
| 2   | Escenas conectadas        | VideoProvider + ImageProvider      | Secuencia de imagenes |
| 3   | Video scrub               | VideoProvider + MediaInspector     | DOM/CSS               |
| 4   | Secuencia de imagenes     | Stills                             | DOM/CSS               |
| 5   | WebGL                     | Adaptador 3D                       | DOM/CSS               |
| 6   | DOM/CSS                   | Nada (vanilla)                     | Estatico              |
| 7   | Estatico                  | Nada                               | —                     |

## Atribucion de fuentes

| Skill propia                  | Fuente                                                    | Commit                                        | Licencia         |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------- | ---------------- |
| scroll-experience-foundations | sickn33/agentic-awesome-skills (skills/scroll-experience) | b7f833d4 (pinned 2026-08-04, was release-tag) | MIT + Apache 2.0 |
| cinematic-scroll-quality      | MustBeSimo/cinematic-scroll-skill                         | 089cd3ae                                      | MIT              |
| scroll-world-agnostic         | oso95/scroll-world                                        | 71cc36d3                                      | MIT              |

Todas las derivaciones son `locally_authored_adaptation` con `external_fragments_reused: true`.
Las atribuciones se conservan en LINEAGE.yml y en los archivos de vendor.

## Re-vendor — Fase 1D (2026-08-04)

Re-verificación de los 3 scroll vendors contra upstream HEAD:

| vendor            | locked commit | upstream HEAD | status                                 |
| ----------------- | ------------- | ------------- | -------------------------------------- |
| scroll-world      | 71cc36d3      | 71cc36d3      | ✅ already at HEAD, no change          |
| cinematic-scroll  | 089cd3ae      | 089cd3ae      | ✅ already at HEAD, no change          |
| scroll-experience | b7f833d4      | b7f833d4      | ✅ SHA pinned (was release-tag string) |

`scroll-experience` SKILL.md content hash at HEAD `b7f833d4` = `4f32befc...` = identical to
vendored copy. The prior `source_commit: "main (V15.6.0 release tag)"` known_risk is
resolved: pinned to SHA `b7f833d4e12f8cf8f9beb0118b4a72709b63e8a4`. NOTICE is a local
attribution artifact (not from source; no upstream NOTICE file). `cinematic-scroll` is
the clean Fal AI reference for Fase 2D (`lib/fal-models.ts`, `@fal-ai/server-proxy`,
`fal.subscribe`/`fal.queue.submit`).
