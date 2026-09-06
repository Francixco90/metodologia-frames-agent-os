# Manifiesto de activos y usos

Versión: `v1.0`
Propietario: `MetodologIA`
Estado: `ACTIVE_CONTROL`

Este manifiesto publica identidades portables y reglas de uso. No contiene rutas privadas. La identidad exacta se resuelve por `asset_id` y `content_sha256`. [METODOLOGIA]

## Familia de logo

| `asset_id`                            | Formato | Hash SHA-256                                                       | Estado                     | Uso permitido         | Bloqueo                              |
| ------------------------------------- | ------- | ------------------------------------------------------------------ | -------------------------- | --------------------- | ------------------------------------ |
| `AST-METODOLOGIA-SYMBOL-SVG`          | SVG     | `c5f61d882485b3b718654529b7ae62d923ea32142025389c23985471372e7aa6` | `READY_FOR_HUMAN_APPROVAL` | ninguno todavía       | aprobación del propietario           |
| `AST-METODOLOGIA-LOCKUP-POSITIVE-SVG` | SVG     | `c0958b6a18e791651e5c237328c4350af8bf3c8d1225aa9f96926389250ec927` | `READY_FOR_HUMAN_APPROVAL` | ninguno todavía       | aprobación del propietario           |
| `AST-METODOLOGIA-LOCKUP-REVERSE-SVG`  | SVG     | `40dc02db27ad128b1b84026163a0116efe7ed278821b84e881f035c9aa4cd529` | `READY_FOR_HUMAN_APPROVAL` | ninguno todavía       | aprobación del propietario           |
| `AST-METODOLOGIA-LOCKUP-POSITIVE-PNG` | PNG     | `46c8c13686c8f9fd4c48c9ce75bf3bb65689a1085fdec9cd0e2c26384f78ed3b` | `READY_FOR_HUMAN_APPROVAL` | ninguno todavía       | derivado de SVG no aprobado          |
| `AST-METODOLOGIA-SYMBOL-PNG`          | PNG     | `cb93a22d5552755a4b05858f8693db060a3be14dd19bd58991a0bc6863165b3f` | `READY_FOR_HUMAN_APPROVAL` | ninguno todavía       | derivado de SVG no aprobado          |
| `AST-METODOLOGIA-LEGACY-SQUARE-PNG`   | PNG     | `938b6e675c04d0c4a52895eb8e092d8c72e835ef9c52a6dd4e28d7c476ab726a` | `DO_NOT_USE_FINAL`         | comparación histórica | raster, sombra y reemplazo pendiente |

Regla: el notebook puede describir la familia candidata, pero no puede insertarla en una pieza final. Nunca genera, redibuja, recolorea o deforma el logo. [METODOLOGIA]

## Personas y mascota

| `asset_id`                       | Sujeto                          | Hash SHA-256                                                       | Estado     | `allowed_uses`                                                       | Bloqueo                                |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------- | -------------------------------------- |
| `AST-PORTRAIT-JAVIER-MONTANO`    | Javier Montaño                  | `4cac6ea8b4e303c1e0a27573736114f46ffb1b8783745d1ac1335b4f02da756d` | `APPROVED` | perfil de equipo, bio de fundador, speaker card, contenido editorial | ninguno dentro de esos usos            |
| `AST-PORTRAIT-KATHERINE-OQUENDO` | Katherine Oquendo Lopera        | `493e6da2ffaa9ca65d7379f9ca64b0acc96ab384048a464b7fe7de22a0d237a3` | `REVIEW`   | ninguno                                                              | consentimiento y alcance faltantes     |
| `AST-PORTRAIT-DANIEL-ZULUAGA`    | Daniel Felipe Zuluaga Marulanda | `6f3ecf26f043e554bea735e03706be1e1ca5f41cd9d9ed07f1353b060df2d1f7` | `REVIEW`   | ninguno                                                              | consentimiento y alcance faltantes     |
| `AST-PORTRAIT-GERMAN-SEPULVEDA`  | Germán Sepúlveda Barbosa        | `35547326e603349f6f22bc4a5d460d41c82915568b1917a20d72dafa66dc6ba1` | `REVIEW`   | ninguno                                                              | consentimiento y alcance faltantes     |
| `AST-PRISTINO-MASCOT-CANDIDATE`  | Prístino                        | `5530750d714aeeead6689361eb6f7ea413581696432e4c7d0c4cd124ce751342` | `REVIEW`   | ninguno                                                              | rol de marca y derechos no confirmados |

El uso aprobado de Javier no autoriza atribuciones personales no presentes en una fuente ni amplía los cuatro contextos declarados. [METODOLOGIA]

## Referencias artísticas

`ART-01` a `ART-08` son referencias internas. Pueden orientar composición, metáfora y lenguaje visual; no se publican como activos independientes ni conceden derechos de reproducción. [METODOLOGIA]

## Resolución

Si un brief solicita un activo:

1. resolver `asset_id` y hash;
2. verificar `status` y `allowed_uses`;
3. comprobar que el uso concreto está incluido;
4. bloquear si falta consentimiento, derecho o aprobación;
5. registrar el activo exacto en el receipt.
