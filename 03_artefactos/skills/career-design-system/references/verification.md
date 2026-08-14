# Verificación design-system-first

## Estática

- Hashes y referencias existen y coinciden.
- Exactamente dos composiciones y una decisión humana vigente.
- Cero colores literales fuera de `brand/tokens/brand-tokens.yml` y proyecciones.
- Cero red runtime, copy visible en JS, PII o componente no registrado.
- Font manifest y rights receipt resuelven Poppins/Montserrat; Trebuchet es sistema.

## Navegador

- 320, 375, 390, 768, 1024 y 1440 px; portrait/landscape; zoom 200 %.
- Navy/light, persistencia, sin flash material y print light.
- Teclado completo, skip link, foco visible, headings, landmarks y nombres AX.
- `<dialog>` con una X de 44×44, Escape, scroll interno y retorno de foco.
- Reduced motion, forced colors y JS-off.

## Contenido

- Hero ≤18 palabras; BLUF de card ≤20; detalle ≤55; diálogo ≤180.
- KPI con unidad/contexto/límite y sin apariencia porcentual falsa.
- Identidad, cargos, fechas, cifras, significado y atribución conservan paridad.
- El detalle emergente amplía; no repite ni oculta un hecho esencial.

## Estado

Un archivo ausente, hash divergente o runtime no reproducible produce `BLOCKED` o
`UNKNOWN`. Renderizar no implica aprobación, publicación o postulación. [CONFIG]
