# Frames ContentOS · por MetodologIA

Frames te ayuda a convertir una idea, una fuente o una necesidad de comunicación en un trabajo claro, revisable y listo para avanzar. Puedes pedir ayuda con palabras normales: el sistema interpreta el resultado, prepara un brief, elige el recorrido adecuado y te acompaña hasta un borrador validado, sin obligarte a conocer prompts complejos.

Puedes usarlo para crear o mejorar contenido, organizar una campaña, diseñar la narrativa de una presentación, preparar carruseles y piezas multimedia, mejorar un CV, redactar una carta de presentación o estructurar una búsqueda laboral basada en evidencia.

> Empieza diciendo qué quieres lograr. Frames te preguntará solo lo que realmente haga falta.

## Qué puedes lograr

| Si necesitas…                                  | Frames puede ayudarte a…                                                                  | Qué recibirás                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Crear una pieza de contenido                   | aclarar audiencia, objetivo, formato y mensaje; proponer una ruta creativa                | acuerdo de trabajo, conceptos, especificación, instrucciones de creación, revisión y versión editable                          |
| Preparar un carrusel, historia o pieza gráfica | ordenar la narrativa, definir cada pantalla, textos, visuales y criterios de continuidad  | guion por lámina, copy, prompts, mapa de activos y paquete de revisión                                                         |
| Diseñar una presentación ejecutiva             | convertir información dispersa en una historia para decidir, priorizar o vender una idea  | documento rector, estructura, mensajes clave, guion visual y especificación; el formato final depende del generador disponible |
| Planear una campaña                            | conectar objetivo, audiencia, canales, hitos, contenidos y medición                       | charter, cronograma, parrilla, dependencias, entregables y riesgos                                                             |
| Crear imágenes o miniclips                     | traducir la intención en prompts, variantes, restricciones y criterios de calidad         | prompt pack, asset map, continuity notes y candidatos cuando exista herramienta autorizada                                     |
| Explicar un método con diagramas               | ordenar conceptos, relaciones, voz y pantalla en contratos verificables                   | plan, especificación y diagrama candidato; el video local requiere composición, audio y materiales autorizados                 |
| Mejorar un CV                                  | ordenar experiencia real, elegir evidencia relevante y adaptar el documento a una vacante | CV Markdown y HTML; PDF ATS cuando el generador local acreditado esté disponible                                               |
| Escribir una cover letter                      | complementar el CV sin repetirlo ni inventar logros                                       | carta Markdown/HTML, mensaje breve o respuesta de formulario                                                                   |
| Buscar oportunidades laborales                 | definir búsquedas, comparar vacantes y priorizar por ajuste demostrado                    | query pack, inventario, scorecards y shortlist; nunca postula sin autorización específica                                      |
| Crear o mejorar una skill                      | comprobar si realmente hace falta, diseñar responsabilidades y evaluar el resultado       | caso de uso, mapa de capacidades, candidate, validación, comparación contra baseline y plan de versión                         |
| Mejorar algo existente                         | conservar lo válido, localizar el problema y crear una versión sucesora                   | acuerdo de intervención, cambios priorizados, comparación y nueva versión candidata                                            |

Consulta el [catálogo de capacidades](01_intencion/guides/capabilities.md) para distinguir qué está disponible, qué es asistencia guiada y qué permanece bloqueado.

## Cómo trabaja Frames contigo

1. **Entiende el resultado.** Resume lo que quieres conseguir y detecta si falta una decisión importante.
2. **Pregunta lo mínimo.** Formula como máximo tres preguntas bloqueantes; no repite información ya resuelta.
3. **Prepara el brief.** El brief es el acuerdo de trabajo: objetivo, audiencia, evidencia, entregables, límites y siguiente aprobación.
4. **Elige el recorrido.** Activa solo los procesos y capacidades especializadas necesarios; no carga todo el sistema para cada tarea.
5. **Produce y revisa.** Separa creación, verificación y Guardian cuando el riesgo lo exige.
6. **Se detiene antes de efectos externos.** Publicar, enviar, postular o conectar servicios requiere una autorización humana específica.

El Markdown es la fuente canónica. Cuando existe una versión HTML, se genera desde el mismo contenido y aplica por defecto el Design System de MetodologIA. El diseño puede enriquecer la lectura, pero no cambiar el significado.

## Cómo empezar

No necesitas construir videos, ejecutar toda la batería técnica ni actualizar herramientas globales para probar Frames. Empieza conversando; usa los comandos de verificación solo si vas a modificar el repositorio.

### Opción 1: habla normalmente

Prueba cualquiera de estas frases:

- “Ayúdame a crear un carrusel para explicar esta idea.”
- “Convierte este informe en una presentación ejecutiva.”
- “Quiero una campaña de cuatro semanas para lanzar este servicio.”
- “Mejora mi CV para esta vacante sin inventar experiencia.”
- “Escribe una cover letter que complemente mi CV.”
- “Ayúdame a encontrar oportunidades compatibles con mi perfil.”
- “Necesito una skill para revisar propuestas antes de enviarlas.”

Un saludo muestra un menú breve: **Crear · Mejorar · Planear · Explorar**. Si el pedido ya es claro, Frames evita el menú y avanza directamente a confirmar el brief.

### Opción 2: usa el asistente local

El modo predeterminado interpreta y orienta sin escribir archivos:

```bash
printf '%s\n' 'Ayúdame a crear una pieza' | pnpm frames:assist
```

Comandos conversacionales útiles:

- `/menu`: muestra las entradas principales.
- `/ruta`: explica qué recorrido, capacidades y aprobaciones usaría.
- una frase normal: siempre prevalece sobre el menú.

La materialización local usa `--apply`, exige un workspace autorizado y se detiene en la aprobación del brief. Consulta [uso guiado y comandos](01_intencion/guides/guided-use.md) antes de activarla.

## Qué recibirás durante el proceso

- **Brief canónico:** qué se hará, para quién, con qué evidencia y bajo qué límites.
- **Plan visible:** pasos, hitos, responsables, outputs y puntos de aprobación.
- **Entregables intermedios:** por ejemplo, charter, cronograma, parrilla, mapa de activos, prompts o matriz requisito–evidencia.
- **Versión candidata:** un resultado material que todavía puede corregirse sin sobrescribir el anterior.
- **Estado de calidad:** `PASS`, `FAIL`, `UNKNOWN` o `BLOCKED`, acompañado por evidencia y siguiente acción.
- **Continuidad:** una tarea válida puede retomarse por su lineage; un cambio estructural crea un successor.

No necesitas memorizar estos nombres. Frames los muestra solo cuando ayudan a comprender una decisión o inspeccionar la ruta.

## Guías por necesidad

- [Explorar todas las guías](01_intencion/guides/README.md)
- [Qué puede hacer Frames](01_intencion/guides/capabilities.md)
- [Crear contenido y multimedia](01_intencion/guides/content-multimedia.md)
- [CV, cartas y búsqueda laboral](01_intencion/guides/career.md)
- [Trabajar conversando o con comandos](01_intencion/guides/guided-use.md)
- [Referencia técnica](01_intencion/guides/technical-reference.md)

## Estado actual

La madurez integral sigue en `PARTIAL_CONTROLLED`: Frames ya puede demostrar recorridos locales, pero todavía conserva fuentes, licencias y efectos externos pendientes. Experience OS está en `active/local-evaluation`: puedes probar la asistencia, los briefs, los templates y los recorridos dentro del repositorio, pero esto no equivale a un servicio publicado ni autoriza distribución.

Los controles usan estados exactos que aquí se traducen a lenguaje cotidiano:

- `SOURCE_LOCKED`: las fuentes fueron identificadas, congeladas y verificadas; antes de este punto no se producen afirmaciones nuevas.
- `HUMAN_APPROVED`: una persona autorizada aprobó esa versión concreta; una revisión automática no concede este estado.
- `READY`: el paquete superó todos los controles exigidos para su uso previsto.
- `PUBLISHED`: ocurrió una publicación real y existe evidencia material; preparar un paquete no basta.

Los recorridos multimedia P00–P09 y Career C00–C09 están definidos y verificados. Algunas salidas dependen de generadores, fuentes, derechos o herramientas que pueden no estar acreditados en tu entorno. Cuando falta una capacidad material, Frames muestra una brecha (`coverage_gap`) o un bloqueo (`BLOCKED`); nunca simula que produjo un archivo.

Para videos que explican un método, Frames ya puede organizar la intención, los supuestos, los
conceptos, los tiempos, la relación entre voz y pantalla y un diagrama HTML/SVG verificable. Un
render local es un paso asistido: necesita una composición, audio y materiales autorizados que el
adapter actual no produce. Aunque exista ese render, su estado es como máximo `RENDERED_DRAFT`;
`HUMAN_APPROVED`, `READY` y `PUBLISHED` requieren decisiones y evidencia separadas.

## Límites honestos

- No publica contenido, envía mensajes, postula a empleos ni activa conectores por una petición ambigua.
- No inventa claims, experiencia profesional, métricas, fuentes, derechos o aprobaciones.
- Una presentación puede quedar como narrativa y especificación si no existe un generador de formato final registrado.
- Una imagen, miniclip, video o PDF solo cuenta como producido si existe un archivo material con hash verificable.
- Los generadores trabajan sin red durante render: las fuentes y los recursos deben estar disponibles y autorizados antes de producir.
- LinkedIn y otras plataformas son fuentes/adapters; no se usan credenciales, cookies ni scraping no autorizado.
- `PASS` técnico no significa aprobación humana, distribución ni publicación.
- La licencia comercial del generador Motion permanece bloqueada (`BLOCKED_LICENSE`) hasta resolver su autoridad.

## Para operadores y contribuidores

Si vas a modificar el sistema, empieza en [AGENTS.md](AGENTS.md) y carga solo el `context.md` correspondiente. La [referencia técnica](01_intencion/guides/technical-reference.md) conecta la experiencia humana con rutas, workflows, ownership y verificadores.

Para ampliar Frames sin publicar nada, sigue la guía de [extensiones locales](01_intencion/guides/extend-frames.md). Para corregir o evolucionar el arnés, usa el recorrido de [mantenimiento gobernado](01_intencion/guides/maintain-frames.md). El [portal offline](03_artefactos/content/documentation/index.html) explica cada workflow con su secuencia, y el [inventario del ecosistema](03_artefactos/content/documentation/ecosystem-inventory.md) muestra las capacidades disponibles.

Si la ampliación implica una skill, Frames comprueba primero si una instrucción, una referencia o una herramienta existente ya resuelve el problema. Cuando una skill sí aporta valor repetible, el recorrido especializado diseña su responsabilidad, la prueba contra una línea base y prepara un paquete reversible. Puedes inspeccionar y validar sin escribir con `pnpm skills:inspect` y `pnpm skills:validate`; consulta la guía de extensiones para ejemplos seguros.

Comprobación integral:

```bash
pnpm install --frozen-lockfile
pnpm check:toolchain
pnpm verify
```

Ejecuta el bloque desde la raíz del repositorio. Cada línea debe terminar correctamente antes de continuar. El aviso de una versión nueva de `pnpm` es informativo: **no ejecutes `pnpm add -g pnpm`**. Frames fija la versión compatible en `package.json`; cambiarla globalmente no mejora el proyecto y puede dejar tu terminal sin una ruta válida.

Si usaste comandos del README anterior —`slice:build`, el smoke Web directo o la secuencia manual de Remotion— consulta [qué significan los errores y cómo recuperarte](01_intencion/guides/troubleshooting-old-commands.md). Esos comandos son recorridos de mantenimiento, no pasos necesarios para usar el asistente.

La fuente de verdad no es este texto por sí solo: contratos, registries, outputs materiales, receipts y gates siguen determinando qué ocurrió realmente.

## Autoría e identidad

Frames ContentOS es un producto MetodologIA, con autoría de Franklin Ospina y Javier Montaño. MetodologIA es la identidad visible del sistema; tecnologías y vendors son capacidades o fuentes, no sustitutos de la marca.
