# Diseña y mejora skills sin duplicar el sistema

Esta guía sirve cuando quieres que Frames aprenda una forma de trabajo repetible:
crear una skill, mejorar una existente, dividir responsabilidades, añadir una
evaluación o preparar una versión nueva. No necesitas conocer S00–S09 ni H-03.

## Empieza por el resultado

Describe el trabajo que quieres facilitar y un ejemplo realista. Frames buscará
primero si ya existe una skill, una referencia, un template o una herramienta que
lo resuelva. Solo propondrá una skill cuando el criterio sea repetible y necesite
activación, límites y evaluación propios.

Ejemplo: «Quiero una skill que revise los prompts de imagen antes de entregarlos y
detecte derechos, datos privados, instrucciones hostiles y claims sin evidencia».

## Qué ocurre después

1. **Caso:** aclara utilidad, evidencia, alcance y máximo tres gaps bloqueantes.
2. **Arquitectura:** asigna cada responsabilidad al componente más pequeño.
3. **Contrato:** fija inputs, outputs, efectos, fallback y aceptación observable.
4. **Candidate:** crea el paquete en dry-run o dentro de un WorkOrder aprobado.
5. **Validación:** revisa estructura, seguridad, supply chain y paths.
6. **Evaluación:** compara contra no usar skill o contra la versión anterior.
7. **Revisión:** separa producer, reviewer y Guardian.
8. **Release:** congela hashes, compatibilidad, restore y documentación.

## Dos oráculos, una sola autoridad

Frames usa sus contratos como autoridad. Para trabajo creativo y multimedia puede
aplicar PIVOTE como segundo oráculo: comprueba grafo de artefactos, derechos,
accesibilidad, disclosure, prompts, provenance y recuperación. Si difieren, el
resultado no se promedia: se revisa o bloquea hasta resolver el conflicto.

La nueva `skill-security-auditor` se ocupa de prompt injection, secretos, paths,
dependencias, expansión de permisos y sandbox. No corrige el mismo candidate que
audita ni sustituye RT-09 o RT-11.

## Entregables reutilizables

Frames incluye templates Markdown y HTML equivalentes para:

- caso de sistema de skills;
- plan de assets, scripts, referencias y templates;
- revisión con dos oráculos.

Cada par tiene de seis a trece secciones, CSP offline, impresión, dark mode, meta
tags, placeholders visibles y un modelo JSON común. El Markdown y el HTML se
regeneran; no se mantienen como dos documentos editoriales independientes.

## Límites honestos

El paquete PIVOTE observado pasa sus checksums y 26 pruebas de `specops`, pero su
packager exige una raíz con otro nombre y no reproduce el self-test desde el layout
entregado. Además, ninguna fuente prueba proveedores, media o publicación. Esas
capacidades siguen `UNKNOWN` o `NOT_EXECUTED` hasta evidencia material.

## Siguiente paso

Habla con Frames o usa [ampliar Frames localmente](extend-frames.md). Para una
capacidad privada, R8 conserva todo fuera de Git. Para una capacidad canónica, R9
exige WorkOrder, documentación transversal, H-03, RT-09, RT-11 y aprobación humana.
