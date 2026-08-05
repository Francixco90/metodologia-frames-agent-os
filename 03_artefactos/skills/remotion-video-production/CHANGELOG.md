# Changelog

## Unreleased

- Remediar `QA-SKILL-001`: endurecer `portableMediaPath` contra traversal, rutas absolutas
  POSIX/Windows, backslashes, `file://` y segmentos vacíos.
- Añadir fixtures positivas y negativas para la gramática de rutas portables.
- Verificar la sucesión aprobada del lockfile H-02→H-03 sin reescribir el receipt histórico ni
  promover la licencia productiva de Remotion.

## 0.1.0 — 2026-07-19

- Crear una skill original y canónica para producción Remotion gobernada.
- Fijar Remotion 4.0.494 y Zod 4.
- Añadir router explícito de 15 módulos.
- Añadir contratos portables de input, output, error y video spec.
- Añadir fixtures positivas y negativas, APIs prohibidas y checks locales.
- Mantener producción comercial bloqueada por `coverage_gap` de licencia del runtime.
- Mantener `remotion-dev/skills` como referencia sin fragmentos reutilizados.
