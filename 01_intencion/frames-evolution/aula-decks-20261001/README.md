# Aula y decks: integración ejecutable

[METODOLOGIA] Dieciocho skills originales: ocho formatos educativos y un deck comercial, en MetodologIA y marca blanca. Motor Python stdlib con HTML local autónomo; bancos de assets opcionales fijados por SHA-256. Los paquetes y su código propio tienen licencia MIT; no se reutiliza código restringido de Amaris.

## Arquitectura y recorrido

El selector recomienda por intención. Brief aprobado → especificación revisada → aprobación de especificación → WorkOrder Aula con inputs y outputs hash-bound → handler → receipt → revisión. Una skill activa permite generar RENDERED_DRAFT; no concede aprobación humana ni permiso de publicación.

El recorrido comienza con `pnpm frames:assist`. La continuación Aula recibe referencias explícitas al brief actual, su receipt, el contenido y las aprobaciones. `pnpm frames:aula` ofrece inspección sin escritura y ejecución con contrato. Las referencias deben quedar dentro del workspace y en su read/write set.

Decks requieren intake y especificación actuales aprobados; una aprobación global no los sustituye. MetodologIA es predeterminada; marca blanca se solicita explícitamente. Trainer, workshop y privacidad mantienen sus estados de evaluación separados.

## Fuente y generación

Una única fuente mantenible reside en `03_artefactos/renderers/frames-aula`. El builder empaqueta las 18 skills conservando su ciclo gobernado; `--check` verifica drift sin modificar fuentes y `--no-canonical` genera copias externas. Los ZIP individuales y bundles tienen metadatos deterministas. Frames OS consume exactamente el mismo snapshot y contratos del motor mediante un bridge.

El sucesor `1.0.1` localiza el idioma/título iniciales, etiquetas accesibles y estado de borrador en ES/EN/PT/FR desde una tabla común. Los bancos permanecen en `v1.0.0` con sus hashes originales.

El sucesor `1.0.2` rechaza configuraciones de marca blanca ilegibles sobre las superficies reales, valida tipos de colores y aplica los mismos fallbacks del renderer. Texto conserva 4.5:1 y foco requiere 3:1. No modifica CSS/JS ni incorpora modo oscuro.

## Uso y verificación

Cada skill contiene contrato, ejemplo neutral, engine lock y `scripts/check.py`. `pnpm verify:aula` comprueba selección, contratos, integridad y fallos hostiles; pertenece a la cadena de verificación y CI. Los sensores de navegador verifican escritorio/móvil, copia, foco, idiomas, módulos y movimiento reducido. Las fixtures sintetizan decisiones humanas exclusivamente para probar contratos.

La compatibilidad de pruebas R8 valida los bytes históricos y la evidencia del probe antes de ligar el runner actual únicamente en una copia temporal. No renueva el probe productivo ni activa privacidad; sus 43 contratos originales y un guard adicional se conservan.

## Compatibilidad, derechos y límites

Referencias históricas 0.4.0, 0.7.2 y 0.8.1 orientan capacidades; no acreditan paridad. La versión1.0.x tenía cinco escenas locales;1.1.0 incorpora16 en el núcleo y160 composiciones originales en cada banco, sin copiar geometría restringida. Migración explícita con informe de pérdidas. Office exporta texto estático con plantilla y dependencias opcionales; no conserva interactividad. Procedencia y hashes de hechos no verifican automáticamente su verdad.

Bancos históricos 1.0.x: JaviMetodologIA/metodologia-aula-assets y JaviMontano/white-label-aula-assets, release v1.0.0. Licencia MIT del código y assets originales no concede derechos sobre marcas.

## Publicación y recuperación

El usuario autorizó implementación, PRs y merge a ambos repositorios actuales, más nuevo sucesor público. Se publican solo fuentes, paquetes, tests portables y receipts sanitizados. Evidencia privada y proyectos ajenos quedan fuera. Cada commit se revisa por verifier y Guardian distintos del productor; cualquier cambio posterior genera successor.

Rollback: revertir únicamente los commits de la integración, sin reset, limpieza ni mezcla de historias públicas/privadas. El snapshot común permite reconstruir paquetes y reproducir ejemplos. Jarvis permanece en fallback local mientras no se acredite su binding.

El sucesor `1.0.3` normaliza los colores parciales con la misma paleta efectiva usada por la validación, evitando trazos SVG ausentes. También rechaza nombres de marca de tipo incorrecto o vacíos. Las evaluaciones anteriores son inmutables; una evaluación nueva liga los paquetes actuales y los ejemplos siguen `RENDERED_DRAFT`.

## Sucesor inmersivo1.1.0

[METODOLOGIA] Las18skills comparten motor, núcleo32iconos/16escenas y perfil tipográfico local. MetodologIA usa Poppins/Montserrat y navy/oro; marca blanca ofrece perfil neutral. Bancos opcionales v1.1.0:256iconos/160composiciones, ZIP runtime separado de galería, hashes en cada pin. El repositorio completo no es un directorio runtime válido: instalar el ZIP verificado antes de usar --bank.

[METODOLOGIA] Autoría nueva de presentaciones:8slides comercial y13académica, con extensión explícita autorizada por el brief. Documentos históricos mantienen su extensión; ejercicios y workbooks conservan unidades propias. Campos desconocidos o incompatibles bloquean antes de escribir. Especificaciones, aprobaciones y receipts ligan contenido, motor, perfil, fuentes y piezas seleccionadas. Índices entregan companions reales; impresión conserva tabs/revelado.

[METODOLOGIA] Tres referencias nuevas congelan la oferta pública y el programa oficial:brochure8, programa compacto8 y ampliado13. Son RENDERED_DRAFT. Sus horarios didácticos y decisiones de diseño son supuestos; fuentes públicas no prueban resultados de participantes. Entrenador mantiene sus gates separados.
