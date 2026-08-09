# Guías de Frames ContentOS

Estas guías están escritas para personas que quieren lograr un resultado, no para quienes ya conocen la arquitectura del repositorio. Puedes leer solo la que responda a tu necesidad y volver a la referencia técnica cuando quieras inspeccionar cómo se gobierna el trabajo.

## Elige por lo que quieres lograr

- **Quiero saber si Frames me sirve:** [capacidades y límites](capabilities.md).
- **Quiero empezar sin aprender comandos:** [uso guiado](guided-use.md).
- **Quiero crear contenido, una campaña o una presentación:** [contenido y multimedia](content-multimedia.md).
- **Quiero mejorar mi CV o buscar empleo:** [Career OS](career.md).
- **Quiero entender rutas, workflows y verificaciones:** [referencia técnica](technical-reference.md).

## Recorrido recomendado

1. Expresa el resultado con una frase normal.
2. Revisa cómo Frames interpretó tu pedido.
3. Responde solo las preguntas que cambien el trabajo.
4. Aprueba o ajusta el brief.
5. Revisa los entregables intermedios y la versión candidata.
6. Autoriza por separado cualquier acción externa.

Si todavía no sabes el formato, describe el efecto que buscas: “quiero que el equipo entienda esta decisión” es una mejor entrada que elegir una herramienta por anticipado.

## Si prefieres comandos

Puedes inspeccionar la asistencia local sin producir archivos:

```bash
printf '%s\n' 'Quiero convertir este informe en una presentación ejecutiva' | pnpm frames:assist
```

Usa `/menu` para ver entradas breves y `/ruta` para inspeccionar el recorrido sugerido. `--apply` solo debe usarse cuando la información de entrada, el espacio de trabajo y los efectos estén claros.

## Cómo leer los estados

- **Disponible:** existe un recorrido verificable y un output material local.
- **Asistido:** Frames prepara decisiones, documentos o especificaciones; una persona o herramienta autorizada completa una parte.
- **Preparado:** el paquete queda listo para una acción externa, pero no la ejecuta.
- **Bloqueado:** falta evidencia, autoridad, generador, derechos o aprobación.

Esta distinción protege al usuario de promesas que el runtime todavía no puede demostrar.
