---
schema_version: prompt-spec-v1
prompt_id: P05
command: /disenar-pieza
title: "Diseña la pieza multimedia"
purpose: "Convierte un brief aprobado en guion, secuencia, continuidad y mapa de activos."
variables:
  - name: BRIEF_APROBADO
    default: "Una audiencia situada, una tesis, una promesa, evidencia visible, límites de marca y una acción esperada."
  - name: PIEZA_Y_RUTA
    default: "Recomienda entre imagen, serie/carrusel, miniclip, video, audio, pieza sin rostro o híbrida, y entre IA nativa, captura real asistida o combinación."
  - name: ACTIVOS_Y_RESTRICCIONES
    default: "Usa activos existentes cuando aporten; recursos moderados, derechos visibles, identidad protegida y diseño reutilizable para las plataformas pertinentes."
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

# Diseña la pieza multimedia · P05

> Provenance: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato · Estado: candidate · guion · storyboard · activos · continuidad [DOC]

## ES — SPEC verbatim

```text
SITUACIÓN
Existe un brief aprobado, pero todavía falta convertirlo en una especificación creativa suficientemente precisa para generar, capturar o combinar activos sin perder tesis, voz, continuidad ni derechos.

PEDIDO
Selecciona un formato principal y una ruta:
- formatos: imagen, serie/carrusel, fotografía, miniclip, video, audio, pieza sin rostro o composición híbrida;
- rutas: IA nativa, captura real asistida, híbrida o handoff.
Diseña la pieza; no ejecutes todavía la generación, captura o edición final.

EJECUCIÓN
1. Confirma Brief, Brand OS, evidencia, claims, derechos, exposición y plataformas.
2. Resume en una oración:
   - audiencia;
   - tensión;
   - tesis;
   - promesa;
   - acción.
3. Compara rutas IA/real/híbrida por:
   - autenticidad;
   - control creativo;
   - continuidad;
   - velocidad;
   - esfuerzo;
   - derechos;
   - necesidad de mostrar una persona, lugar o producto real;
   - capacidad del entorno.
4. Selecciona una y justifica el trade-off.
5. Diseña:
   - arquitectura narrativa;
   - hook u orientación inicial;
   - progresión;
   - ejemplo/evidencia;
   - matiz;
   - cierre;
   - CTA.
6. Según el medio:
   - imagen: jerarquía, composición, sujeto, ambiente, luz, color, textura, texto y uso;
   - serie/carrusel: función de cada lámina y progresión;
   - clip/video: guion, beats, duración, escenas, movimiento, cámara, transiciones y sonido;
   - audio: guion, voz, ritmo, ambiente, música y silencios;
   - híbrido: mapa de capas reales/generadas y reglas de integración.
7. Crea una Biblia de continuidad:
   - identidad;
   - rasgos inmutables;
   - paleta/contraste;
   - tipografía;
   - vestuario/objetos;
   - perspectiva;
   - escala;
   - luz;
   - estilo de movimiento;
   - pronunciación y voz;
   - elementos prohibidos.
8. Crea Asset Map:
   - ID;
   - función narrativa;
   - origen: existente/generado/capturado/licenciado;
   - especificación universal;
   - formato;
   - relación de aspecto;
   - duración;
   - audio;
   - derechos;
   - dependencia;
   - aceptación.
9. Escribe prompts o instrucciones por activo sin sintaxis propietaria.
10. Diseña derivados que reutilicen activos sin perder contexto.
11. Propón versión mínima y versión recomendada.
12. Finaliza con Creative Specification, Asset Map, riesgos, pendientes y Definition of Ready.

LÍMITES Y CASOS BORDE
- No generes archivos ni afirmes que existen.
- No uses una persona, voz, rostro, marca o producto sin autorización o representación fiel.
- Una estética no sustituye la función narrativa.
- Si el texto debe aparecer dentro de una imagen generada y la exactitud importa, planifica composición posterior.
- Si la continuidad de personaje es crítica, define referencias y pruebas antes de un video largo.
- Si una escena real aporta evidencia irremplazable, no la sustituyas por una simulación sin disclosure.
- No diseñes derivados que dependan de contexto ausente.

CRITERIO
PASS cuando:
- el medio y la ruta están justificados;
- la pieza conserva una tesis;
- cada escena o activo tiene función;
- la continuidad está definida;
- generación, captura y edición están separadas;
- otra IA o persona puede producir sin reinterpretar;
- derechos y claims están visibles;
- existe versión mínima.

DEFINITION OF DONE
Creative Specification, guion/copy, storyboard/secuencia, Biblia de continuidad, Asset Map, prompts universales, derivados, aceptación y siguiente gate.

FALLBACK
Si el brief no permite escoger medio o ruta, diseña un prototipo de bajo costo: una imagen o frame, un clip corto o una prueba de voz antes de comprometer la pieza completa. interpreta, planifica, ejecuta.
```

## EN — SPEC verbatim

```text
SITUATION
An approved brief exists, but it still needs to be turned into a creative specification precise enough to generate, capture, or combine assets without losing thesis, voice, continuity, or rights.

REQUEST
Select one primary format and one route:
- formats: image, series/carousel, photograph, mini-clip, video, audio, faceless piece, or hybrid composition;
- routes: AI-native, assisted real capture, hybrid, or handoff.
Design the piece; do not yet execute generation, capture, or final editing.

EXECUTION
1. Confirm the Brief, Brand OS, evidence, claims, rights, exposure, and platforms.
2. Summarize in one sentence:
   - audience;
   - tension;
   - thesis;
   - promise;
   - action.
3. Compare AI/real/hybrid routes by:
   - authenticity;
   - creative control;
   - continuity;
   - speed;
   - effort;
   - rights;
   - need to show a real person, place, or product;
   - environment capability.
4. Select one and justify the trade-off.
5. Design:
   - narrative architecture;
   - hook or initial orientation;
   - progression;
   - example/evidence;
   - nuance;
   - closing;
   - CTA.
6. By medium:
   - image: hierarchy, composition, subject, environment, light, color, texture, text, and use;
   - series/carousel: role of each slide and progression;
   - clip/video: script, beats, duration, scenes, movement, camera, transitions, and sound;
   - audio: script, voice, pace, ambience, music, and silence;
   - hybrid: map of real/generated layers and integration rules.
7. Create a Continuity Bible:
   - identity;
   - immutable traits;
   - palette/contrast;
   - typography;
   - wardrobe/objects;
   - perspective;
   - scale;
   - light;
   - movement style;
   - pronunciation and voice;
   - prohibited elements.
8. Create an Asset Map:
   - ID;
   - narrative function;
   - origin: existing/generated/captured/licensed;
   - universal specification;
   - format;
   - aspect ratio;
   - duration;
   - audio;
   - rights;
   - dependency;
   - acceptance.
9. Write prompts or instructions per asset without proprietary syntax.
10. Design derivatives that reuse assets without losing context.
11. Propose a minimum version and a recommended version.
12. Finish with the Creative Specification, Asset Map, risks, pending items, and Definition of Ready.

LIMITS AND EDGE CASES
- Do not generate files or claim that they exist.
- Do not use a person, voice, face, brand, or product without authorization or faithful representation.
- An aesthetic does not replace narrative function.
- If text must appear inside a generated image and accuracy matters, plan later compositing.
- If character continuity is critical, define references and tests before a long video.
- If a real scene provides irreplaceable evidence, do not replace it with a simulation without disclosure.
- Do not design derivatives that depend on missing context.

CRITERIA
PASS when:
- medium and route are justified;
- the piece preserves one thesis;
- every scene or asset has a function;
- continuity is defined;
- generation, capture, and editing are separated;
- another AI or person can produce without reinterpretation;
- rights and claims are visible;
- a minimum version exists.

DEFINITION OF DONE
Creative Specification, script/copy, storyboard/sequence, Continuity Bible, Asset Map, universal prompts, derivatives, acceptance, and next gate.

FALLBACK
If the brief does not allow a medium or route to be selected, design a low-cost prototype: one image or frame, a short clip, or a voice test before committing to the full piece. interpret, plan, execute.
```

## PT — SPEC verbatim

```text
SITUAÇÃO
Existe um brief aprovado, mas ainda falta transformá-lo em uma especificação criativa suficientemente precisa para gerar, capturar ou combinar ativos sem perder tese, voz, continuidade nem direitos.

PEDIDO
Selecione um formato principal e uma rota:
- formatos: imagem, série/carrossel, fotografia, miniclipe, vídeo, áudio, peça sem rosto ou composição híbrida;
- rotas: IA nativa, captura real assistida, híbrida ou handoff.
Desenhe a peça; ainda não execute a geração, captura ou edição final.

EXECUÇÃO
1. Confirme Brief, Brand OS, evidência, claims, direitos, exposição e plataformas.
2. Resuma em uma frase:
   - audiência;
   - tensão;
   - tese;
   - promessa;
   - ação.
3. Compare as rotas IA/real/híbrida por:
   - autenticidade;
   - controle criativo;
   - continuidade;
   - velocidade;
   - esforço;
   - direitos;
   - necessidade de mostrar pessoa, lugar ou produto real;
   - capacidade do ambiente.
4. Selecione uma e justifique o trade-off.
5. Desenhe:
   - arquitetura narrativa;
   - hook ou orientação inicial;
   - progressão;
   - exemplo/evidência;
   - nuance;
   - encerramento;
   - CTA.
6. Conforme o meio:
   - imagem: hierarquia, composição, sujeito, ambiente, luz, cor, textura, texto e uso;
   - série/carrossel: função de cada slide e progressão;
   - clipe/vídeo: roteiro, beats, duração, cenas, movimento, câmera, transições e som;
   - áudio: roteiro, voz, ritmo, ambiente, música e silêncios;
   - híbrido: mapa de camadas reais/geradas e regras de integração.
7. Crie uma Bíblia de continuidade:
   - identidade;
   - traços imutáveis;
   - paleta/contraste;
   - tipografia;
   - figurino/objetos;
   - perspectiva;
   - escala;
   - luz;
   - estilo de movimento;
   - pronúncia e voz;
   - elementos proibidos.
8. Crie um Asset Map:
   - ID;
   - função narrativa;
   - origem: existente/gerado/capturado/licenciado;
   - especificação universal;
   - formato;
   - proporção;
   - duração;
   - áudio;
   - direitos;
   - dependência;
   - aceitação.
9. Escreva prompts ou instruções por ativo sem sintaxe proprietária.
10. Desenhe derivados que reutilizem ativos sem perder contexto.
11. Proponha versão mínima e versão recomendada.
12. Finalize com Creative Specification, Asset Map, riscos, pendências e Definition of Ready.

LIMITES E CASOS LIMITE
- Não gere arquivos nem afirme que existem.
- Não use pessoa, voz, rosto, marca ou produto sem autorização ou representação fiel.
- Uma estética não substitui a função narrativa.
- Se o texto precisar aparecer dentro de uma imagem gerada e a exatidão importar, planeje composição posterior.
- Se a continuidade de personagem for crítica, defina referências e testes antes de um vídeo longo.
- Se uma cena real trouxer evidência insubstituível, não a substitua por simulação sem disclosure.
- Não desenhe derivados que dependam de contexto ausente.

CRITÉRIO
PASS quando:
- o meio e a rota estão justificados;
- a peça preserva uma tese;
- cada cena ou ativo tem função;
- a continuidade está definida;
- geração, captura e edição estão separadas;
- outra IA ou pessoa pode produzir sem reinterpretar;
- direitos e claims estão visíveis;
- existe uma versão mínima.

DEFINITION OF DONE
Creative Specification, roteiro/copy, storyboard/sequência, Bíblia de continuidade, Asset Map, prompts universais, derivados, aceitação e próximo gate.

FALLBACK
Se o brief não permitir escolher meio ou rota, desenhe um protótipo de baixo custo: uma imagem ou frame, um clipe curto ou um teste de voz antes de comprometer a peça completa. interpreta, planeja, executa.
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
