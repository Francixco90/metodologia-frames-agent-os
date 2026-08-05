---
name: dev-ponytail-audit
description: This skill should be used when se audita un repositorio completo buscando over-engineering — genera lista ranqueada de qué eliminar, simplificar o reemplazar con stdlib/nativo, reporte one-shot, no muta nada
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de ponytail-audit (DietrichGebert/ponytail, MIT).

Esta es una auditoría de repo completo, no de diff. Recorre el árbol entero
buscando over-engineering y devuelve una lista ranqueada de qué eliminar,
simplificar o reemplazar con stdlib/nativo. Reporte one-shot, lectura y análisis
solamente. El homólogo NO auto-muta el repo: lista hallazgos, aplica nada, y el
operador decide qué cortar tras confirmación explícita.

## Cuándo usarlo

Cuando el operador diga "audita este repo", "auditar over-engineering",
"qué puedo borrar de este repo", "busca bloat", "dev-ponytail-audit", o
"/dev-ponytail-audit". Una sola pasada, un solo reporte.

## Tags

- `delete:` código muerto, flexibilidad sin uso, feature especulativa. Reemplazo: nada.
- `stdlib:` cosa hecha a mano que ya viene en la librería estándar. Nombra la función.
- `native:` dependencia o código que hace lo que la plataforma ya hace. Nombra el feature.
- `yagni:` abstracción con una sola implementación, config que nadie setea, capa con un solo caller.
- `shrink:` misma lógica, menos líneas. Muestra la forma más corta.

## Caza

Dependencias que el stdlib o la plataforma ya traen, interfaces con una sola
implementación, fábricas con un producto, wrappers que solo delegan, archivos
que exportan una sola cosa, flags y config muertos, stdlib re-implementado a
mano.

## Formato de reporte

Una línea por hallazgo, ranqueado de corte mayor a menor:

```
<tag> <qué cortar>. <reemplazo>. [ruta]
```

Cierra con:

```
net: -<N> líneas, -<M> deps posibles.
```

Si no hay nada que cortar:

```
Lean ya. Ship.
```

El reporte es one-shot. No se iteran ni se abren sub-auditorías. Si el operador
pide profundizar en un hallazgo, entrega detalle en prosa, sin mutar el repo.

## Errores comunes

| Error                                                   | Por qué está mal                                 | Qué hacer                                          |
| ------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| Auto-borrar archivos tras la auditoría                  | Rompe fail-closed y `requires_user_confirmation` | Listar el hallazgo y detenerse; el operador decide |
| Aplicar fixes encontrados                               | El skill es read-only, no de refactor            | Entregar el reporte y salir                        |
| Mezclar bugs de corrección con over-engineering         | Fuera de scope; rutea a un review normal         | Marcar como out-of-scope y seguir                  |
| Auditoría de diff en vez de repo completo               | Confunde `ponytail-audit` con `ponytail-review`  | Esta skill escanea el árbol entero, no un diff     |
| Sin línea `net:` final                                  | Reporte incompleto                               | Siempre cerrar con `net:` o `Lean ya. Ship.`       |
| Fabricar hallazgos sin evidencia en código              | Claim sin fuente, no es `[CÓDIGO]`               | Solo listar lo que se puede señalar en una ruta    |
| Invocar red, git, tests o installs durante la auditoría | Rompe `network_allowed: false` y fail-closed     | Solo lectura local; cero side effects              |

## Límites

Scope: over-engineering y complejidad solamente. Bugs de corrección, huecos de
seguridad y rendimiento están explícitamente fuera de scope. Rutealos a un
review normal. Lista hallazgos, no aplica nada. One-shot.

`stop dev-ponytail-audit` o `normal mode` para revertir.
