# MetodologIA Career Design System v1

Sistema local-first y hash-bound para HTML ejecutivo de CV y portfolio. La
composición primaria es **Blueprint Executive**; **Neo-Swiss Editorial** queda
como secundaria. Ambas comparten tokens, tipografía, componentes, iconos, temas,
accesibilidad e impresión. [METODOLOGIA][CONFIG]

## Orden de consumo

1. `brand/generated/social-light.css` — autoridad central y fuentes locales.
2. `tokens/tokens.v1.css` — aliases semánticos de carrera y temas navy/light.
3. `components/components.v1.css` — primitives reutilizables.
4. `print/print.v1.css` — proyección A4 light.
5. `icons/icons.v1.svg` y `components/snippets.v1.html` — snippets inline.

## Autoridad

- Selección humana: `decisions/design-selection-v1.json`.
- Tokens: `tokens/tokens.v1.json`.
- Componentes: `components/registry.v1.json`.
- Iconos: `icons/registry.v1.json`.
- Composiciones: `compositions/*.v1.md`.
- Fuentes y derechos: `brand/fonts/{font-manifest,rights-receipt}.yml`.
- Uso y guardrails: `guidelines/*.v1.md`.

Los previews en `options/` son evidencia de selección y no plantillas a editar.
El renderer debe consumir esta autoridad consolidada y una fuente canónica de
contenido. ATS HTML/DOCX/PDF permanecen neutrales y no cargan este sistema.

## Estados

`HUMAN_APPROVED` aplica solo a la elección de composición. Compilar el sistema o
un CV no concede `READY`, `PUBLISHED` ni autorización de postulación.

## Verificación focal

```sh
node 03_artefactos/skills/career-design-system/scripts/check-skill.mjs
```

El checker vuelve a leer hashes, contratos, referencias, colores, fixtures y
límites. No escribe recibos ni confía en un PASS autorreportado.
