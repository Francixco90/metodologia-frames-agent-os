---
schema_version: prompt-spec-v1
prompt_id: P08
command: /editar
title: "Edita, compone y reutiliza"
purpose: "Monta, compone, localiza y reutiliza con lineage, QC y rollback."
variables:
  - name: ACTIVOS_Y_REVISIÓN
    default: "Activos aprobados, Brief, Creative Specification, Brand OS y Review Report; conserva versiones, procedencia y derechos."
  - name: RESULTADO
    default: "Crear un máster candidato y derivados autónomos; selecciona una modalidad entre Plan, Ejecución, Híbrido, Largo a corto, Localización o QC."
  - name: ENTORNO_Y_RESTRICCIONES
    default: "Inspecciona herramientas reales, prioriza edición mínima y patches locales, protege identidad, accesibilidad y rollback, y entrega handoff cuando no puedas ejecutar."
evidence_tuple:
  observado: true
  inferido: true
  supuesto: true
  dato_requerido: true
sections:
  - SITUACIÓN
  - PEDIDO
  - EJECUCIÓN
  - LÍMITES_Y_CASOS_BORDE
  - CRITERIO
  - DEFINITION_OF_DONE
  - FALLBACK
model:
  preferred: "Modelo recomendado"
  alt: "asistente general con buen manejo de contexto"
  avoid: "generador multimedia como único decisor estratégico"
metadata:
  source_id: MIA-MEDIA-LIB-2.0.0
  version: 2.0.0-candidato
  status: candidate
  locale:
    - es
    - en
    - pt
---

# Edita, compone y reutiliza · P08

> Provenance: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato · Estado: candidate · EDL · composición · derivados · rollback [DOC]

## ES — SPEC verbatim

```text
SITUACIÓN
Los activos ya existen y fueron revisados. Deben convertirse en una versión candidata mediante montaje, corrección, composición, localización o reutilización, sin borrar identidad ni confundir preview con aprobación.

PEDIDO
Selecciona una modalidad:
1. Plan de edición.
2. Ejecución de edición.
3. Composición híbrida.
4. Largo a corto.
5. Localización.
6. QC.
Entrega un máster candidato, derivados o handoff; detente antes de aprobación/publicación.

EJECUCIÓN
1. Confirma versiones de activos, Brief, Creative Specification, Review Report, derechos y continuidad.
2. Declara Capability Report y qué acciones serán ejecutadas o especificadas.
3. Inventaría:
   - activo;
   - versión;
   - origen;
   - calidad;
   - derechos;
   - uso;
   - dependencia;
   - estado.
4. Crea Edit Decision List:
   - entrada/salida;
   - conservar/cortar/mover/cubrir/corregir/regenerar/regrabar;
   - razón narrativa;
   - audio;
   - gráfico;
   - resultado.
5. Orden de trabajo:
   - montaje y argumento;
   - continuidad;
   - audio;
   - exposición/color/reencuadre;
   - composición;
   - captions y gráficos;
   - música/ambiente;
   - derivados;
   - exportaciones;
   - QC.
6. Para composición híbrida revisa perspectiva, escala, luz, sombras, bordes, textura, grano, color, movimiento y disclosure.
7. Para largo a corto:
   - identifica tesis autónomas;
   - crea nuevo hook/cierre cuando haga falta;
   - evita fragmentos que solo anuncien la pieza larga;
   - conserva lineage.
8. Para localización:
   - adapta significado y cultura;
   - revisa pronunciación, subtítulos y layout;
   - prefiere exportaciones separadas si dos idiomas reducen legibilidad.
9. Usa render ladder:
   - frame/preview;
   - prueba ligera;
   - segmento;
   - máster candidato.
   Corrige localmente antes de regenerar.
10. Registra tool run, output ref, versión y validación; si no ejecutas, entrega handoff vendor-neutral.
11. Entrega:
   - máster candidato;
   - derivative package;
   - export matrix;
   - Tool Run Log;
   - QC;
   - rollback target;
   - cambios pendientes.
12. Detente en aprobación de edición.

LÍMITES Y CASOS BORDE
- Preview no equivale a render; render no equivale a aprobación.
- No alteres rostros, voces, marcas, productos, hechos o atribuciones.
- No uses efectos para ocultar una tesis débil.
- No sincronices captions sensibles por aproximación.
- No regenere todo por un fallo local.
- No publiques ni adaptes a plataformas sin package aprobado.
- Un tool run sin evidencia se marca “especificado, no ejecutado”.
- Si cambió la tesis, regresa al brief.

CRITERIO
PASS cuando:
- la historia funciona sin efectos;
- las decisiones de edición están trazadas;
- composición y continuidad son coherentes;
- cada derivado funciona solo o recibe contexto;
- derechos y lineage permanecen;
- ejecución tiene evidencia;
- rollback y QC existen;
- el creador puede aprobar una versión inequívoca.

DEFINITION OF DONE
Edit Candidate, EDL, Derivative Package, Export Matrix, Tool Run Log/handoff, QC, rollback y gate de aprobación.

FALLBACK
Sin herramientas, entrega EDL y handoff completo; si el material no alcanza, crea un corte mínimo o vuelve a P06 para un activo de rescate. interpreta, planifica, ejecuta.
```

## EN — SPEC verbatim

```text
SITUATION
The assets exist and have been reviewed. They must become a candidate version through assembly, correction, compositing, localization, or repurposing, without erasing identity or confusing preview with approval.

REQUEST
Select one mode:
1. Edit Plan.
2. Edit Execution.
3. Hybrid Composition.
4. Long-to-Short.
5. Localization.
6. QC.
Deliver a master candidate, derivatives, or handoff; stop before approval/publishing.

EXECUTION
1. Confirm versions of assets, Brief, Creative Specification, Review Report, rights, and continuity.
2. State a Capability Report and which actions will be executed or only specified.
3. Inventory:
   - asset;
   - version;
   - origin;
   - quality;
   - rights;
   - use;
   - dependency;
   - state.
4. Create an Edit Decision List:
   - in/out;
   - keep/cut/move/cover/correct/regenerate/re-record;
   - narrative reason;
   - audio;
   - graphic;
   - outcome.
5. Work order:
   - assembly and argument;
   - continuity;
   - audio;
   - exposure/color/reframing;
   - compositing;
   - captions and graphics;
   - music/ambience;
   - derivatives;
   - exports;
   - QC.
6. For hybrid compositing, review perspective, scale, light, shadows, edges, texture, grain, color, movement, and disclosure.
7. For long-to-short:
   - identify standalone theses;
   - create a new hook/closing when needed;
   - avoid fragments that only advertise the long piece;
   - preserve lineage.
8. For localization:
   - adapt meaning and culture;
   - review pronunciation, captions, and layout;
   - prefer separate exports if two languages reduce legibility.
9. Use a render ladder:
   - frame/preview;
   - lightweight test;
   - segment;
   - master candidate.
   Fix locally before regenerating.
10. Record tool run, output reference, version, and validation; if execution is unavailable, deliver a provider-neutral handoff.
11. Deliver:
   - master candidate;
   - derivative package;
   - export matrix;
   - Tool Run Log;
   - QC;
   - rollback target;
   - pending changes.
12. Stop at edit approval.

LIMITS AND EDGE CASES
- Preview does not equal render; render does not equal approval.
- Do not alter faces, voices, brands, products, facts, or attributions.
- Do not use effects to hide a weak thesis.
- Do not synchronize sensitive captions by approximation.
- Do not regenerate everything for a local defect.
- Do not publish or adapt to platforms without an approved package.
- A tool run without evidence is marked “specified, not executed.”
- If the thesis changed, return to the brief.

CRITERIA
PASS when:
- the story works without effects;
- edit decisions are traceable;
- compositing and continuity are coherent;
- every derivative works alone or receives context;
- rights and lineage remain intact;
- execution has evidence;
- rollback and QC exist;
- the creator can approve one unambiguous version.

DEFINITION OF DONE
Edit Candidate, EDL, Derivative Package, Export Matrix, Tool Run Log/handoff, QC, rollback, and approval gate.

FALLBACK
Without tools, deliver a complete EDL and handoff; if the material is insufficient, create a minimum cut or return to P06 for a rescue asset. interpret, plan, execute.
```

## PT — SPEC verbatim

```text
SITUAÇÃO
Os ativos já existem e foram revisados. Devem se transformar em uma versão candidata por meio de montagem, correção, composição, localização ou reutilização, sem apagar identidade nem confundir preview com aprovação.

PEDIDO
Selecione uma modalidade:
1. Plano de edição.
2. Execução de edição.
3. Composição híbrida.
4. Longo para curto.
5. Localização.
6. QC.
Entregue máster candidato, derivados ou handoff; pare antes da aprovação/publicação.

EXECUÇÃO
1. Confirme versões de ativos, Brief, Creative Specification, Review Report, direitos e continuidade.
2. Declare Capability Report e quais ações serão executadas ou apenas especificadas.
3. Inventarie:
   - ativo;
   - versão;
   - origem;
   - qualidade;
   - direitos;
   - uso;
   - dependência;
   - estado.
4. Crie Edit Decision List:
   - entrada/saída;
   - conservar/cortar/mover/cobrir/corrigir/regenerar/regravar;
   - razão narrativa;
   - áudio;
   - gráfico;
   - resultado.
5. Ordem de trabalho:
   - montagem e argumento;
   - continuidade;
   - áudio;
   - exposição/cor/reenquadramento;
   - composição;
   - captions e gráficos;
   - música/ambiente;
   - derivados;
   - exportações;
   - QC.
6. Para composição híbrida, revise perspectiva, escala, luz, sombras, bordas, textura, grão, cor, movimento e disclosure.
7. Para longo para curto:
   - identifique teses autônomas;
   - crie novo hook/encerramento quando necessário;
   - evite fragmentos que apenas anunciem a peça longa;
   - preserve lineage.
8. Para localização:
   - adapte significado e cultura;
   - revise pronúncia, legendas e layout;
   - prefira exportações separadas se dois idiomas reduzirem a legibilidade.
9. Use render ladder:
   - frame/preview;
   - teste leve;
   - segmento;
   - máster candidato.
   Corrija localmente antes de regenerar.
10. Registre tool run, referência do output, versão e validação; se não executar, entregue handoff agnóstico de fornecedor.
11. Entregue:
   - máster candidato;
   - derivative package;
   - export matrix;
   - Tool Run Log;
   - QC;
   - rollback target;
   - mudanças pendentes.
12. Pare na aprovação da edição.

LIMITES E CASOS LIMITE
- Preview não equivale a render; render não equivale a aprovação.
- Não altere rostos, vozes, marcas, produtos, fatos ou atribuições.
- Não use efeitos para esconder uma tese fraca.
- Não sincronize captions sensíveis por aproximação.
- Não regenere tudo por uma falha local.
- Não publique nem adapte a plataformas sem package aprovado.
- Um tool run sem evidência é marcado “especificado, não executado”.
- Se a tese mudou, volte ao brief.

CRITÉRIO
PASS quando:
- a história funciona sem efeitos;
- as decisões de edição estão rastreadas;
- composição e continuidade são coerentes;
- cada derivado funciona sozinho ou recebe contexto;
- direitos e lineage permanecem;
- a execução tem evidência;
- rollback e QC existem;
- o criador pode aprovar uma versão inequívoca.

DEFINITION OF DONE
Edit Candidate, EDL, Derivative Package, Export Matrix, Tool Run Log/handoff, QC, rollback e gate de aprovação.

FALLBACK
Sem ferramentas, entregue EDL e handoff completos; se o material não for suficiente, crie um corte mínimo ou volte ao P06 para um ativo de resgate. interpreta, planeja, executa.
```

## Evidence tuple (O/I/A/R)

Base de evidencia

## Modelo recomendado

Modelo recomendado

## Criterios de aceptación

Criterios de aceptación

## No-regresión

Checklist de no regresión

## Definition of Done

Definition of Done
