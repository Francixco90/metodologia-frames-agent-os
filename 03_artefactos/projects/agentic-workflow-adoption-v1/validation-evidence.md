# Evidencia de validación del expediente v1

Estado: `WAVE4_LOCAL_VERIFIED · FINAL_GUARDIAN_PENDING · H01_NOT_EXECUTED · NOT_PROMOTED`.

Este informe registra observaciones reproducibles de los SHAs donantes, la implementación Frames y
sus pilotos locales. Acredita ejecución local bajo `LOCAL_SIMULATION`; no acredita identidad de
host, H01 del candidato, promoción, publicación, distribución o entrega. [METODOLOGIA] [CONFIG]

## 1. Observaciones externas de repositorio registradas

| Fuente            | Commit SHA-1                               | Tree SHA-1                                 | Git archive SHA-256                                                |     Bytes | Files tracked |
| ----------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------ | --------: | ------------: |
| Propuesta-Medida  | `e0d6ba4576b23c83a6b22dbad53e23a8795b26d0` | `457920d64756549eb4862b2653e2bf293d332ab9` | `adb8a27e74dd44312834705f4f21f5af594fccfd4571e550f2057cbb65ee1bb3` | 1 576 960 |            76 |
| Technical Defense | `78fd3834acd38cf4b6ace7f7f1ed9c06893300f3` | `467691b625de2590171290d2dff779a791749f8c` | `dc48f6e6cde67e5c9d092fc3af806a575933c635c4d939403d0385b2e9b99a61` |   174 080 |            44 |

Estos valores fueron registrados por el Source Curator contra checkouts limpios y detached con
los comandos siguientes:

```sh
git rev-parse HEAD 'HEAD^{tree}'
git archive --format=tar HEAD | shasum -a 256
git ls-tree -rz --full-tree HEAD | shasum -a 256
git ls-tree -r --name-only HEAD | wc -l
```

Tree-listing SHA-256 registrado: Proposal
`ca7edbfec3253e676a13fcee8ff7784308a3a342501161c32719c000543c4ef9`; Defense
`a7571dbec7e2b09b30c212d160f243b1984222e6678ffa1642030fbd99c34b8a`. Frames no versiona los
archives, árboles completos ni blobs necesarios para reejecutar estas observaciones; su estado es
`EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED`. [HERRAMIENTA] [INFERENCIA]

## 2. Manifests de selected paths

Cada row registra la forma `path<TAB>blob_sha1<TAB>file_sha256<TAB>bytes<LF>`. El expediente
versionado comprueba orden bytewise, formato, hash y bytes del manifest; no recomputa sus rows
desde blobs donantes ausentes.

| Fuente   | Paths | Manifest SHA-256                                                   | Readback versionado | Replay de blobs |
| -------- | ----: | ------------------------------------------------------------------ | ------------------- | --------------- |
| Proposal |    22 | `6d63babbead317c234a1b97e92825da4fbc0d86f8aa92e9156d24513ed1c25cc` | PASS                | NOT_REPLAYED    |
| Defense  |    27 | `13ef17a7a33677d31cee125f6087b87259e4fc83cf641384721dd861d04ecf34` | PASS                | NOT_REPLAYED    |

El primer intento de curación externa detectó y corrigió antes del freeze un orden no canónico
entre `builder.py` y `business_case.py`. El PASS anterior acredita los bytes versionados del
manifest corregido, no un replay actual del repositorio donante. [HERRAMIENTA] [DOC]

## 3. Proyecciones versionables

| Fuente   | Descriptor                                                         | Selected projection                                                | Rights projection                                                  |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Proposal | `e3bf872833b8845b98d0889c3606c2ab814a7701881041590964f92d0b365df1` | `f73aa35c9e74bf0a6189e7a1e2b55a5777e0d6a961e8e1068b5752d16c6f6853` | `3c6ab32d388c51ef4ad8544aa63101f64536f09cb273b6eadc35175bfb204665` |
| Defense  | `75c3b76c6083ef86e67aeb588b2b812581c90238c530ea88c2ccc2259cbae23d` | `f34f7bb4ffd0a12a9894804972a039b5af7cde5712c211cadaec2ed7350ae18b` | `e69d9769d950e4491efedac41a028ce56d2330584e6eb46e26f41164c570b67c` |

Readback verificó hash y bytes de cada locator versionado. La comparación externa registrada
reportó intersección SHA-256 `0` con 120 blobs tracked únicos; como los blobs donantes no están
versionados, Frames no reproduce esa comparación. Incluso si se reejecutara, solo probaría ausencia
de copia byte-idéntica en el conjunto medido, no equivalencia a un DLP semántico. [HERRAMIENTA]
[INFERENCIA]

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
- autoridad y deduplicación pendientes antes de evaluación, e idénticas al overlay project-local
  en `evaluated`;
- todo gap retirado tiene una resolución explícita; la limitación pattern-based sigue documentada
  y no se presenta como DLP formal;
- review final acredita integración y cadena física, pero conserva Guardian independiente pendiente;
- commit/tree de 40 hex con `git_object_algorithm: sha1`;
- scope `internal_typescript_reimplementation_only`, rights verdict
  `allowed_internal_implementation`, external distribution false;
- exactamente seis restricciones y cero transición `active`.

La integración/readback del Governance owner pasó mediante dos gates separados: `pnpm
check:sources` emitió PASS con exactamente 11 fuentes globales y corpus canónico `0/4`
fail-closed; la CLI `check-sources.ts --project-local` emitió PASS con exactamente 2 donantes. Las
siete suites source contract/negative/integración pasaron 45/45, incluido dedupe sobre la unión,
hardlink, symlink y dos seams TOCTOU. Las autoridades globales conservan los hashes del baseline
(`lifecycle 2fa4f6bd…`, `registry fbba5539…`) y H-01/H-02 permanecen byte-identical;
`verify:atoms` pasó con 39 átomos y 50 edges. El successor receipt liga el register físico
`e816e18b…`, deniega integración global y tiene SHA-256 `bedc4153…`; los seis receipts históricos
permanecen byte-identical. La reauditoría Guardian independiente de este bloque emitió PASS con
0 BLOCKER/HIGH/MEDIUM/LOW y ejecutó el subconjunto source/core de G08 112/112; después, el gate
canónico se amplió a source/core/R6/R8 y pasó 220/220. La revisión Guardian de la adopción completa
sigue pendiente al redactar esta versión. [CONFIG] [HERRAMIENTA]

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

## 8. Gates Wave 1–4 y efectos externos

- Fuentes: source contract/negative/runner 45/45; gates separados 11 global/2 project-local;
  globals y H-01/H-02 inmutables; receipts/proyecciones versionados PASS; archive/tree/blobs
  `EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED`.
- Kernel: suites focales de contratos, causal gates, filesystem, API boundaries y recovery 80/80,
  PASS; revisión QA independiente sin blocker/high residual. [CÓDIGO] [HERRAMIENTA]
- Crash/recovery: siete puntos físicos de efecto —incluidos tres `LEDGER_FSYNC`— y tres seams de
  recovery en procesos hijo; binding, ledger, receipts y outputs permanecen byte-identical.
- R6: canary 47/47; MD `3a07033e…`, HTML `743dc6fa…`, JSON `c801e1f0…`, CSV `8da0bf33…`;
  candidate `b9b73362…`, estado máximo `RENDERED_DRAFT`.
- R8: 61/61; nueve outputs, candidate `1c84d430…`, runner attestation `d7f4c4d9…`, estado máximo
  `ACTIVE_LOCAL`, red `DENIED`.
- G08 canónico: overlay `PROJECT_LOCAL`, core, R6 y R8, 14 archivos/220 tests PASS tras reatestar
  el runner; el drift previo bloqueó antes de producir efectos.
- Replay: dos procesos frescos independientes produjeron exactamente los mismos hashes R6/R8.
- Chrome local: desktop 1440 y mobile 390, `lang=es`, un H1, cuatro landmarks, cero links sin
  nombre, cero imágenes sin `alt`, cero page/console/request errors y cero overflow horizontal.
- Browser proof determinista: `angle` produjo 8/24 pares divergentes bajo carga y `swangle` una
  divergencia en 96 renders;
  el DOM permaneció idéntico y la deriva se aisló a un píxel de antialiasing. El backend fijado
  `swiftshader` produjo 0/128 renders divergentes bajo estrés y tres replays secuenciales completos
  del probe pasaron 12/12 conservando comparación PNG byte a byte. [CÓDIGO] [HERRAMIENTA]
- Vitest integral posterior al fix visual: 236/236 archivos y 2148/2148 tests PASS.
- `pnpm check` y `pnpm verify`: PASS sobre el candidato documentado previo al freeze; la ejecución
  integral cerró con 236/236 archivos, 2148/2148 tests y formato completo. [HERRAMIENTA]
- Linux/Windows: `NOT_EXECUTED`; Windows conserva capability gap explícito para filesystem seguro.
- Network: solo lectura previa de referencias Git fijadas; no hubo provider execution en pilotos.
- Mutaciones externas: 0; no push, merge, publicación, distribución, entrega, H01 o promoción.

El primer freeze Guardian de Wave1 quedó en `REWORK` y fue remediado antes de Waves 2–4. El
Guardian final debe revisar el digest exacto posterior a documentación y gates; este documento no
anticipa su veredicto. [CONFIG] [DOC]

`[SUPUESTO] user_authorized_internal_implementation` sigue siendo el único fundamento de alcance
adicional a la licencia interna observada en Defense. Proposal no presentó LICENSE tracked en el
SHA evaluado. [SUPUESTO] [DOC]

`[NEUROCIENCIA]` No se realizó ni se requiere validación neurocientífica.

`[PEDAGOGIA]` No se validó eficacia pedagógica; el diseño de ensayo es únicamente operacional.
