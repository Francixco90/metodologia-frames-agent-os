# Debate socrático: cómo adoptar sin crear un segundo Frames

Estado del debate: `DECISIONS_RECORDED · IMPLEMENTATION_PENDING`.

Participantes:

- **Arquitectura de Información (AI):** protege taxonomía, rutas y contratos.
- **Operación (OP):** exige que el sistema pueda ejecutarse, recuperarse y auditarse.
- **Escéptico (ES):** busca contraejemplos, deuda oculta y falsas equivalencias.
- **Guardian (GU):** emite veredicto read-only y protege la separación de autoridad.

Las voces no son identidades criptográficamente acreditadas; son roles de deliberación. La futura
separación operacional requiere task/session IDs distintos y `ActorAuthorityPortV1`. [SUPUESTO]

## Tensión 1 — ¿Dominio o motor?

**AI:** ¿Qué es realmente valioso en Propuesta-Medida: su runtime W02 o su modelo de una propuesta?

**OP:** El modelo. Readiness, claims, ROI, pricing authority y verificación son observables de
dominio. El runtime duplica routing, storage y promotion que Frames ya debe gobernar.

**ES:** ¿No perdemos fidelidad si dejamos el engine que hace pasar las etapas?

**AI:** Fidelidad no significa identidad de implementación. En Frames, R6 ya tiene perfiles P y
renderers. Podemos preservar invariantes y estados sin crear una ruta W02 paralela.

**GU:** ¿Y el segundo donante? Su PathGuard y ledger parecen “el motor correcto”.

**OP:** Son un prototipo útil de invariantes, no el backend final. El estado `SUCCEEDED` mezcla
efecto y aceptación; el objetivo Frames exige `EFFECT_SUCCEEDED → VERIFIED_PASS → GUARDIAN_PASS →
H01_APPROVED → PROMOTED`.

**ES:** Entonces, ¿qué se comparte entre R6 y R8?

**AI:** Solo `TransactionKernelV1`. Los contratos comerciales pertenecen a R6; el bundle de defensa
pertenece a R8; el cambio y promoción pertenecen a R9. [METODOLOGIA]

**Cierre**

- **Decisión:** separar capacidades de dominio de un único motor transaccional TypeScript; no
  importar runtimes donantes.
- **Evidencia:** Proposal posee contratos de dominio ricos; Defense posee invariantes de DAG,
  PathGuard y receipts, pero ambos implementan runtimes Python independientes. [CÓDIGO]
- **Contraejemplo:** copiar W02 completo produciría dos autoridades de routing, state y release;
  venderlo como “reuso” ocultaría divergencia.
- **Gap:** `TransactionKernelV1` y los adapters V2 todavía no existen; el blueprint no es ejecución.

## Tensión 2 — ¿Autoridad o conveniencia?

**OP:** Si el usuario entrega una URL y pide una propuesta, ¿por qué no marcar la referencia como
verificada y avanzar?

**AI:** Porque una URL aporta localización, no procedencia, derechos, autoridad comercial ni hash.
`BriefSourceSchema` debe mantener cada dimensión separada.

**ES:** Pero exigir todos los campos puede bloquear un borrador inocuo.

**GU:** Puede producirse un borrador con supuestos visibles, no claims ni precio autorizados. La
conveniencia de continuar no convierte una ausencia en autoridad.

**OP:** ¿Qué ocurre con la autorización del usuario para los donantes?

**AI:** Se registra literalmente como `[SUPUESTO] user_authorized_internal_implementation`. Habilita
reimplementación interna; no acredita propiedad, licencia pública o distribución.

**ES:** ¿Y si el repo técnico trae un LICENSE interno?

**GU:** Confirma el límite, no lo amplía: uso autorizado interno, sin publicación, redistribución o
hosting para terceros. La fuente queda `evaluated`, nunca `active` por comodidad. [DOC]

**Cierre**

- **Decisión:** cada claim, precio, compromiso, source input y donor pattern conserva autoridad y
  rights hash-bound; missing/unknown bloquea el uso que exceda el alcance probado.
- **Evidencia:** lifecycle `source-promotion-v2` distingue candidate, quarantined, evaluated y
  active; el plan exige `allowed_internal_implementation` y distribución externa false. [CONFIG]
- **Contraejemplo:** una propuesta puede renderizar correctamente con un precio inventado; el
  éxito visual no hace válido el compromiso comercial.
- **Gap:** la autorización es user-supplied, no una atestación verificable del host ni una licencia
  pública; cualquier ampliación exige nuevo gate de derechos.

## Tensión 3 — ¿Reutilización o contaminación?

**AI:** ¿Qué significa “capitalizar al máximo” sin copiar el repositorio?

**OP:** Extraer inventario, hashes, invariantes, schemas conceptuales, casos negativos y defectos.
Después reescribirlos en los authorities y lenguajes de Frames.

**ES:** ¿No sería más rápido copiar schemas, tests y templates, conservando la licencia?

**GU:** No está autorizado. Proposal no presenta un LICENSE tracked en el SHA evaluado; Defense
restringe el uso. Además, el template, fonts y prompts introducirían nueva procedencia, branding y
superficie de seguridad.

**AI:** ¿Cómo demostramos que estudiamos suficiente sin versionar bytes?

**OP:** Con un manifest canónico por path: repo-relative path, Git blob SHA-1, SHA-256 y bytes; y
una proyección que declara COPY/ADAPT/REFERENCE/REJECT. Es trazabilidad, no vendoring.

**ES:** ¿Y los tests?

**AI:** Se portan ideas de falsificación, no archivos. Los fixtures nuevos deben ser explícitamente
sintéticos y propios de Frames. [METODOLOGIA]

**Cierre**

- **Decisión:** reutilizar invariantes y conocimiento; prohibir runtime, prompt, template, asset o
  test donor bytes salvo una autorización y trazabilidad separadas.
- **Evidencia:** los manifests seleccionados ligan 22 paths de Proposal y 27 de Defense sin copiar
  su contenido; las proyecciones excluyen prompts, assets y vendoring. [HERRAMIENTA]
- **Contraejemplo:** copiar Montserrat/Poppins o un HTML donor porque “solo es diseño” crea derechos
  y procedencia nuevos, aunque el renderer pase.
- **Gap:** el análisis pattern-based no es DLP formal; una futura incorporación de cualquier byte
  requiere evaluación de contenido, licencia y privacidad propia.

## Tensión 4 — ¿Éxito técnico o promoción?

**OP:** Si el kernel escribió bytes y el hash coincide, ¿por qué no ejecutar al hijo?

**ES:** Porque un writer ajeno pudo crear esos mismos bytes. El defecto de carrera reproducido en
Defense termina en `SUCCEEDED` tras `FileExistsError` con target idéntico.

**AI:** Entonces, ¿qué evidencia desbloquea un descendiente?

**GU:** Un `TransactionPromotionReceiptV1` físico, posterior a effect, verification, Guardian y la
aprobación H01 one-use ligada al candidate hash. No `EFFECT_SUCCEEDED`, no existencia de archivo,
no string de status.

**OP:** ¿Puede RT-11 persistir el PASS y promover?

**GU:** No. RT-11 emite un verdict read-only. Un recorder mecánico separado persiste el evento sin
autoridad decisoria; H01 es el único owner de `HM_PROMOTION_APPROVED`, one-use y hash-bound al
candidato. [CONFIG]

**ES:** ¿Y si el recorder ve todos los PASS pero el proceso cayó antes de promoción?

**OP:** `inspectRecovery` devuelve `BLOCKED_UNCERTAIN`; `recover` agrega evidencia. Nunca infiere
promoción, borra outputs o reescribe receipts.

**Cierre**

- **Decisión:** separar efecto, verificación, verdict Guardian, GuardianReceipt, H01, PromotionReceipt
  y descendientes; H01 siempre precede la persistencia de `PROMOTED`.
- **Evidencia:** Proposal falla su test de igualdad de manifest pese a 54/55 tests verdes; Defense
  permite un falso `SUCCEEDED` en la carrera idéntica reproducida. [HERRAMIENTA]
- **Contraejemplo:** “el archivo existe y su hash coincide” no prueba quién lo creó ni bajo qué
  WorkOrder; promoverlo rompe causalidad aunque los bytes sean correctos.
- **Gap:** la separación por tasks será `LOCAL_SIMULATION` mientras el host no acredite autoridad e
  identidad; no es aislamiento criptográfico.

## Tensión 5 — ¿Autonomía o gates humanos?

**OP:** Un workflow agéntico pierde valor si pide aprobación en cada nodo. ¿Dónde debe actuar solo?

**AI:** Dentro de un WorkOrder aprobado: canonicalizar, planear DAG, generar intenciones, escribir
altas declaradas, verificar y preparar un candidato. No puede ampliar write set, red, autoridad o
alcance comercial.

**ES:** ¿Por qué un Guardian si ya hay verifier?

**GU:** El verifier comprueba contratos del resultado. Guardian evalúa riesgos, causalidad, stale
evidence y límites de promoción desde contexto independiente. Ninguno sustituye al humano.

**OP:** ¿Qué gate humano es realmente final?

**GU:** H01 con `HM_PROMOTION_APPROVED` ligado al candidate hash, one-use y `idempotency: false`.
Después puede persistirse promoción local; publicación o entrega siguen siendo autorizaciones
separadas.

**ES:** ¿No podría el sistema continuar dos veces con la misma aprobación?

**AI:** No. Reusar el gate one-use o cambiar input/grafo/outputs invalida la cadena. [METODOLOGIA]

**Cierre**

- **Decisión:** máxima autonomía dentro del WorkOrder y cero autonomía para ampliar efectos,
  autoridad, distribución o promoción humana.
- **Evidencia:** el plan fija una secuencia de gates R9/R8/HM y prohíbe push, merge, red,
  publicación y entrega externa. [CONFIG]
- **Contraejemplo:** un canary R6 determinista puede quedar `RENDERED_DRAFT`; eso no lo hace
  comercialmente aprobado ni entregado.
- **Gap:** los pilotos, dos replays, crash injection, visual QA y H01 aún no se han ejecutado.

## Síntesis

La pregunta no es “¿cuánto podemos copiar?”, sino “¿qué evidencia mínima permite reimplementar el
valor sin duplicar autoridad?”. La respuesta es: dominio R6, extensión local R8, kernel compartido,
promoción R9/H01, proyecciones de procedencia y causalidad física. [INFERENCIA]

`[NEUROCIENCIA]` No se formula ninguna afirmación neurocientífica; no es necesaria para estas
decisiones.

`[PEDAGOGIA]` La preparación de defensa usa ensayo y Q&A como pasos operativos; su eficacia
educativa permanece fuera de alcance y sin afirmaciones causales.
