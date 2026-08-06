---
schema_version: prompt-spec-v1
prompt_id: P07
command: /revisar
title: "Revisa material multimedia"
purpose: "Diagnostica solo lo observable y transforma hallazgos en correcciones priorizadas."
variables:
  - name: MATERIAL
    default: "Guion, imágenes, fotografías, audio, clips, video, transcripción, rough cut o pieza híbrida; usa solo lo realmente accesible."
  - name: REFERENCIA
    default: "Brief, Creative Specification, Brand OS y criterios de aceptación aprobados; si faltan, reconstruye un objetivo provisional y márcalo."
  - name: ETAPA_Y_PRIORIDAD
    default: "Revisión del material existente, priorizando fidelidad, claridad, derechos, accesibilidad y cambios de mayor retorno antes de invertir más."
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

# Revisa material multimedia · P07

> Provenance: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato · Estado: candidate · diagnóstico · fidelidad · QC · correcciones [DOC]

## ES — SPEC verbatim

```text
SITUACIÓN
Existe material multimedia en alguna etapa, pero se necesita una evaluación profesional que distinga lo que debe conservarse, corregirse, regenerarse, regrabarse, reeditarse o detenerse. La revisión debe enseñar, no limitarse a calificar.

PEDIDO
Selecciona un modo:
1. Guion o concepto.
2. Imagen o fotografía.
3. Audio o voz.
4. Clip o video.
5. Rough cut.
6. Composición híbrida.
7. QC final.
Evalúa solo dimensiones observables y entrega un informe accionable.

EJECUCIÓN
1. Declara:
   - archivos accesibles;
   - versiones;
   - qué pudiste leer, ver o escuchar;
   - qué no puede evaluarse.
2. Confirma Brief, Creative Specification, Brand OS y aceptación; si faltan, usa objetivo provisional visible.
3. Evalúa criterios comunes:
   - tesis/promesa;
   - valor para audiencia;
   - progresión;
   - evidencia;
   - voz/identidad;
   - claridad;
   - accesibilidad;
   - privacidad/derechos;
   - reutilización.
4. Evalúa por medio:
   - Guion: oralidad, estructura, claims, ritmo y cierre.
   - Imagen/foto: composición, sujeto, anatomía, manos, texto, logos, perspectiva, luz, materiales y resolución.
   - Audio/voz: consentimiento, pronunciación, ritmo, ruido, inteligibilidad, naturalidad, música y atribución.
   - Clip/video generado: continuidad temporal, identidad, parpadeo, deformación, física, cámara, lip sync y artefactos.
   - Video real: foco, exposición, encuadre, cobertura, interpretación, continuidad y sonido.
   - Híbrido: escala, perspectiva, luz, sombras, textura, grano, color, movimiento, bordes y disclosure.
   - QC: safe areas, captions, contraste, spelling, sincronización, exportación y fallos.
5. Para cada hallazgo registra:
   - severidad;
   - timestamp/frame/sección;
   - observado;
   - impacto;
   - práctica;
   - corrección;
   - esfuerzo;
   - owner.
6. Distingue:
   - defecto;
   - riesgo;
   - preferencia;
   - trade-off aceptable.
7. Preserva explícitamente fortalezas, gestos, silencios o imperfecciones valiosas.
8. Prioriza cinco cambios de mayor retorno.
9. Emite veredicto:
   - publicar;
   - cambios menores;
   - reeditar;
   - regrabar/regenerar parcialmente;
   - replantear;
   - HOLD.
10. Identifica material reutilizable y faltantes.
11. Si propone A/B, cambia una sola variable y no lo usa para riesgos críticos.

LÍMITES Y CASOS BORDE
- No simules reproducción, escucha, metadata o calidad.
- No uses una puntuación como sustituto de evidencia.
- No pidas regeneración completa cuando un patch local resuelve.
- No elimines autenticidad por perfección técnica.
- Un resultado atractivo falla si altera identidad, producto, hecho o permiso.
- Claims sensibles y derechos pueden producir HOLD.
- No ejecutes correcciones ni apruebes en nombre del creador.

CRITERIO
PASS cuando:
- el alcance observado es exacto;
- cada cambio tiene evidencia e impacto;
- problema y gusto están separados;
- fortalezas se preservan;
- prioridades son ejecutables;
- blockers están visibles;
- otro editor puede continuar sin reinterpretar.

DEFINITION OF DONE
Review Report, veredicto, top cinco, lista de cambios, fortalezas, material reutilizable, blockers y siguiente decisión.

FALLBACK
Si solo hay texto o frames, limita la revisión a eso y entrega checklist para la revisión completa; si el material no abre, solicita una copia o descripción sin inventar. interpreta, planifica, ejecuta.
```

## EN — SPEC verbatim

```text
SITUATION
Multimedia material exists at some stage, but it needs a professional evaluation that distinguishes what should be preserved, corrected, regenerated, re-recorded, re-edited, or stopped. The review should teach, not merely score.

REQUEST
Select one mode:
1. Script or Concept.
2. Image or Photograph.
3. Audio or Voice.
4. Clip or Video.
5. Rough Cut.
6. Hybrid Composition.
7. Final QC.
Evaluate observable dimensions only and deliver an actionable report.

EXECUTION
1. State:
   - accessible files;
   - versions;
   - what you could read, see, or hear;
   - what cannot be evaluated.
2. Confirm the Brief, Creative Specification, Brand OS, and acceptance criteria; if missing, use a visible provisional objective.
3. Evaluate common criteria:
   - thesis/promise;
   - audience value;
   - progression;
   - evidence;
   - voice/identity;
   - clarity;
   - accessibility;
   - privacy/rights;
   - reuse.
4. Evaluate by medium:
   - Script: spoken quality, structure, claims, pace, and closing.
   - Image/photo: composition, subject, anatomy, hands, text, logos, perspective, light, materials, and resolution.
   - Audio/voice: consent, pronunciation, pace, noise, intelligibility, naturalness, music, and attribution.
   - Generated clip/video: temporal continuity, identity, flicker, deformation, physics, camera, lip sync, and artifacts.
   - Real video: focus, exposure, framing, coverage, performance, continuity, and sound.
   - Hybrid: scale, perspective, light, shadows, texture, grain, color, movement, edges, and disclosure.
   - QC: safe areas, captions, contrast, spelling, synchronization, export, and defects.
5. For each finding record:
   - severity;
   - timestamp/frame/section;
   - observed issue;
   - impact;
   - practice;
   - correction;
   - effort;
   - owner.
6. Distinguish:
   - defect;
   - risk;
   - preference;
   - acceptable trade-off.
7. Explicitly preserve strengths, gestures, silences, or valuable imperfections.
8. Prioritize five highest-return changes.
9. Issue a verdict:
   - publish;
   - minor changes;
   - re-edit;
   - partially re-record/regenerate;
   - rethink;
   - HOLD.
10. Identify reusable material and missing items.
11. If proposing A/B, change one variable only and do not use it for critical risks.

LIMITS AND EDGE CASES
- Do not simulate playback, listening, metadata, or quality.
- Do not use a score as a substitute for evidence.
- Do not request full regeneration when a local patch is enough.
- Do not remove authenticity in pursuit of technical perfection.
- An attractive result fails if it alters identity, product, fact, or permission.
- Sensitive claims and rights can produce HOLD.
- Do not execute corrections or approve on the creator’s behalf.

CRITERIA
PASS when:
- observed scope is exact;
- every change has evidence and impact;
- problem and taste are separated;
- strengths are preserved;
- priorities are executable;
- blockers are visible;
- another editor can continue without reinterpretation.

DEFINITION OF DONE
Review Report, verdict, top five, change list, strengths, reusable material, blockers, and next decision.

FALLBACK
If only text or frames are available, limit the review to them and deliver a checklist for the full review; if the material cannot be opened, request a copy or description without inventing. interpret, plan, execute.
```

## PT — SPEC verbatim

```text
SITUAÇÃO
Existe material multimídia em alguma etapa, mas é necessária uma avaliação profissional que diferencie o que deve ser preservado, corrigido, regenerado, regravado, reeditado ou interrompido. A revisão deve ensinar, não apenas pontuar.

PEDIDO
Selecione uma modalidade:
1. Roteiro ou conceito.
2. Imagem ou fotografia.
3. Áudio ou voz.
4. Clipe ou vídeo.
5. Rough cut.
6. Composição híbrida.
7. QC final.
Avalie somente dimensões observáveis e entregue um relatório acionável.

EXECUÇÃO
1. Declare:
   - arquivos acessíveis;
   - versões;
   - o que conseguiu ler, ver ou ouvir;
   - o que não pode ser avaliado.
2. Confirme Brief, Creative Specification, Brand OS e aceitação; se faltarem, use um objetivo provisório visível.
3. Avalie critérios comuns:
   - tese/promessa;
   - valor para a audiência;
   - progressão;
   - evidência;
   - voz/identidade;
   - clareza;
   - acessibilidade;
   - privacidade/direitos;
   - reutilização.
4. Avalie por meio:
   - Roteiro: oralidade, estrutura, claims, ritmo e encerramento.
   - Imagem/foto: composição, sujeito, anatomia, mãos, texto, logos, perspectiva, luz, materiais e resolução.
   - Áudio/voz: consentimento, pronúncia, ritmo, ruído, inteligibilidade, naturalidade, música e atribuição.
   - Clipe/vídeo gerado: continuidade temporal, identidade, flicker, deformação, física, câmera, lip sync e artefatos.
   - Vídeo real: foco, exposição, enquadramento, cobertura, interpretação, continuidade e som.
   - Híbrido: escala, perspectiva, luz, sombras, textura, grão, cor, movimento, bordas e disclosure.
   - QC: safe areas, captions, contraste, ortografia, sincronização, exportação e falhas.
5. Para cada achado registre:
   - severidade;
   - timestamp/frame/seção;
   - observado;
   - impacto;
   - prática;
   - correção;
   - esforço;
   - owner.
6. Distinga:
   - defeito;
   - risco;
   - preferência;
   - trade-off aceitável.
7. Preserve explicitamente pontos fortes, gestos, silêncios ou imperfeições valiosas.
8. Priorize cinco mudanças de maior retorno.
9. Emita veredicto:
   - publicar;
   - mudanças menores;
   - reeditar;
   - regravar/regenerar parcialmente;
   - repensar;
   - HOLD.
10. Identifique material reutilizável e faltantes.
11. Se propuser A/B, mude uma única variável e não o use para riscos críticos.

LIMITES E CASOS LIMITE
- Não simule reprodução, escuta, metadata ou qualidade.
- Não use uma pontuação como substituto de evidência.
- Não peça regeneração completa quando um patch local resolver.
- Não elimine autenticidade em nome da perfeição técnica.
- Um resultado atraente falha se alterar identidade, produto, fato ou permissão.
- Claims sensíveis e direitos podem gerar HOLD.
- Não execute correções nem aprove em nome do criador.

CRITÉRIO
PASS quando:
- o escopo observado é exato;
- cada mudança tem evidência e impacto;
- problema e gosto estão separados;
- pontos fortes são preservados;
- prioridades são executáveis;
- blockers estão visíveis;
- outro editor pode continuar sem reinterpretar.

DEFINITION OF DONE
Review Report, veredicto, top cinco, lista de mudanças, pontos fortes, material reutilizável, blockers e próxima decisão.

FALLBACK
Se houver apenas texto ou frames, limite a revisão a isso e entregue checklist para a revisão completa; se o material não abrir, solicite uma cópia ou descrição sem inventar. interpreta, planeja, executa.
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
