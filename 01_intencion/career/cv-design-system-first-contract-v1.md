# Contrato CV Design-System-First v1

## Precedencia

`cv-spec-v2` conserva a Evidence Bank como autoridad factual y añade una decisión
visual previa a cualquier HTML ejecutivo. El sistema visual organiza y presenta;
no crea claims, evidencia ni autoridad de publicación. [METODOLOGIA]

Cadena gobernada:

`CV Spec → Design Brief → 2 opciones → aprobación → Compile → Verify → Review → Promote`

## Autoridades materiales

- `metodologia-career-design-system-v1`: referencias y hashes de contrato,
  tokens, componentes, fuentes, iconos, composiciones y temas.
- `cv-design-brief-v1`: audiencia, idiomas, densidad, jerarquía, interacción,
  restricciones y exactamente dos composiciones solicitadas.
- `cv-design-decision-v1`: previews MD/HTML hash-bound y selección humana exacta.
- `cv-spec-v2`: cada variante liga su perfil visual, decisión, composición y hashes.
- `cv-package-v3`: replica esos bindings por variante y los somete a invalidación.

Los artefactos públicos usan datos sintéticos. Los bindings privados pueden
registrar IDs y referencias portables, nunca PII ni hashes derivados de PII.

## Opciones y gate humano

Las alternativas gobernadas son `blueprint-executive` y
`neo-swiss-editorial`. `DESIGN_OPTIONS_READY` significa que ambas pueden
revisarse; no contiene selección ni aprobación. [CONFIG]

`CR_CV_DESIGN_APPROVED` solo se satisface con:

1. brief y sistema vigentes;
2. ambos rationale MD y preview HTML con hash;
3. una composición seleccionada explícitamente;
4. `HUMAN_APPROVED` ligado al `decision_sha256` exacto.

El workflow nunca crea este consentimiento por inferencia. Cambiar brief,
preview, tokens, componentes, fuentes, iconos, composición o decisión hace stale
la spec, el package y sus aprobaciones posteriores.

## Reglas por output

- ATS-only declara por variante `mode: ats-neutral` y todos los bindings
  visuales quedan `null`. No requiere el gate de diseño.
- `executive-html` declara `mode: approved-system`, tema navy predeterminado,
  light alternativo y light para impresión.
- Una variante ATS no puede transportar un binding visual decorativo.
- Una variante ejecutiva no puede compilar con selección nula, decisión en
  `DESIGN_OPTIONS_READY`, hash stale o sistema no observado.

## Compatibilidad e invalidación

La migración `cv-spec-v1 → cv-spec-v2` es explícita:

- ATS-only recibe únicamente el bypass neutral tipado.
- Si existe `executive-html`, el caller aporta la decisión `HUMAN_APPROVED` y
  sus refs; ausencia produce `CR_CV_DESIGN_APPROVED_REQUIRED`.
- La aprobación v1 nunca migra: v2 inicia `DRAFT` y exige nueva aprobación de
  su propio hash.

La migración `cv-package-v2 → cv-package-v3` solo copia bindings ya declarados
en una spec v2 aprobada; no elige composición. Un package ejecutivo se considera
corriente únicamente al observar también la decisión y sistema vigentes.

## Estados y límites

`DESIGN_OPTIONS_READY != HUMAN_APPROVED != RENDERED_DRAFT != READY != PUBLISHED`.
Compilar o verificar no publica el CV. Runtime ausente, hashes divergentes o
autoridad visual no observada producen `UNKNOWN` o `BLOCKED`, nunca `PASS`.
