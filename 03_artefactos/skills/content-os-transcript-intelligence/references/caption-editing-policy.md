# Política de edición de captions

## Claridad mínima

1. Corregir errores ASR respaldados por autoridad.
2. Canonizar nombres, cifras y términos técnicos verificados.
3. Retirar muletillas aisladas y falsos arranques que no cargan emoción o intención.
4. Conservar gramática oral, dialecto, registro, code-switching y repeticiones enfáticas.
5. Mantener el tiempo del token fuente corregido; al retirar tokens, conservar la ventana
   del pensamiento completo.

Ejemplos sintéticos:

- `archivo de XE` → `archivo de Excel` si el glosario u OCR confirma Excel.
- `un prom de alto rendimiento` → `un prompt de alto rendimiento` si el dominio y la
  autoridad confirman el término.
- `el API returns un error` permanece bilingüe.
- Una cifra dudosa no se “arregla”: bloquea hasta revisión.

## Divergencias permitidas

Toda diferencia entre literal y caption aparece en `correction-ledger.json` con
`sourceSpan`, `before`, `after`, `reason`, `authorityRefs` y `material`. No se permite una
divergencia sin ledger.

## Accesibilidad

Preservar identificación de hablantes cuando sea necesaria, sonidos no verbales materiales,
timebase, encoding y safe areas. El compositor visual decide cortes de línea y estilo; esta
skill decide texto y trazabilidad.
