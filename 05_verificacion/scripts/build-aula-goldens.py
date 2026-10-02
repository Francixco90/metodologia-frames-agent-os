#!/usr/bin/env python3
"""Own public draft fixtures. Official offer snapshots are supplied, never scraped silently."""
import argparse
import json
import subprocess
import tempfile
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / '03_artefactos/renderers/frames-aula/examples'

def write(name, data):
    (EXAMPLES / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def section(id, title, body, scene, labels, **extra):
    return {'id': id, 'title': title, 'body': body,
            'scene': scene, 'sceneParams': dict(zip(('title', 'a', 'b', 'c', 'd'), labels)), **extra}

def make_goldens(sources):
    offer, program = (json.loads((sources / (x + '.json')).read_text()) for x in ('offer', 'empowerment'))
    fact = lambda id, text, source: {'id': id, 'text': text, 'source': source['source'],
                                   'sha256': source['sha256'], 'confirmed': True}
    common = {'schemaVersion': 'frames-aula-v1', 'language': 'es', 'languages': ['es'],
              'theme': 'dark', 'pieces': [], 'authoringPolicy': {'origin': 'new'}}
    commercial = [
        section('portada', 'Capacidad propia para trabajar con IA',
                'Entrenamiento, consultoría y soluciones sobre retos reales. Una oferta para aprender, decidir y construir con responsabilidad humana. [METODOLOGIA]',
                'learning-opening', ['Del reto a la capacidad', 'Reto real', 'Método', 'IA con criterio', 'Capacidad propia']),
        section('reto', 'Del reto a una decisión clara',
                'El siguiente paso depende del cuello de botella: criterio, dirección o sistema. El alcance se acuerda sobre un resultado concreto. [METODOLOGIA]',
                'decision-options', ['Elegir la intervención', 'Falta criterio', 'Falta dirección', 'Falta sistema', 'Acordar el alcance'],
                cols=[{'title': 'Entrenar', 'body': 'Aprender y aplicar con criterio.'}, {'title': 'Acompañar', 'body': 'Delimitar y ordenar decisiones.'}, {'title': 'Construir', 'body': 'Resolver una necesidad concreta.'}]),
        section('metodo', 'Un método que se transfiere',
                'Entender el reto, diseñar la intervención, implementar con revisión y transferir la práctica. La tecnología se elige según el caso. [METODOLOGIA]',
                'flow', ['Método antes que herramienta', 'Entender', 'Diseñar', 'Implementar', 'Transferir']),
        section('entrenamientos', 'Entrenamiento para aprender haciendo',
                'Práctica guiada sobre un reto propio, ruta adaptada al contexto y materiales para continuar. Definimos qué producir y cómo revisarlo. [METODOLOGIA]',
                'learning-practice', ['Aprender sobre el trabajo', 'Reto propio', 'Práctica guiada', 'Revisión', 'Material reutilizable']),
        section('consultoria', 'Consultoría para ordenar decisiones',
                'Diagnóstico enfocado, prioridades y una ruta ejecutable con responsables. El acompañamiento convierte incertidumbre en decisiones documentadas. [METODOLOGIA]',
                'decision-options', ['De incertidumbre a dirección', 'Diagnosticar', 'Priorizar', 'Decidir', 'Acompañar']),
        section('soluciones', 'Soluciones para necesidades concretas',
                'Caso de uso delimitado, prototipo verificable y consolidación con gobierno y transferencia. El equipo debe poder operar la solución. [METODOLOGIA]',
                'steps', ['Construir y comprobar', 'Caso delimitado', 'Prototipo', 'Revisión humana', 'Transferencia']),
        section('entregables', 'Entregables que permiten continuar',
                'Según el alcance: materiales, decisiones, rutas, prototipos y documentación de la práctica. Son componentes de la oferta; los resultados se comprobarán en cada proyecto. [METODOLOGIA]',
                'evidence-observe', ['Evidencia de trabajo', 'Materiales', 'Decisiones', 'Prototipos', 'Práctica documentada']),
        section('tapa', 'Conversemos sobre tu siguiente paso',
                'Trae un reto y el resultado que necesitas. Revisaremos si conviene entrenar, acompañar o construir, y acordaremos alcance y evidencia de avance. [METODOLOGIA]',
                'learning-closing', ['Un siguiente paso concreto', 'Tu reto', 'Resultado buscado', 'Alcance', 'Evidencia de avance']),
    ]
    for s in commercial:
        s.update(factIds=['offer-current'], notes='Presentar la oferta; no prometer resultados ya obtenidos. Solicitar un siguiente paso concreto.')
    write('golden-brochure-metodologia-8.json', {**common, 'title': 'MetodologIA · Capacidad propia con IA',
          'objectives': ['Identificar la intervención adecuada para un reto profesional.'],
          'acceptance': ['La persona distingue entrenamiento, consultoría y soluciones y define un siguiente paso.'],
          'facts': [fact('offer-current', 'Oferta: entrenamiento, consultoría y construcción de soluciones; método entender, diseñar, implementar y transferir.', offer)],
          'authoringPolicy': {'origin': 'new', 'maxSlides': 8, 'explicitBrief': 'Javier requested a commercial brochure with exactly eight slides, including cover and back cover.'}, 'sections': commercial})
    opening = section('portada', 'Tu reto profesional, una ruta con IA',
                      'Programa de Empoderamiento de MetodologIA. Una ruta para diseñar, usar, comprobar y mejorar una práctica propia. [METODOLOGIA]',
                      'learning-opening', ['Del reto a una práctica propia', 'Reto profesional', 'Método', 'Práctica con IA', 'Evidencia'])
    audience = section('audiencia', 'Parte de un reto que te importe',
                       'Para personas o equipos con un reto profesional real. No exige experiencia previa con IA. El contexto ayuda a decidir qué aprender y cómo comprobarlo. [METODOLOGIA]',
                       'team-roles', ['Tu caso orienta la ruta', 'Persona o equipo', 'Reto real', 'Nivel de partida', 'Criterio compartido'],
                       reflection='¿Qué resultado te gustaría repetir de forma confiable?')
    contract = section('contrato', 'La IA asiste; tú respondes',
                       'La ruta publicada contempla 16 semanas y 3 horas por semana. El programa aporta estructura y revisión; tú conservas las decisiones y la responsabilidad. [METODOLOGIA]',
                       'gate', ['Responsabilidad y revisión', 'Propósito', 'Producción con IA', 'Revisión humana', 'Decisión'],
                       checkpoints=[{'question': '¿Quién decide si una salida sirve?', 'answer': 'La persona responsable compara la salida con el estándar acordado.', 'criterion': 'Identifica revisión humana y un estándar explícito.'}])
    cycles = section('ciclos', 'Cuatro ciclos construyen una práctica',
                     'Diagnosticar, diseñar, practicar y consolidar. Cada ciclo ocupa cuatro semanas y prepara un activo que habilita el siguiente. [METODOLOGIA]',
                     'flow', ['Una ruta de cuatro ciclos', 'Diagnosticar', 'Diseñar', 'Practicar', 'Consolidar'])
    assets = section('activos', 'Cuatro activos para continuar',
                     'Mapa de dirección, sistema de trabajo, kit con IA y portafolio de evidencia. Se construyen sobre el caso propio y permiten explicar y repetir la práctica. [METODOLOGIA]',
                     'evidence-observe', ['Lo que permanece', 'Mapa de dirección', 'Sistema de trabajo', 'Kit con IA', 'Portafolio'],
                     table={'headers': ['Activo', 'Qué conserva'], 'rows': [['Mapa de dirección', 'Propósito y criterios'], ['Sistema de trabajo', 'Flujos y reglas'], ['Kit con IA', 'Prompts y fuentes'], ['Portafolio', 'Entregables y decisiones']]})
    class_ = section('clase', 'Aprende, aplica y revisa tu caso',
                     'Cada sesión combina una masterclass inicial, hands-on y cierre de dudas. La práctica trabaja sobre el contexto de la persona participante. [METODOLOGIA]',
                     'learning-practice', ['Tres momentos de clase', 'Concepto y criterio', 'Ejemplo', 'Práctica propia', 'Revisión y cierre'],
                     demonstration='Ejemplo didáctico: un equipo define una entrega, prueba un prompt y revisa si cumple el criterio. [SUPUESTO]',
                     practice='Escribe un reto, un entregable y una evidencia observable de avance. [SUPUESTO]',
                     prompt='Para {{reto}}, propón un entregable pequeño. Explicita fuentes necesarias, criterio de revisión humana y evidencia observable. Marca lo desconocido como supuesto.',
                     fields=[{'key': 'reto', 'label': 'Tu reto profesional', 'default': 'preparar una propuesta revisable'}],
                     exemplar='Reto: ordenar una propuesta. Entregable: borrador con fuentes. Criterio: separar hechos y supuestos. Evidencia: revisión registrada. [SUPUESTO]')
    evidence = section('evidencia', 'El avance se demuestra con entregables',
                       'El portafolio reúne trabajo, decisiones y aprendizajes explicables. La oferta distingue participación y competencia bajo sus condiciones; este ejemplo no emite ninguna credencial. [METODOLOGIA]',
                       'learning-feedback', ['Comprobar antes de usar', 'Entregable', 'Criterio', 'Revisión', 'Aprendizaje'],
                       checkpoints=[{'question': '¿Qué incluirías para comprobar tu avance?', 'answer': 'Un entregable, el criterio usado y el registro de revisión y decisiones.', 'criterion': 'Aporta evidencia concreta y distingue participación de competencia.'}])
    closing = section('tapa', 'Define tu primer compromiso verificable',
                      'Trae un caso real. Describe qué quieres cambiar, qué entregarás y cómo lo revisarás. El diagnóstico fija el punto de partida de la ruta. [METODOLOGIA]',
                      'learning-transfer', ['De la explicación a tu caso', 'Tu reto', 'Primer entregable', 'Criterio', 'Siguiente acción'],
                      transfer='Registrar una acción, una evidencia y una fecha elegida por la persona. [SUPUESTO]')
    cycle_details = [
        section('diagnosticar', 'Diagnosticar: delimita el punto de partida', 'Semanas 1–4: prioridades, recepción, presencia y estándar de excelencia. Define el reto y la evidencia que importa. [METODOLOGIA]', 'evidence-observe', ['Diagnosticar', 'Prioridades', 'Punto de partida', 'Respuesta consciente', 'Estándar']),
        section('disenar', 'Diseñar: convierte intención en flujo', 'Semanas 5–8: fricciones, jornadas estratégicas, rituales de desempeño y prototipado con IA. Documenta decisiones y un estándar de calidad. [METODOLOGIA]', 'steps', ['Diseñar', 'Fricción', 'Jornada', 'Rituales', 'Prototipo']),
        section('practicar', 'Practicar: produce y revisa con IA', 'Semanas 9–12: multimedia, mini apps, asistentes y skills, y automatización. Ejecuta sobre el caso, revisa los resultados y ajusta el sistema. [METODOLOGIA]', 'learning-practice', ['Practicar', 'Multimedia', 'Mini apps', 'Asistentes y skills', 'Automatizar']),
        section('consolidar', 'Consolidar: documenta y transfiere la práctica', 'Semanas 13–16: agentes, orquestación, integración de aprendizajes y cierre. Presenta tu portafolio y define el siguiente ciclo. [METODOLOGIA]', 'learning-transfer', ['Consolidar', 'Agentes', 'Orquestación', 'Integración', 'Portafolio']),
    ]
    method = section('metodo', 'Método antes que herramienta', 'Intención define el resultado; flujo ordena decisiones; criterio compara la salida con el estándar. El contexto dirige la elección de herramientas. [METODOLOGIA]', 'contrast', ['Tres decisiones del método', 'Intención', 'Flujo', 'Criterio', 'Herramienta contextual'])
    for count, sections in [(8, [opening, audience, contract, cycles, assets, class_, evidence, closing]),
                            (13, [opening, audience, method, contract, cycles, *cycle_details, class_, assets, evidence, closing])]:
        assert len(sections) == count
        data = json.loads(json.dumps(sections))
        for s in data:
            s.update(factIds=['program-current'], durationMinutes=2,
                     facilitatorNotes='Distinguir oferta publicada de ejemplos didácticos. No atribuir logros a participantes.')
        run = [{'sectionId': s['id'], 'minutes': 2, 'notes': 'Presentar, detenerse para preguntas y revisar la comprensión.'} for s in data]
        write(f'golden-empoderamiento-metodologia-{count}.json', {**common,
              'title': f'Programa de Empoderamiento · MetodologIA · {count} escenas',
              'objectives': ['Explicar la ruta y sus activos.', 'Definir un reto y una evidencia inicial.'],
              'acceptance': ['Relaciona ciclos, activos y revisión humana.', 'Propone un entregable con criterio de revisión.'],
              'facts': [fact('program-current', 'Programa publicado:16 semanas,3 horas semanales,cuatro ciclos y cuatro activos; personas o equipos, sin experiencia previa requerida.', program)],
              'authoringPolicy': {'origin': 'new', 'maxSlides': count, 'explicitBrief': f'Javier requested the academic empowerment presentation with exactly {count} slides, including cover and back cover.'},
              'training': {'durationMinutes': count * 2, 'audience': 'Personas o equipos que exploran el programa',
                           'materials': ['Un reto profesional y una hoja para registrar evidencia.'], 'runOfShow': run},
              'sections': data})
    write('golden-source-receipts.json', {'state': 'RENDERED_DRAFT', 'sources': [offer, program],
          'note': 'Published offer is provenance, not evidence of realized participant outcomes. Didactic timings are design assumptions.'})

def enhance_fixtures():
    def l(es, en, pt, fr): return dict(zip(('es', 'en', 'pt', 'fr'), (es, en, pt, fr)))
    blocks = [
        section('criterio', l('Acordar el criterio', 'Agree the criterion', 'Acordar o critério', 'Convenir du critère'),
                l('Define qué resultado revisarás y qué evidencia necesitas. [SUPUESTO]', 'Define the result to review and the evidence needed. [SUPUESTO]', 'Defina o resultado a revisar e a evidência necessária. [SUPUESTO]', 'Définissez le résultat à examiner et les preuves nécessaires. [SUPUESTO]'),
                'learning-demonstration', [l('Un estándar explícito', 'An explicit standard', 'Um padrão explícito', 'Un standard explicite'), l('Contexto', 'Context', 'Contexto', 'Contexte'), l('Evidencia', 'Evidence', 'Evidência', 'Preuve'), l('Revisión', 'Review', 'Revisão', 'Examen'), l('Decisión', 'Decision', 'Decisão', 'Décision')]),
        section('revision', l('Revisar antes de usar', 'Review before use', 'Revisar antes de usar', 'Examiner avant usage'),
                l('Compara el borrador con el criterio y registra cambios. [SUPUESTO]', 'Compare the draft with the criterion and record changes. [SUPUESTO]', 'Compare o rascunho com o critério e registre mudanças. [SUPUESTO]', 'Comparez le brouillon au critère et consignez les changements. [SUPUESTO]'),
                'learning-feedback', [l('Evidencia de revisión', 'Review evidence', 'Evidência de revisão', 'Preuve de révision'), l('Borrador', 'Draft', 'Rascunho', 'Brouillon'), l('Criterio', 'Criterion', 'Critério', 'Critère'), l('Revisión', 'Review', 'Revisão', 'Examen'), l('Cambios', 'Changes', 'Mudanças', 'Changements')]),
        section('transferencia', l('Aplicar al siguiente caso', 'Apply to the next case', 'Aplicar ao próximo caso', 'Appliquer au prochain cas'),
                l('Elige una acción y conserva su evidencia. [SUPUESTO]', 'Choose an action and keep its evidence. [SUPUESTO]', 'Escolha uma ação e guarde sua evidência. [SUPUESTO]', 'Choisissez une action et conservez sa preuve. [SUPUESTO]'),
                'learning-transfer', [l('Tu siguiente paso', 'Your next step', 'Seu próximo passo', 'Votre prochaine étape'), l('Caso', 'Case', 'Caso', 'Cas'), l('Acción', 'Action', 'Ação', 'Action'), l('Evidencia', 'Evidence', 'Evidência', 'Preuve'), l('Revisión', 'Review', 'Revisão', 'Examen')]),
    ]
    # Templates are original small examples; retain all four existing languages.
    for file in sorted(EXAMPLES.glob('*.json')):
        if file.name.startswith('golden-') or file.name == 'technical-deck.json': continue
        data = json.loads(file.read_text())
        if not data.get('sections') or any(s['id'] == 'criterio' for s in data['sections']): continue
        data['sections'] += json.loads(json.dumps(blocks))
        kind = file.stem
        if kind in ('immersive-class', 'masterclass', 'dynamic-commercial-decks', 'module'):
            data['authoringPolicy'] = {'origin': 'new'}
        practice = data['sections'][1]
        practice['practice'] = l('Completa tu contexto y verifica el prompt resultante. [SUPUESTO]', 'Complete your context and verify the resulting prompt. [SUPUESTO]', 'Complete seu contexto e verifique o prompt resultante. [SUPUESTO]', 'Complétez votre contexte et vérifiez le prompt produit. [SUPUESTO]')
        data['sections'][0]['scene'] = 'learning-opening'
        practice['scene'] = 'learning-practice'
        if kind in ('immersive-class', 'masterclass'):
            practice['checkpoints'] = [{'question': l('¿Qué hace verificable tu propuesta?', 'What makes your proposal verifiable?', 'O que torna sua proposta verificável?', 'Qu’est-ce qui rend votre proposition vérifiable?'),
                'answer': l('Un objetivo, una evidencia y un criterio explícitos.', 'An explicit goal, evidence and criterion.', 'Um objetivo, evidência e critério explícitos.', 'Un objectif, une preuve et un critère explicites.'),
                'criterion': l('Nombra los tres elementos.', 'Names all three elements.', 'Nomeia os três elementos.', 'Nomme les trois éléments.')}]
            data['training'] = {'durationMinutes': 15, 'materials': [l('Un caso profesional de práctica. [SUPUESTO]', 'A professional practice case. [SUPUESTO]', 'Um caso profissional de prática. [SUPUESTO]', 'Un cas professionnel de pratique. [SUPUESTO]')],
                                'runOfShow': [{'sectionId': s['id'], 'minutes': 3} for s in data['sections']]}
        if kind == 'lean-coffee':
            practice.update(durationMinutes=2, reveal=True, checkpoints=[{'question': l('¿Qué práctica repetirías?', 'Which practice would you repeat?', 'Qual prática você repetiria?', 'Quelle pratique répéteriez-vous?')}])
        if kind in ('playbook', 'playbook-immersive'):
            practice['table'] = {'headers': [l('Paso', 'Step', 'Etapa', 'Étape'), l('Evidencia', 'Evidence', 'Evidência', 'Preuve')],
                                 'rows': [[l('Delimitar', 'Scope', 'Delimitar', 'Délimiter'), l('Objetivo', 'Goal', 'Objetivo', 'Objectif')],
                                          [l('Revisar', 'Review', 'Revisar', 'Examiner'), l('Decisión', 'Decision', 'Decisão', 'Décision')]]}
        write(file.name, data)

    workbook=json.loads((EXAMPLES/'workbook.json').read_text())
    practice=workbook['sections'][1]
    practice['fields']=[{'key':key,'label':label,'default':default} for key,label,default in [
        ('contexto',l('Tu contexto','Your context','Seu contexto','Votre contexte'),l('un equipo de práctica','a practice team','uma equipe de prática','une équipe de pratique')),
        ('audiencia',l('Audiencia','Audience','Público','Public'),l('colegas que revisarán el resultado','colleagues reviewing the result','colegas que revisarão o resultado','collègues examinant le résultat')),
        ('restriccion',l('Restricción','Constraint','Restrição','Contrainte'),l('sin datos personales ni resultados inventados','no personal data or invented outcomes','sem dados pessoais ou resultados inventados','sans données personnelles ni résultats inventés')),
        ('criterio',l('Criterio de revisión','Review criterion','Critério de revisão','Critère de révision'),l('objetivo, evidencia y punto de parada explícitos','explicit goal, evidence and stop point','objetivo, evidência e ponto de parada explícitos','objectif, preuves et point d’arrêt explicites'))]]
    practice['settings']=[{'key':key,'label':label,'default':default} for key,label,default in [
        ('profundidad',l('Profundidad','Depth','Profundidade','Profondeur'),l('un experimento pequeño','one small experiment','um experimento pequeno','une petite expérience')),
        ('tono',l('Tono','Tone','Tom','Ton'),l('claro y directo','clear and direct','claro e direto','clair et direct'))]]
    practice['prompt']=l('Para {{contexto}}, prepara un experimento dirigido a {{audiencia}}. Restricción: {{restriccion}}. Criterio: {{criterio}}. Profundidad: {{profundidad}}. Tono: {{tono}}. Entrega objetivo, pasos, evidencia y punto de parada. No inventes resultados.',
                        'For {{contexto}}, prepare an experiment for {{audiencia}}. Constraint: {{restriccion}}. Criterion: {{criterio}}. Depth: {{profundidad}}. Tone: {{tono}}. Deliver goal, steps, evidence and stop point. Do not invent outcomes.',
                        'Para {{contexto}}, prepare um experimento para {{audiencia}}. Restrição: {{restriccion}}. Critério: {{criterio}}. Profundidade: {{profundidad}}. Tom: {{tono}}. Entregue objetivo, etapas, evidência e ponto de parada. Não invente resultados.',
                        'Pour {{contexto}}, préparez une expérience destinée à {{audiencia}}. Contrainte : {{restriccion}}. Critère : {{criterio}}. Profondeur : {{profundidad}}. Ton : {{tono}}. Fournissez objectif, étapes, preuves et point d’arrêt. N’inventez pas de résultats.')
    write('workbook.json',workbook)

def refresh_collection():
    module = json.loads((EXAMPLES / 'module.template.json').read_text())
    module['pieceSections'] = {kind: json.loads((EXAMPLES / (kind + '.json')).read_text())['sections']
                               for kind in ('immersive-class','masterclass','workbook','lean-coffee','playbook','playbook-immersive')}
    write('module.json', module)
    index = json.loads((EXAMPLES / 'index.json').read_text())
    index['pieces'] = [{'kind': kind, 'href': kind + '.html'} for kind in ('masterclass','workbook')]
    for kind in ('masterclass','workbook'):
        with tempfile.TemporaryDirectory() as scratch:
            out = Path(scratch).resolve() / 'site'
            subprocess.run(['python3',str(EXAMPLES.parent / 'runtime.py'),'build','--kind',kind,
                            '--edition','metodologia','--input',str(EXAMPLES / (kind + '.json')),
                            '--out',str(out)],check=True,stdout=subprocess.DEVNULL,
                           env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
            (EXAMPLES / (kind + '.html')).write_bytes((out / 'artifact.html').read_bytes())
    write('index.json', index)

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--sources', type=Path, required=True); a = p.parse_args()
    make_goldens(a.sources); enhance_fixtures(); refresh_collection()
    print('Created three public draft goldens and enhanced nine format fixtures; HTML companions refreshed; no approvals issued.')
