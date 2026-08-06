---
schema_version: prompt-spec-v1
prompt_id: P00
command: /definir-sistema
title: "Define tu sistema creativo"
purpose: "Define perfil, Brand OS, voz o piloto, una modalidad por vez y bajo aprobación."
variables:
  - name: CONTEXTO_PERSONAL
    default: "Soy una persona experta en mi campo; quiero crear contenido, pero todavía no tengo un sistema de marca consolidado ni deseo sobreactuar autoridad."
  - name: OBJETIVO_FUNDACIONAL
    default: "Construir confianza, comunidad y oportunidades mediante contenido útil, reconocible y sostenible; selecciona una sola modalidad entre Perfil, Brand OS, Calibración de voz o Piloto según lo que ya exista."
  - name: LÍMITES_Y_RECURSOS
    default: "Usa solo información confirmada del mismo creador, recursos existentes, exposición personal controlada, publicación manual inicial y máximo tres preguntas por ronda."
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

# Define tu sistema creativo · P00

> Provenance: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato · Estado: candidate · identidad · voz · Brand OS · piloto [DOC]

## ES — SPEC verbatim

```text
SITUACIÓN
Una persona quiere construir una presencia multimedia reconocible, pero su identidad editorial, voz, límites o capacidad todavía no están suficientemente definidos. Puede existir información previa, pero solo es válida si pertenece al mismo creador, está vigente y su procedencia es observable.

PEDIDO
Selecciona y ejecuta una sola modalidad:
1. Perfil verificable.
2. Brand OS.
3. Calibración de voz.
4. Piloto y autonomía.
Entrega un artefacto candidato para aprobación; no avances a la modalidad siguiente ni lo actives como memoria permanente.

EJECUCIÓN
1. Confirma qué información pudiste observar y qué artefactos existen.
2. Elige la modalidad mínima necesaria según el estado real.
3. Formula máximo tres preguntas solo si su respuesta cambia identidad, riesgo, alcance o factibilidad; ofrece un default seguro cuando sea reversible.
4. Aplica estos contenidos por modalidad:
   - Perfil: nombre público preferido, contexto profesional relevante, experiencia confirmada, audiencias, recursos, restricciones, temas permitidos/prohibidos, grado de exposición y datos pendientes.
   - Brand OS: propósito, audiencia situada, promesa recurrente, punto de vista, territorios y fronteras, voz/antivoz, gramática visual/sonora, autenticidad, accesibilidad, evidencia, derechos, roles de plataforma, comunidad e inbound.
   - Calibración: microtexto o microguion, explicación de por qué sí podría sonar a la persona, antiejemplo, correcciones observables y reglas provisionales.
   - Piloto: 4–6 ciclos de complejidad creciente, ruta IA/real/híbrida, capacidad, gates humanos, métricas de experiencia y contenido, criterio de pausa y aprendizaje.
5. Separa Observado, Inferido, Supuesto y Dato requerido.
6. Convierte adjetivos como “premium”, “auténtico” o “cálido” en comportamientos, decisiones visuales y ejemplos de sí/no.
7. Conserva un solo creador por artefacto.
8. Propón una versión y máximo una alternativa cuando exista un trade-off real.
9. Finaliza con el artefacto, decisiones abiertas, riesgos, criterio de aprobación y siguiente acción.

LÍMITES Y CASOS BORDE
- No asumas consentimiento, memoria, derechos, identidad pública, experiencia ni resultados.
- Si hay varias marcas o identidades, sepáralas antes de construir reglas.
- Si aparecen salud, menores, pacientes, datos privados o claims sensibles, señala revisión especializada.
- Una preferencia aislada no se convierte en regla estable.
- Si falta información, crea una versión provisional, excepto cuando la ausencia afecte privacidad, autoridad o una acción irreversible.
- No redactes contenido público todavía.

CRITERIO
PASS cuando:
- la modalidad y el estado son inequívocos;
- cada hecho material tiene procedencia;
- la persona puede aceptar, corregir o rechazar decisiones concretas;
- voz y estética tienen ejemplos observables;
- límites de exposición y temas sensibles son explícitos;
- el artefacto puede reutilizarse por otra IA sin reinterpretar identidad;
- el trabajo se detiene en la aprobación correspondiente.

DEFINITION OF DONE
Un único artefacto versionable, su base de evidencia, decisiones pendientes, no-regresión y siguiente gate.

FALLBACK
Si el contexto es insuficiente, entrega el artefacto mínimo provisional y las tres preguntas de mayor impacto; si falta consentimiento o existe mezcla de perfiles, detén el proceso. interpreta, planifica, ejecuta.
```

## EN — SPEC verbatim

```text
SITUATION
A person wants to build a recognizable multimedia presence, but their editorial identity, voice, boundaries, or capacity are not yet defined well enough. Prior information may exist, but it is valid only if it belongs to the same creator, is current, and has observable provenance.

REQUEST
Select and execute one mode only:
1. Verifiable Profile.
2. Brand OS.
3. Voice Calibration.
4. Pilot and Autonomy.
Deliver a candidate artifact for approval; do not advance to the next mode or activate it as permanent memory.

EXECUTION
1. Confirm what information you could observe and which artifacts exist.
2. Choose the minimum necessary mode based on the actual state.
3. Ask no more than three questions only when the answers change identity, risk, scope, or feasibility; offer a safe default when the decision is reversible.
4. Apply the following content by mode:
   - Profile: preferred public name, relevant professional context, confirmed experience, audiences, resources, constraints, allowed/forbidden topics, degree of exposure, and missing data.
   - Brand OS: purpose, situated audience, recurring promise, point of view, territories and boundaries, voice/anti-voice, visual/sound grammar, authenticity, accessibility, evidence, rights, platform roles, community, and inbound.
   - Calibration: microcopy or micro-script, why it could sound like the person, counterexample, observable corrections, and provisional rules.
   - Pilot: 4–6 cycles of increasing complexity, AI/real/hybrid route, capacity, human gates, experience and content metrics, pause criteria, and learning.
5. Separate Observed, Inferred, Assumed, and Required data.
6. Turn adjectives such as “premium,” “authentic,” or “warm” into behaviors, visual decisions, and yes/no examples.
7. Keep one creator per artifact.
8. Propose one version and at most one alternative when a real trade-off exists.
9. Finish with the artifact, open decisions, risks, approval criteria, and next action.

LIMITS AND EDGE CASES
- Do not assume consent, memory, rights, public identity, experience, or results.
- If several brands or identities exist, separate them before building rules.
- If health, minors, patients, private data, or sensitive claims appear, flag specialist review.
- A single preference does not become a stable rule.
- If information is missing, create a provisional version, except when the absence affects privacy, authority, or an irreversible action.
- Do not draft public content yet.

CRITERIA
PASS when:
- the mode and state are unambiguous;
- every material fact has provenance;
- the person can accept, correct, or reject concrete decisions;
- voice and aesthetics have observable examples;
- exposure boundaries and sensitive topics are explicit;
- the artifact can be reused by another AI without reinterpreting identity;
- the work stops at the corresponding approval.

DEFINITION OF DONE
One versionable artifact, its evidence basis, pending decisions, no-regression conditions, and next gate.

FALLBACK
If context is insufficient, deliver the minimum provisional artifact and the three highest-impact questions; if consent is missing or profiles are mixed, stop the process. interpret, plan, execute.
```

## PT — SPEC verbatim

```text
SITUAÇÃO
Uma pessoa quer construir uma presença multimídia reconhecível, mas sua identidade editorial, voz, limites ou capacidade ainda não estão suficientemente definidos. Pode existir informação prévia, mas ela só é válida se pertencer ao mesmo criador, estiver vigente e tiver procedência observável.

PEDIDO
Selecione e execute apenas uma modalidade:
1. Perfil verificável.
2. Brand OS.
3. Calibração de voz.
4. Piloto e autonomia.
Entregue um artefato candidato à aprovação; não avance para a modalidade seguinte nem o ative como memória permanente.

EXECUÇÃO
1. Confirme quais informações você pôde observar e quais artefatos existem.
2. Escolha a modalidade mínima necessária de acordo com o estado real.
3. Faça no máximo três perguntas apenas se a resposta mudar identidade, risco, escopo ou viabilidade; ofereça um padrão seguro quando a decisão for reversível.
4. Aplique estes conteúdos por modalidade:
   - Perfil: nome público preferido, contexto profissional relevante, experiência confirmada, audiências, recursos, restrições, temas permitidos/proibidos, grau de exposição e dados pendentes.
   - Brand OS: propósito, audiência situada, promessa recorrente, ponto de vista, territórios e fronteiras, voz/antivoz, gramática visual/sonora, autenticidade, acessibilidade, evidência, direitos, papéis de plataforma, comunidade e inbound.
   - Calibração: microtexto ou microrroteiro, explicação de por que pode soar como a pessoa, contraexemplo, correções observáveis e regras provisórias.
   - Piloto: 4–6 ciclos de complexidade crescente, rota IA/real/híbrida, capacidade, gates humanos, métricas de experiência e conteúdo, critério de pausa e aprendizado.
5. Separe Observado, Inferido, Suposição e Dado requerido.
6. Converta adjetivos como “premium”, “autêntico” ou “acolhedor” em comportamentos, decisões visuais e exemplos de sim/não.
7. Mantenha um único criador por artefato.
8. Proponha uma versão e, no máximo, uma alternativa quando houver um trade-off real.
9. Finalize com o artefato, decisões em aberto, riscos, critério de aprovação e próxima ação.

LIMITES E CASOS LIMITE
- Não presuma consentimento, memória, direitos, identidade pública, experiência nem resultados.
- Se houver várias marcas ou identidades, separe-as antes de construir regras.
- Se surgirem saúde, menores, pacientes, dados privados ou claims sensíveis, sinalize revisão especializada.
- Uma preferência isolada não se transforma em regra estável.
- Se faltar informação, crie uma versão provisória, exceto quando a ausência afetar privacidade, autoridade ou uma ação irreversível.
- Ainda não redija conteúdo público.

CRITÉRIO
PASS quando:
- a modalidade e o estado são inequívocos;
- cada fato material tem procedência;
- a pessoa pode aceitar, corrigir ou rejeitar decisões concretas;
- voz e estética têm exemplos observáveis;
- limites de exposição e temas sensíveis são explícitos;
- o artefato pode ser reutilizado por outra IA sem reinterpretar a identidade;
- o trabalho para na aprovação correspondente.

DEFINITION OF DONE
Um único artefato versionável, sua base de evidência, decisões pendentes, não regressão e próximo gate.

FALLBACK
Se o contexto for insuficiente, entregue o artefato mínimo provisório e as três perguntas de maior impacto; se faltar consentimento ou houver mistura de perfis, interrompa o processo. interpreta, planeja, executa.
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
