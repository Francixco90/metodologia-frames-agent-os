# Recuperarte de los comandos del README anterior

Esta guía explica los mensajes que podían aparecer al seguir la antigua secuencia de construcción. Ninguno indica que debas publicar, borrar receipts o actualizar herramientas globales.

## Respuesta corta

1. Detén la secuencia cuando falle un comando.
2. No borres receipts ni outputs para “hacerlo pasar”.
3. Revisa `git status --short --branch` y conserva cualquier trabajo previo.
4. Para usar Frames, vuelve al modo conversacional; no necesitas reconstruir Web o Motion.
5. Para mantener el ejemplo técnico, usa los comandos corregidos de esta página.

## El aviso de actualización de pnpm

`Update available` es solo un aviso del gestor de paquetes. Frames fija Node y pnpm en `package.json`. Si `pnpm check:toolchain` termina en `PASS`, no actualices la instalación global.

El error `global bin directory ... is not in PATH` ocurrió al intentar `pnpm add -g pnpm`; no afecta al repositorio ni requiere `pnpm setup`. Continúa usando la versión aprobada por el proyecto.

## El smoke Web no encontró el HTML

El script antiguo resolvía la raíz desde el destino físico del symlink `scripts/` y terminaba buscando dentro de `05_verificacion/projects`. El artefacto real vive bajo `projects/` desde la raíz del repositorio.

La corrección usa el directorio de trabajo autorizado y ofrece errores explícitos. Ejecuta:

```bash
pnpm web:review
```

Este comando construye primero y solo después inspecciona. No publica ni abre red.

## La validación Motion encontró un conflicto append-only

Un receipt append-only no puede cambiar de contenido conservando el mismo ID. El mensaje protege evidencia anterior: significa que el candidate actual ya no coincide con la validación registrada.

No hagas esto:

- borrar el receipt;
- editar su hash;
- forzar el render;
- copiar un ID anterior sobre evidencia nueva.

Si solo quieres comprobar el repositorio, ejecuta:

```bash
pnpm slice:verify-compat
pnpm verify
```

Si realmente necesitas producir una versión Motion nueva, crea un candidate sucesor mediante el workflow de mantenimiento. Ese recorrido asigna nuevos IDs, vuelve a validar las fuentes y conserva la evidencia previa.

## El render dijo que cambió pnpm-lock.yaml

La validación anterior estaba ligada al hash de otro `pnpm-lock.yaml`. Como la validación nueva falló, los comandos siguientes intentaron usar el último receipt aceptado. Por eso `render:all` y `verify:media` también se detuvieron.

Evita continuar después de un fallo. Para un replay gobernado, usa la secuencia con parada causal:

```bash
pnpm remotion:prepare
pnpm remotion:validate && pnpm render:all && pnpm remotion:inspect
```

Si `remotion:validate` informa conflicto, termina allí y crea el successor; no ejecutes lo que sigue.

## Prompts recomendados

No necesitas describir la arquitectura. Expresa el resultado y, cuando importe, aporta audiencia, fuente y formato:

- “Ayúdame a convertir este informe en una presentación ejecutiva para que dirección decida entre dos opciones.”
- “Crea el brief de un carrusel de ocho láminas para explicar esta idea a clientes no técnicos.”
- “Mejora esta pieza conservando sus fuentes, identifica los gaps y detente antes de publicar.”
- “Quiero producir una nueva versión del ejemplo Motion. Revisa primero el estado, preserva los receipts existentes y propón un successor.”

Frames debe responder con lo entendido, hasta tres preguntas realmente bloqueantes y el siguiente gate. Una frase normal siempre prevalece sobre los menús.
