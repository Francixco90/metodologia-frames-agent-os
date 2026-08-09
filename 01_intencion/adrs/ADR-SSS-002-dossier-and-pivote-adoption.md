# ADR-SSS-002 — Reconciliar el dossier y usar PIVOTE como segundo oráculo

## Contexto

Frames ya dispone de ocho skills especializadas para diseñar, autorizar, validar,
evaluar, gobernar y adaptar sistemas de skills. El dossier v1.0.0 propone ocho
nombres alternativos y PIVOTE 20+1 aporta contratos multimedia, gates, scripts y
evaluaciones. Copiarlos literalmente duplicaría responsabilidades y crearía una
segunda autoridad.

## Decisión

1. Mantener el portfolio Frames como autoridad y reconciliar cada propuesta mediante
   `KEEP`, `ALIAS`, `SPLIT`, `ADD` o `REUSE`.
2. Añadir solo `skill-security-auditor`, porque ninguna skill actual es dueña de la
   revisión adversarial de supply chain, prompt injection, secretos y expansión de
   autoridad.
3. Tratar `skill-critical-review` como combinación de `skill-portfolio-governor` y
   los actores independientes RT-09/RT-11; una skill no sustituirá al verifier ni al
   Guardian.
4. Usar PIVOTE como segundo oráculo de dominio, subordinado a contratos Frames. Una
   coincidencia refuerza aceptación; un conflicto se registra y bloquea decisión
   hasta resolver autoridad, nunca se elige silenciosamente.
5. Adoptar de PIVOTE el grafo de artefactos, UCC, gates de derechos/accesibilidad,
   prompts neutrales, handoffs, manifests, provenance, evaluaciones y recuperación.
   No copiar su prompt de sistema ni sobredeclarar ejecución.
6. Crear templates Markdown/HTML deterministas propios de Frames porque ninguna de
   las dos fuentes entrega esas proyecciones listas.

## Consecuencias

- El portfolio pasa de ocho a nueve skills sin duplicar aliases.
- `skill-knowledge-distiller` y `skill-package-author` quedan como nombres de
  migración, no paquetes activos.
- `skill-contract-engineer` se distribuye entre arquitectura, autoría y validación.
- Toda evaluación material registra los dos oráculos, diferencias, evidencia y
  disposición de assets.
- El fallo reproducible del packager PIVOTE se conserva como `coverage_gap`; no
  invalida sus contratos escritos ni prueba su runtime.

## Límites

Estado máximo `active/local-evaluation`. No se autorizan hosts, red, generación de
media, instalación, publicación ni H01.
