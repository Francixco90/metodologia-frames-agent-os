# Acceptance spec — CV Design Options v1

## Autoridad y alcance

Este contrato gobierna exclusivamente el gate `DESIGN_OPTIONS_READY` del flujo
CV Design-System-First. Evalúa dos exploraciones sintéticas antes de consolidar
el design system o compilar un CV real. No concede `HUMAN_APPROVED`, `READY` ni
`PUBLISHED`. [CONFIG]

El paquete evaluable debe contener exactamente:

- `blueprint-executive.md` y `blueprint-executive.html`;
- `neo-swiss-editorial.md` y `neo-swiss-editorial.html`;
- una página comparadora HTML;
- un manifiesto canónico con hashes SHA-256 de todos los archivos, versión del
  design system, composición, tema por defecto, fuentes, licencias y estado.

Cualquier archivo ausente, output extra presentado como tercera alternativa,
hash divergente o campo de autoridad desconocido produce `BLOCKED`. [CONFIG]

## Invariantes fail-closed

1. **Dos opciones, una gramática.** Existen exactamente dos composiciones
   distinguibles, pero ambas consumen los mismos tokens semánticos, tipografías,
   iconos y primitivas registradas. Duplicar dos sistemas independientes no
   cumple. [METODOLOGIA]
2. **Solo datos sintéticos.** No aparecen PII, datos de contacto reales, nombres
   de candidatos, empresas o clientes identificables, locators privados ni
   hashes derivados de PII. Un valor ambiguo se trata como `UNKNOWN` y bloquea.
   [CONFIG]
3. **Estado no aprobado.** El manifiesto declara `DESIGN_OPTIONS_READY` o un
   estado previo; nunca `HUMAN_APPROVED`, `READY` o `PUBLISHED`. La decisión de
   diseño queda vacía hasta aprobación humana ligada a hashes exactos. [CONFIG]
4. **Local-first.** HTML, CSS, JavaScript, fuentes e imágenes funcionan sin red.
   Se rechazan CDN, `http(s)://` en recursos ejecutables, imports remotos,
   tracking, píxeles y service workers. Enlaces de demostración se representan
   con destinos ficticios y no son dependencias de render. [CONFIG]
5. **Tema dual.** El tema inicial es `navy`; el alternativo es `light`, con
   blanco roto, tinta oscura, grises fríos y dorado accesible. La impresión fuerza
   el tema claro. El contenido no cambia entre temas. [METODOLOGIA]
6. **Mejora progresiva.** El contenido esencial, navegación y jerarquía permanecen
   disponibles con JavaScript desactivado. JavaScript no contiene copy visible;
   solo controla estado e interacción. [CONFIG]
7. **Derechos verificables.** Poppins y Montserrat se sirven localmente con
   licencia, procedencia y hashes; Trebuchet MS se declara como fuente del sistema
   con fallback explícito. Fuente o derecho ausente produce `BLOCKED`. [CONFIG]

## Matriz de aceptación

| ID    | Dimensión    | Criterio material                                                                                                                                                                            | Método mínimo                                   | Fallo     |
| ----- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------- |
| DS-01 | Inventario   | Existen exactamente 2 pares MD+HTML y 1 comparador; nombres, IDs y composición coinciden con el manifiesto.                                                                                  | Inventario de archivos + parseo del manifiesto. | `BLOCKED` |
| DS-02 | Autoría      | Cada MD declara intención, audiencia, jerarquía, componentes, ventajas, límites y trade-offs; el HTML proyecta esas decisiones sin inventar hechos.                                          | Comparación MD↔DOM y revisión de copy.          | `BLOCKED` |
| DS-03 | Datos        | Todo nombre, cargo, empresa, cifra, contacto y enlace es explícitamente ficticio; el escáner de privacidad no detecta PII ni locators.                                                       | Escáner de privacidad + revisión manual.        | `BLOCKED` |
| DS-04 | Primitivas   | Ambas opciones importan o incorporan la misma versión/hash de tokens, fuentes, iconos y componentes; diferencias solo en composición permitida.                                              | Grafo de dependencias + comparación de hashes.  | `BLOCKED` |
| DS-05 | Identidad    | Poppins titula y cifra; Trebuchet compone cuerpo; Montserrat rotula controles. Azul, dorado y superficies usan tokens semánticos, no literales dispersos.                                    | CSS AST/scan + estilos computados.              | `BLOCKED` |
| DS-06 | Temas        | Navy carga por defecto; el toggle 44×44 cambia a light, anuncia estado, persiste elección local y evita flash incoherente. Impresión es light.                                               | Playwright limpio/recarga + media print.        | `BLOCKED` |
| DS-07 | Contraste    | Texto normal ≥4.5:1, texto grande y elementos gráficos/foco ≥3:1 en ambos temas y estados interactivos. El dorado no se usa como texto insuficiente.                                         | axe/contraste computado + inspección manual.    | `BLOCKED` |
| DS-08 | Reflow       | No hay scroll horizontal, solapamiento, recorte ni palabras rotas a 320, 375, 390, 768, 1024 y 1440 px; zoom 200%; portrait y landscape.                                                     | Matriz Playwright + medición `scrollWidth`.     | `BLOCKED` |
| DS-09 | Teclado      | Skip link, orden de foco lógico, foco visible, activación Enter/Espacio y acceso a todo control sin ratón.                                                                                   | Recorrido manual por teclado.                   | `BLOCKED` |
| DS-10 | Semántica    | Un `h1`, jerarquía sin saltos injustificados, landmarks, listas, botones reales y nombre/rol/valor accesible. SVG decorativo oculto; SVG informativo nombrado.                               | DOM/AX tree + axe + revisión manual.            | `BLOCKED` |
| DS-11 | Revelación   | El BLUF queda visible. `<details>` resuelve profundidad no bloqueante. `<dialog>` se reserva para evidencia profunda, con X única sticky de 44×44, Escape, backdrop, trap y retorno de foco. | Pruebas de interacción y foco.                  | `BLOCKED` |
| DS-12 | Sin JS       | Con JS desactivado se conserva todo el contenido sustantivo y los enlaces; controles dependientes de JS se ocultan o degradan con honestidad.                                                | Render JS-off + extracción textual.             | `BLOCKED` |
| DS-13 | Impresión    | No aparecen toggle, navegación flotante, controles ni decoraciones inútiles; texto seleccionable, links identificables, orden lógico y páginas sin cortes destructivos.                      | PDF/print preview + extracción.                 | `BLOCKED` |
| DS-14 | Movimiento   | Transiciones duran 150–300 ms, no son esenciales y `prefers-reduced-motion` elimina movimiento no necesario.                                                                                 | Estilos computados en ambos modos.              | `BLOCKED` |
| DS-15 | Integridad   | No hay dependencias remotas, gradientes de texto, glassmorphism, cursores personalizados, targets menores de 44 px ni iconos Unicode/emoji como UI.                                          | Scan estático + revisión visual.                | `BLOCKED` |
| DS-16 | Determinismo | Dos builds limpios producen los mismos bytes y hashes. El manifiesto enlaza outputs, DS, fuentes, licencia y runtime reproducible.                                                           | Doble build + SHA-256.                          | `BLOCKED` |

## Criterios de composición y oficio

### Blueprint Executive

- Debe conservar una lectura ejecutiva densa y una señal blueprint deliberada,
  no una retícula decorativa dominante. [METODOLOGIA]
- El rail lateral es compacto y subordinado al nombre, propuesta de valor,
  experiencia y resultados. [INFERENCIA]
- Los KPIs parecen instrumentos de decisión o dashboard; no porcentajes
  arbitrarios, indicadores de progreso ni métricas inventadas. [CONFIG]

### Neo-Swiss Editorial

- Debe presentar una jerarquía asimétrica, navegación superior y flujo editorial
  claro, inspirado en la gramática de `ruta-workshops` sin copiar su contenido ni
  depender de sus recursos externos. [METODOLOGIA]
- El espacio en blanco, escala tipográfica y acento dorado crean contraste; no
  debe degradar a una cuadrícula uniforme de cards. [INFERENCIA]

### Impeccable y UI/UX

- No se acepta una sucesión de cards genéricas idénticas cuando jerarquía,
  tipografía, lista, timeline, proof strip o composición editorial comunican
  mejor. [METODOLOGIA]
- Se prohíben gradient text, glassmorphism ornamental, glow excesivo, sombras
  pesadas y decoración sin función. [CONFIG]
- La revelación progresiva reduce densidad sin ocultar la tesis, identidad,
  experiencia, resultados o vías de contacto. [PEDAGOGIA]
- Cuerpo base ≥16 px en móvil, interlineado ≥1.5, ancho de lectura controlado y
  labels concisos. Ningún texto se comprime para resolver overflow. [CONFIG]
- Hover nunca es la única vía de información; todo estado posee equivalencia para
  teclado y tecnología de asistencia. [CONFIG]

## Protocolo de auditoría

1. Congelar inventario, commit y hashes del candidato.
2. Validar manifiesto, estado, synthetic-only, derechos y cero red.
3. Ejecutar doble build y comparar bytes antes de cualquier revisión visual.
4. Inspeccionar ambas opciones con JS activo y desactivado.
5. Ejecutar la matriz responsive, zoom, orientación, tema y print.
6. Combinar chequeos automáticos con teclado, AX tree y revisión manual WCAG
   2.2 AA; un resultado automatizado no sustituye la inspección manual.
7. Registrar cada hallazgo con severidad, archivo/selector, criterio, evidencia y
   acción requerida. El Guardian no remedia archivos del productor. [CONFIG]

## Semántica del veredicto

- `PASS_DESIGN_OPTIONS_READY`: todos los criterios materiales tienen evidencia
  reproducible y el estado sigue sin aprobación humana.
- `BLOCKED`: existe al menos un incumplimiento material, hash stale, PII, recurso
  remoto, derecho ausente o estado indebidamente promovido.
- `UNKNOWN`: falta runtime, evidencia o capacidad de observación. `UNKNOWN` no se
  computa como pass y bloquea el gate.

El máximo veredicto permitido por este contrato es
`PASS_DESIGN_OPTIONS_READY`; nunca implica preferencia entre alternativas ni
autoriza consolidación, uso con datos reales, promoción o publicación. [CONFIG]
