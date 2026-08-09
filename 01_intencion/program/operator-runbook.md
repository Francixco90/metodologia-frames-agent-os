# Runbook operativo

## 1. Preflight

```bash
pnpm install --frozen-lockfile
pnpm check:toolchain
pnpm check:dag
pnpm check:ownership
pnpm check:sources
pnpm check:claims
pnpm check:notebooklm
```

`check:toolchain` usa por defecto el perfil `local-full`: exige Node, pnpm, Remotion, Zod y FFmpeg
exactos. La CI usa explícitamente `METODOLOGIA_TOOLCHAIN_PROFILE=ci-code-only`; ese perfil valida
solo el toolchain de código y declara el render/FFmpeg como cobertura local pendiente. Nunca debe
usarse para conceder `RENDER_VALIDATED`.

Detenerse si una fuente activa no resuelve a hashes, derechos, autoridad y receipts; si el corpus
canónico sigue incompleto, conservar `source_locked: false`. [CONFIG]

## 2. Reconstruir el vertical slice

```bash
pnpm slice:build
```

El comando valida adapters y skills, reconstruye Content/Web, prepara Remotion y emite un receipt
`PREFLIGHT_VALIDATED`. No abre un gate humano ni ejecuta publicación.

Este paso modifica outputs gobernados. Úsalo únicamente sobre un candidate limpio y detente ante el primer error. Para una comprobación ordinaria usa `pnpm slice:verify-compat`, que valida el slice existente sin reconstruirlo.

La revisión Web completa usa un único comando con parada causal:

```bash
pnpm web:review
```

## 3. Render local

```bash
pnpm remotion:prepare
pnpm remotion:validate && pnpm render:all && pnpm remotion:inspect
```

La primera línea prepara inputs. La segunda usa `&&` deliberadamente: si la validación falla, no se renderiza ni se inspecciona evidencia anterior. Un conflicto `Append-only` significa que la identidad existente pertenece a otros bytes; no borres ni sobrescribas el receipt. Congela un successor con nuevos IDs y vuelve a ejecutar desde ese candidate. `Validated input changed` después de un fallo no es un segundo defecto: indica que el render intentó usar la última validación aceptada y debe detenerse.

El render debe usar Chrome Headless local, concurrencia fijada, assets vendorizados y cero red
externa. `remotion:inspect` exige video-only, perfil esperado, fotogramas de revisión, dos renders
completos con digest normalizado idéntico y receipts portables.

## 4. Verificación

```bash
pnpm check:repo
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm audit --audit-level high
pnpm web:review
```

La inspección Web usa Playwright fijado en el lockfile y el canal local de Chrome estable. Puede
usarse `CHROME_PATH` como override explícito cuando el entorno no exponga ese canal.

Revisar además:

- desktop/mobile del artefacto Web;
- primer y último frame;
- pre/durante/post de cada transición;
- safe zones, contraste, captions y ritmo;
- matriz adversarial audiovisual;
- diff limpio después de reconstruir outputs deterministas.

El playback editorial completo y la accesibilidad visual humana se registran como pendientes si no
los ejecutó una persona independiente. [coverage_gap]

## 5. Añadir fuentes reales

1. Crear un receipt `candidate` con bytes exactos y SHA-256.
2. Normalizar de forma declarada y deduplicar.
3. Resolver procedencia, autoridad, derechos y uso permitido.
4. Evaluar con un verifier distinto.
5. Promover mediante receipts append-only; nunca reescribir historia aceptada.
6. Actualizar claims solo desde el snapshot promovido.

Los cuatro textos canónicos deben ocupar cuatro slots de una sola fuente lógica antes de conceder
`SOURCE_LOCKED`.

## 6. NotebookLM y n8n

- NotebookLM: suministrar un binding ya resuelto; conservar solo digest, pregunta, cobertura y
  fuentes portables. Cada contrato `RT-01..RT-11` y los manifests de los cuatro workflows deben
  declarar propósito, pregunta, source IDs y partición de cobertura. Si falta el binding, conservar
  `mode: none`, cero evidence refs y devolver `coverage_gap`.
- n8n: usar únicamente el adapter v2 dry-run. Un package real requiere hashes resolubles, receipt de
  render, H01 canónico, callback, reintentos, kill-switch e idempotencia.

Ninguno de los dos adapters se activa desde este runbook.

## 7. Guardian, H01 y release

El Guardian lee outputs y evidencia después de QA, escribe su veredicto separado y no remedia. Un
Guardian pass no sustituye H01. H01 debe aprobar artifact, versión, hash, condiciones y riesgos.
Release y publicación necesitan una autorización adicional; por defecto permanecen bloqueados.

## 8. Recuperación

- Hash cambiado: reconstruir desde inputs fijados; no editar el receipt anterior.
- Render no determinista: detener el gate, comparar framemd5, fonts, locale, timezone y assets.
- Asset o licencia ausente: retirar del build o cuarentenarlo.
- Dependencias fuera de sync: ejecutar explícitamente `pnpm install --frozen-lockfile`; los scripts
  no reinstalan automáticamente.
- Conector incierto: mantener inactive/dry-run y devolver `coverage_gap`.
