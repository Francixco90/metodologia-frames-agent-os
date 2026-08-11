# Contrato de calidad de CV

## Recruiter y ATS

La primera página comunica rol, propuesta de valor y evidencia reciente. El
orden de lectura es lineal, los títulos son semánticos y el texto es
seleccionable. Información esencial no depende de íconos, color, columnas
frágiles ni gráficos. [METODOLOGIA][CONFIG]

## Spec como autoridad

Compilar solo desde una `cv-spec-v2` en `HUMAN_APPROVED`. Ligar brief,
Evidence Bank, vacante cuando aplique y outputs al `spec_sha256`. Un cambio en
cualquier binding invalida derivados y aprobaciones; no se corrige el output
como fuente. [METODOLOGIA][CONFIG]

`cv-spec-v1` y `cv-package-v1/v2` son contratos de compatibilidad. Solo pueden
entrar por los migradores explícitos v1→v2 y v2→v3; la migración invalida la
aprobación previa y nunca infiere una decisión visual. Ningún checker, fixture
principal o paquete nuevo puede declararlos como autoridad activa.

## Paridad

Markdown es fuente editorial. HTML y PDF preservan secciones, claims, fechas,
métricas, idioma y enlaces. El manifest liga hashes materiales; un output
declarado pero inexistente bloquea.

La paridad bilingüe se observa por campo: identidad, rol, fechas, métricas,
atribución y claim→evidencia. Coincidencia de conteos o un `PASS` escrito en el
manifest no constituyen evidencia. Cada output debe existir, coincidir con su
hash y ocupar exactamente una celda de la matriz variante→formato. Cada
variante conserva `source_document_ref` y `source_document_sha256` propios; la
paridad se comprueba entre fuentes localizadas, no contra un único hash global.
El paquete activo es `cv-package-v3`: cada variante ATS declara `ats-neutral` y
cada HTML ejecutivo liga sistema, decisión humana, composición y tema vigentes.

ATS DOCX conserva una columna, bullets nativos, contacto en body y orden de
lectura extraíble; no usa tablas, text boxes, dibujos, headers ni footers. ATS
PDF conserva texto seleccionable y enlaces. HTML ejecutivo debe funcionar sin
JavaScript, reflow a 320 px y soportar `prefers-reduced-motion`.

El análisis estático de HTML bloquea JavaScript, assets remotos, contenido
oculto y segmentos sobre el presupuesto. No sustituye un render: reflow,
impresión y paginación real quedan `UNKNOWN` sin navegador y receipt. PDF queda
`UNKNOWN` si falta el toolchain; archivo ausente, texto vacío, links no
observados o páginas excedidas producen `BLOCKED`.

## Adaptación

La matriz requisito→evidencia controla selección y omisiones. Un gap puede
quedar visible en el decision record, nunca maquillado en el CV. Reduce
repetición antes de eliminar evidencia. Dos páginas son una restricción del
brief, no una razón para condensar hasta perder legibilidad.

## Veredictos

Reportar `PASS` solo con evidencia material observada. Renderer ausente,
runtime sin pin o replay divergente produce `UNKNOWN` o `BLOCKED`. No asignar
porcentajes de compatibilidad ATS sin una herramienta real, método y receipt.
`PUBLISHED` requiere un receipt externo existente, con hash verificado y
`ready_package_sha256` ligado al paquete `READY` predecesor. El estado publicado
recibe un nuevo hash que incluye el receipt; los demás estados exigen receipt
nulo.
