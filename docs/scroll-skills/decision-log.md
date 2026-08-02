# Registro de Decisiones — Scroll Skills

**Fecha:** 2026-08-01

---

## D-01: Crear skills propias en lugar de copiar las originales

**Decision:** Derivar tres skills propias (`locally_authored_adaptation`) en lugar
de copiar las fuentes originales al nucleo.

**Fundamento:** Las tres fuentes tienen acoplamientos incompatibles con el harness:

- scroll-world requiere Higgsfield/Monid/Seedance (no disponibles ni obligatorios).
- cinematic-scroll tiene Mode B acoplado a fal.ai/Next.js/R3F (opcional).
- scroll-experience referencia skills externas que no existen localmente.

Crear adaptaciones propias permite extraer el valor agnostico (80-90%) sin
importar los acoplamientos del 10-20%.

**Etiquetas:** [INFERENCIA] [DOC]

## D-02: Model-agnostic con adaptadores opcionales

**Decision:** El nucleo de scroll-world-agnostic no exige ningun proveedor, modelo,
API, CLI ni framework. Las capacidades externas se representan como 4 contratos
de adaptador (ImageProvider, VideoProvider, MediaInspector, RuntimeVerifier),
todos opcionales y reemplazables.

**Fundamento:** El harness MetodologIA es source-first y fail-closed. Introducir
una dependencia obligatoria de proveedor violaria las reglas de gobernanza.

**Etiquetas:** [CÓDIGO] [CONFIG]

## D-03: Orden de ejecucion foundations -> quality -> primary

**Decision:** Formalizar el orden en el manifiesto y prohibir la ejecucion de
complementarias despues de la principal cuando su salida es prerrequisito.

**Fundamento:** Los fundamentos (accesibilidad, performance, SEO) deben aplicarse
antes de efectos cinematicos. La calidad cinematografica debe verificarse antes
del ensamblaje del pipeline.

**Etiquetas:** [CONFIG]

## D-04: Vendors en skills/vendor/ con exclusion de ESLint/Prettier

**Decision:** Instalar las fuentes originales en `skills/vendor/` como referencia
aislada. Excluir el directorio de ESLint (project service no puede parsear .js
externos) y de Prettier (no reformatear fuentes congeladas).

**Fundamento:** Los vendors son referencia auditada, no codigo del harness. No
deben pasar los mismos gates que el codigo propio.

**Etiquetas:** [CONFIG]

## D-05: No registrar las skills en skill-registry.yml ni creation-v3-skill-registry.yml

**Decision:** Las tres skills propias NO se registran en los registros hash-bound
existentes (`skill-registry.yml`, `creation-v3-skill-registry.yml`).

**Fundamento:** Los registros existentes tienen contratos estrictos (eventos de
lifecycle, hashes content_sha256, package_manifest_sha256) que acoplarían las
nuevas skills a validadores especificos. Las skills propias son autonomas con su
propio manifiesto (`scroll-skills-manifest.json`). Los check scripts existentes
iteran sobre arrays hardcoded de IDs, por lo que no se rompen al agregar nuevas
skills no listadas.

**Etiquetas:** [INFERENCIA] [DOC]

## D-06: Excluir inbox/Muestras/ de Prettier

**Decision:** Annnadir `inbox/Muestras/**` al `.prettierignore`.

**Fundamento:** El usuario ya habia hecho este cambio en el worktree principal
(cambio local sin commit). Los archivos HTML de inbox/Muestras son artefactos de
referencia de terceros cuyo formato inline no se gobierna por el estilo del
proyecto. Sin esta exclusion, format:check falla.

**Etiquetas:** [CONFIG]

## D-07: Baseline del ledger actualizado

**Decision:** Actualizar los valores baseline del test `docs-budget-v2.test.ts`
(80577->80615 palabras, 30754->30760 LOC) y regenerar el file-disposition-ledger.

**Fundamento:** Los archivos nuevos (3 skills + docs + vendors + tests) cambian
los conteos del corpus. El ledger se regenera con `pnpm ledger:generate`.

**Etiquetas:** [CÓDIGO]
