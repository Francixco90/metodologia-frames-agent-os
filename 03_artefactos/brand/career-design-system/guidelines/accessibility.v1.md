# Contrato de accesibilidad y QA visual

[PEDAGOGIA] La revelación progresiva reduce carga simultánea, pero la información
esencial permanece visible y en orden semántico. [INFERENCIA]

## WCAG 2.2 AA

- Texto normal ≥ 4.5:1; texto grande y UI ≥ 3:1 en navy y light.
- Targets interactivos ≥ 44×44 px; excepción solo para enlaces inline en prosa.
- `:focus-visible` nunca se elimina ni queda oculto bajo el header sticky.
- Un skip link llega a `<main id="contenido">`.
- Headings no saltan niveles por razones visuales.
- Iconos decorativos usan `aria-hidden`; botones de icono tienen nombre localizado.
- `<dialog>` nativo: apertura por botón, Escape, backdrop no obligatorio, foco
  inicial sensato, scroll interno y retorno de foco al invocador.
- `prefers-reduced-motion` neutraliza movimiento; forced colors conserva foco.

## Matriz mínima

| Superficie | Checks                                                  |
| ---------- | ------------------------------------------------------- |
| Desktop    | 1024 y 1440 px; teclado; ambos temas                    |
| Móvil      | 320, 375 y 390 px; portrait; cero overflow              |
| Tablet     | 768 px portrait y landscape                             |
| Zoom       | 200 % sin pérdida de contenido o función                |
| JS-off     | contenido, navegación, details y links disponibles      |
| Print      | A4 light; sin controles; enlaces y texto seleccionables |

## Fail closed

Overflow, contraste no medido, asset remoto, foco perdido, output ausente o hash
stale produce `BLOCKED` o `UNKNOWN`, nunca `PASS`.
