# Guía de uso — MetodologIA Career Design System v1

## Principio operativo

[METODOLOGIA] El sistema visual proyecta una fuente factual; no la reemplaza. La
secuencia obligatoria es `CV Spec → Design Brief → Decision → Compile → Verify`.
Un cambio en spec, decisión, tokens, componentes, iconos, fuentes o composición
invalida renders y aprobaciones anteriores.

## Tipografía

- Poppins: titulares y cifras. Pesos empaquetados 400, 700 y 800.
- Trebuchet MS: cuerpo. Es fuente del sistema; no se empaqueta.
- Montserrat: labels, navegación y controles. Variable 400–700 empaquetada.
- No simular pesos ausentes. No reducir el cuerpo para hacer caber contenido.
- Fuente autorizada: `brand/fonts/font-manifest.yml`; derechos:
  `brand/fonts/rights-receipt.yml`.

## Tema

- Navy es el default en pantalla; light es alternativo y obligatorio al imprimir.
- El toggle persiste localmente y es mejora progresiva. Sin JavaScript, el
  contenido y los `<details>` siguen disponibles.
- Nunca escribir colores literales en componentes. Consumir la proyección central
  `brand/generated/social-light.css` y luego `tokens/tokens.v1.css`.
- El dorado indica decisión o foco; no llena áreas extensas ni usa texto blanco
  cuando el contraste sea insuficiente.

## Densidad y revelación

- Visible: propuesta, rol, experiencia, resultados y capacidades en BLUF.
- `<details>`: explicación útil para la mayoría, máximo 55 palabras.
- `<dialog>`: evidencia profunda, contexto o límites, máximo 180 palabras.
- Un diálogo tiene una única X sticky de 44×44 px. Escape y cierre restauran foco.
- Mover texto a un emergente nunca puede ocultar un requisito factual del CV.

## Do

- Atar cada cifra y claim a evidencia autorizada.
- Mostrar unidad, periodo, alcance y límites del KPI.
- Usar iconos inline registrados con etiqueta accesible cuando corresponda.
- Conservar orden semántico, landmarks, headings y enlaces descriptivos.
- Validar 320, 375, 390, 768, 1024 y 1440 px, zoom 200 % e impresión.

## Don't

- No usar dependencias remotas, icon fonts, canvas ni texto convertido en imagen.
- No hardcodear copy visible o nombres accesibles en JavaScript.
- No usar porcentajes decorativos, barras falsas ni keywords ocultas.
- No duplicar contenido entre hero, rail, cards y diálogos.
- No presentar tool inventory como competencia.
- No incluir PII, locators privados o hashes derivados de contacto en Git.

## Guardrails de contenido

La fuente Markdown/JSON canónica es la autoridad. JavaScript controla estado, no
contenido. Un claim requerido por la vacante no se convierte en experiencia del
candidato. Un objetivo, estimación o transferencia se etiqueta o se omite.

## Criterios de aceptación

1. Hashes de autoridad y selección vigentes.
2. Solo componentes e iconos registrados.
3. Cero colores literales fuera de la autoridad central de tokens.
4. Navegación, foco, reflow, contraste y diálogo conformes WCAG 2.2 AA.
5. JS-off, impresión light y CSP local-first funcionales.
6. Privacidad PASS y package state máximo `RENDERED_DRAFT` antes de gates humanos.
