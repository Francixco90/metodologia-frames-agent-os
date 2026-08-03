# House Style — interpret the prompt, avoid lazy defaults

Read this FIRST for any non-trivial composition. It overrides web instincts. Adapted
from `hyperframes-creative/references/house-style.md` to offline-first + MetodologIA
brand.

## Interpret the prompt, generate real content

La prompt interpretada genera un **concepto**, no un restyle literal. "Haz un video
sobre X" no significa "pon X en un card centrado". Significa: que dice X, a quien, con
que hook, en que beats, con que evidencia.

1. **Que dice**: la idea central en una frase (hook).
2. **A quien**: el audience (ChannelProfile).
3. **Con que hook**: gancho concreto < 3s.
4. **En que beats**: 3-5 beats con purpose.
5. **Con que evidencia**: valor antes del demo.

Si no puedes responder las 5, no escribas HTML. Pide el brief o propón la expansion.

## Lazy defaults to question (web-page smells)

| Default web                      | Por que es flojo         | Que hacer                                     |
| -------------------------------- | ------------------------ | --------------------------------------------- |
| Blanco puro (#fff)               | Sin brand token override | Usar token semantico del BrandProfile         |
| Sombra suave generica            | Sin jerarquia            | Definir depth real (layer recipe abajo)       |
| Copy generico ("descubre mas")   | Sin voz resuelta         | Resolver VoiceProfile, escribir hook concreto |
| 3 cards iguales con misma photo  | Sin concepto             | Un hero + supporting, no catalogo             |
| Gradiente generico (purple-pink) | Sin intencion            | Palette del BrandProfile o palette nombrada   |
| Texto centrado en empty hero     | Web-page empty           | Video-medium density (ver abajo)              |

Estos son **lazy defaults**. `creative-audit.mjs` los marca. No los uses sin justificar.

## Background / foreground layer recipe

Una composicion de video no es una web page. Necesita **depth**:

- **Background layer**: ambiente (color del brand, pattern sutil, gradiente intencional
  del palette). No blanco plano. No web-page empty.
- **Midground layer**: sujeto principal (hero). Llena 60-80% del frame en title card.
- **Foreground layer**: detail (annotation, stat, lockup).foreground detail = profundidad real, no recorte flojo.

Sin foreground detail, la composicion se ve plana (web-page). Sin background layer, se
ve vacia. Ambos layers usan tokens del BrandProfile (colores semanticos), no literales.

## Video-medium density (no web-page empty)

- Escala mas grande que web (tipografia display 60-120px, no body 16px).
- Foreground detail (annotation, stat, segundo elemento).
- Depth real (layers, no sombras suaves).
- Color intencional (palette del brand, no blanco default).
- Un concepto por frame, no catalogo.

Ver `composition-patterns.md` para recipes concretos.

## Offline-first

- Fonts: system fonts (system-ui, sans-serif/serif/mono) o brand bundle pinned local
  con licencia resuelta. **No Google Fonts CDN.**
- Assets: ninguno externo. Si necesitas un asset, resuelvelo en el inbox del proyecto
  (source-lock, derechos, autoridad) o usa SVG/CSS autorado.
- No network (hereda `content-os-core` render adapter hook).
