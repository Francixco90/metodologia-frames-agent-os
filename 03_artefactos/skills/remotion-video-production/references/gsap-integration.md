# gsap-integration

## Estado

Mantener GSAP deshabilitado hasta aprobar un ADR, fijar versión/licencia y añadir la dependencia
mediante el writer autorizado.

## Contrato si se habilita

- Crear timeline pausada.
- Derivar progreso exclusivamente del frame.
- Aplicar `seek()` o progreso explícito sin reloj wall-clock.
- Desactivar `gsap.ticker`.
- No registrar plugins no autorizados.
- Limpiar instancias de forma estable.
- Probar procesos frescos y concurrencia 1/N.

## Fallback

Preferir `interpolate()`, `spring()` y composición nativa cuando expresen el movimiento. Si GSAP no
supera determinismo o licencia, volver a implementación nativa; no desactivar el gate.
