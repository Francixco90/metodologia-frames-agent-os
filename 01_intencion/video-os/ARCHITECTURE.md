# Arquitectura de Video OS v1

## Capas

1. **Gateway R6**: interpreta lenguaje natural y bloquea si faltan fuentes o autoridad.
2. **Video OS**: fija defaults, arquetipo, presupuesto, estado y checkpoints.
3. **Multimedia P00–P09**: genera brief y artefactos transversales.
4. **General Video**: ejecuta Spec First, media, captions, composición, render y receipts.
5. **Gates**: QA y revisión humana independientes; promoción externa permanece bloqueada.

Video OS no renderiza ni crea otra skill. Su runner es determinista: planifica, valida y produce
una cápsula de reanudación; las mutaciones de media siguen en los runtimes existentes. [CÓDIGO]

## Flujo

`V00 Intake → V01 Source Freeze → V02 Spec & Storyboard → V03 Compile → V04 Verify & Review`

La disciplina canónica es `Spec → Compile → Verify → Review → Promote`; Video OS automatiza
solo hasta `RENDERED_DRAFT` y deja toda promoción en un gate externo. [CONFIG]

Cada etapa lee `context.md`, el estado canónico, una plantilla y solo las evidencias que declara.
Los artefactos materiales se enlazan por SHA-256. Cualquier `unknown`, hash ausente, fuente sin
derechos, manifiesto obsoleto o cambio de spec invalida las salidas dependientes. [CONFIG]

Los derivados solicitados en el intake se registran únicamente como intención en cola. No se
compilan ni verifican hasta que el principal tenga receipt independiente `PASS`. [CONFIG]

## Política para modelos de razonamiento bajo

- Clasificación por arquetipos cerrados; el modelo rellena deltas.
- Defaults explícitos para formato, privacidad, movimiento, audio y exports.
- Documentos con secciones y orden canónicos.
- Una sola decisión activa y una cápsula de reanudación compacta.
- Escalamiento a razonamiento alto o Guardian solo ante ambigüedad material, privacidad,
  seguridad, derechos o promoción irreversible. [INFERENCIA]

## Fronteras

Datos personales y locators privados viven fuera del repo. Los fixtures son sintéticos. Video OS
no activa conectores, no descarga medios, no publica y no concede estados manuales. [CONFIG]
