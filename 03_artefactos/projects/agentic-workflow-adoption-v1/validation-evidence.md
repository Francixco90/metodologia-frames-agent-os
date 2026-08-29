# Evidencia de validación del expediente v1

Estado: `WAVE1_OWNER_SOURCE_VERIFIED · GUARDIAN_REVALIDATION_PENDING`.

Este informe registra observaciones reproducibles del SHA fijado de cada donante y de las
proyecciones creadas en Frames. No acredita implementación del kernel, activación de ruta, H01,
publicación, distribución o entrega. [METODOLOGIA] [CONFIG]

## 1. Bindings de repositorio

| Fuente            | Commit SHA-1                               | Tree SHA-1                                 | Git archive SHA-256                                                |     Bytes | Files tracked |
| ----------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------ | --------: | ------------: |
| Propuesta-Medida  | `e0d6ba4576b23c83a6b22dbad53e23a8795b26d0` | `457920d64756549eb4862b2653e2bf293d332ab9` | `adb8a27e74dd44312834705f4f21f5af594fccfd4571e550f2057cbb65ee1bb3` | 1 576 960 |            76 |
| Technical Defense | `78fd3834acd38cf4b6ace7f7f1ed9c06893300f3` | `467691b625de2590171290d2dff779a791749f8c` | `dc48f6e6cde67e5c9d092fc3af806a575933c635c4d939403d0385b2e9b99a61` |   174 080 |            44 |

Comandos conceptuales reproducibles, ejecutados contra checkouts limpios y detached:

```sh
git rev-parse HEAD 'HEAD^{tree}'
git archive --format=tar HEAD | shasum -a 256
git ls-tree -rz --full-tree HEAD | shasum -a 256
git ls-tree -r --name-only HEAD | wc -l
```

Tree-listing SHA-256: Proposal
`ca7edbfec3253e676a13fcee8ff7784308a3a342501161c32719c000543c4ef9`; Defense
`a7571dbec7e2b09b30c212d160f243b1984222e6678ffa1642030fbd99c34b8a`. [HERRAMIENTA]

## 2. Replays de selected-path manifests

Cada row se regeneró desde el Git object exacto como:
`path<TAB>blob_sha1<TAB>file_sha256<TAB>bytes<LF>`. Se comprobó orden bytewise, igualdad byte a
byte y dos hashes de replay.

| Fuente   | Paths | Manifest SHA-256                                                   | Replay 1 | Replay 2 | Resultado |
| -------- | ----: | ------------------------------------------------------------------ | -------- | -------- | --------- |
| Proposal |    22 | `6d63babbead317c234a1b97e92825da4fbc0d86f8aa92e9156d24513ed1c25cc` | igual    | igual    | PASS      |
| Defense  |    27 | `13ef17a7a33677d31cee125f6087b87259e4fc83cf641384721dd861d04ecf34` | igual    | igual    | PASS      |

El primer intento detectó y corrigió antes del freeze un orden no canónico entre `builder.py` y
`business_case.py`. El PASS anterior corresponde a los bytes corregidos y reejecutados; no se
oculta el rework. [HERRAMIENTA] [DOC]

## 3. Proyecciones versionables

| Fuente   | Descriptor                                                         | Selected projection                                                | Rights projection                                                  |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Proposal | `e3bf872833b8845b98d0889c3606c2ab814a7701881041590964f92d0b365df1` | `f73aa35c9e74bf0a6189e7a1e2b55a5777e0d6a961e8e1068b5752d16c6f6853` | `3c6ab32d388c51ef4ad8544aa63101f64536f09cb273b6eadc35175bfb204665` |
| Defense  | `75c3b76c6083ef86e67aeb588b2b812581c90238c530ea88c2ccc2259cbae23d` | `f34f7bb4ffd0a12a9894804972a039b5af7cde5712c211cadaec2ed7350ae18b` | `e69d9769d950e4491efedac41a028ce56d2330584e6eb46e26f41164c570b67c` |

Readback verificó hash y bytes de cada locator del descriptor. Ningún archivo del expediente tiene
el mismo SHA-256 completo que uno de los 120 blobs tracked únicos de los donantes: intersección
`0`. Esto prueba ausencia de copia byte-idéntica en el conjunto medido, no equivalencia a un DLP
semántico. [HERRAMIENTA] [INFERENCIA]

## 4. Receipts v2 físicos

Contrato: `pinned_repository_source_transition_v2`; sin self-hash; `previous_receipt_sha256` liga
los bytes físicos del evento anterior.

| Fuente   | candidate                                                          | quarantined                                                        | evaluated                                                          |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Proposal | `9269f3c6d7b6dbb7e29521312dba2dcc553fe6247c322a96613bb88b3ce1cfbb` | `8533d64e197d8de46af7b95927afb384b6ad8b7da76e0b0d34fb41ce985dd7b5` | `442ca5f9b7cc61ae0f6f8b245c4aa8c83183bab6c5969b85bb2def362ab239f6` |
| Defense  | `1d92237dd1a037e5891f8f66e43cbb937bb410b53beb8ecfe3ecf00474c0e872` | `fc2115c212d896326b100ef58c747f5f3de96623b10f3f49ae1deac8a5dd35d5` | `17f6aab2ec922f3121ba53ab9c29f4d2c4e1a208cb765495e672264ca6b0c294` |

Readback local:

- tres eventos continuos `null → candidate → quarantined → evaluated` por fuente;
- IDs ligados a source/orden, `package_id` estable y timestamps estrictamente monotónicos;
- `actor_id != verifier_id` en los seis eventos;
- repository, evidence projection, rights y restricciones idénticos dentro de cada cadena;
- autoridad y deduplicación pendientes antes de evaluación, e idénticas al registry en `evaluated`;
- todo gap retirado tiene una resolución explícita; la limitación pattern-based sigue documentada
  y no se presenta como DLP formal;
- review final acredita integración y cadena física, pero conserva Guardian independiente pendiente;
- commit/tree de 40 hex con `git_object_algorithm: sha1`;
- scope `internal_typescript_reimplementation_only`, rights verdict
  `allowed_internal_implementation`, external distribution false;
- exactamente seis restricciones y cero transición `active`.

La integración/readback del Governance owner pasó. `pnpm check:sources` emitió PASS con 13 fuentes
y corpus canónico `0/4` fail-closed; siete suites contract, negative e integración del runner
productivo pasaron 43/43. La reauditoría independiente recomputó 14/14 bindings físicos y 6/6
enlaces `previous_receipt_sha256`, sin HIGH ni MEDIUM residuales en este bloque. La revalidación
Guardian de la adopción completa sigue pendiente. [CONFIG] [HERRAMIENTA]

## 5. Tests del donante Proposal

Comando:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src:. <PYTHON_3_11> -m unittest discover -s tests -v
```

Resultado: exit `1`; 55 tests, 54 PASS, 1 FAIL. Falla exacta:
`test_package_manifest_recomputes_exactly`.

Readback no mutante de `build_manifest()`:

- persisted/observed: 75/75 paths;
- only persisted/only observed: 0/0;
- única diferencia: `control/graphs/runtime-graph.json`;
- persisted: SHA-256 `465bc0c5e75363426785e3d4ec065a28a49be6bc934e4bfccfb52314eb947d67`,
  10 164 bytes;
- observed: SHA-256 `776d573e9c05a19937eb12fd45a9a6889d3789adaf7cfb9ba4abd294f90264fb`,
  9 821 bytes.

El checkout permaneció limpio. [CÓDIGO] [HERRAMIENTA]

## 6. Tests del donante Technical Defense

Comando:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src <PINNED_PYTHON> -m unittest discover -s tests -v
```

Resultado: exit `0`; 28/28 PASS. Validadores adicionales:

- manifest: 43 entries cerradas, PASS;
- gitignore/lock: PASS;
- privacy scan del donante: PASS;
- graph: PASS, digest
  `1E3F5CD28E252CFD74123891CBDC03BDB12D5668EBF59451BF850277DD16F809`;
- JSON Schema Draft 2020-12: 9 schemas, PASS.

La prueba adversarial inyectó un writer ajeno entre precheck y `os.link`. El writer creó el target
con bytes idénticos y levantó `FileExistsError`; el runtime devolvió `SUCCEEDED`. Result y target
compartieron SHA-256
`FF7479507D5C90392210ED5B3A0B952A19138F75B9213044A01C4A095B5B2A8F`. La reproducción usa solo un
directorio temporal y no muta el donante. [CÓDIGO] [HERRAMIENTA]

## 7. Formato, estructura y privacidad del expediente

- Prettier scoped: PASS.
- YAML parse: 14 documentos, PASS.
- Debate: 5 tensiones, 4 voces en cada una y cierres decisión/evidencia/contraejemplo/gap, PASS.
- Tags: 9/9 presentes — `[METODOLOGIA]`, `[NEUROCIENCIA]`, `[PEDAGOGIA]`, `[INFERENCIA]`,
  `[SUPUESTO]`, `[CÓDIGO]`, `[CONFIG]`, `[DOC]`, `[HERRAMIENTA]`.
- Scan high-confidence secrets/credential assignments: 0 matches.
- Locators locales absolutos: 0; symlinks: 0; archivos mayores a 5 MiB: 0.
- Marcas/contextos privados fuera del alcance: 0 matches.
- URLs: solo las dos URIs canónicas de los repositorios donantes.

El scan es pattern-based y contextual; no es DLP/entropy analysis formal. [HERRAMIENTA]

## 8. Gates Wave 1, no ejecutado y efectos externos

- `pnpm check`: PASS, incluidos repo, privacidad, sources, documentación, atemporalidad, budgets,
  ownership, DAG y tasks.
- `pnpm typecheck`: PASS observado por lead y reviewer independiente.
- Source contract + negative + runner productivo: 7 files, 43/43 tests, PASS.
- `check:privacy`: PASS sobre 6.620 archivos versionables; el caso adversarial construye el locator
  privado solo en runtime y el scanner no exime la suite de integración.
- Cápsula de cambio: 122 archivos authored, 10.759 LOC, exact path set y hash canónico PASS;
  `LOCAL_SIMULATION`, baseline y rama ligados.
- Kernel, adapters V2, R6, R8, pilotos, crash injection, browser/Chrome y H01: `NOT_EXECUTED`.
- Network: solo lectura de referencias Git fijadas; no hubo provider execution.
- Mutaciones externas: 0; no push, merge, publicación, distribución, entrega o activación.

El primer freeze Guardian quedó en `REWORK`: detectó límites globales relajados, una mutación de
router declarada pero inexistente, paridad R10 incompleta y metadatos desactualizados. La
remediación restaura los hard caps globales y traslada únicamente dos excesos de líneas a la
cápsula branch/base/hash-bound; las palabras conservan sus límites originales. El PASS Guardian
independiente sobre el nuevo digest sigue pendiente y este documento no lo anticipa. [CONFIG]

`[SUPUESTO] user_authorized_internal_implementation` sigue siendo el único fundamento de alcance
adicional a la licencia interna observada en Defense. Proposal no presentó LICENSE tracked en el
SHA evaluado. [SUPUESTO] [DOC]

`[NEUROCIENCIA]` No se realizó ni se requiere validación neurocientífica.

`[PEDAGOGIA]` No se validó eficacia pedagógica; el diseño de ensayo es únicamente operacional.
