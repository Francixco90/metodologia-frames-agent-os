#!/usr/bin/env python3
"""Original offline Frames Aula renderer. Python standard library only."""
import argparse, copy, hashlib, html, json, pathlib, re, sys
ROOT=pathlib.Path(__file__).resolve().parent
SHELL_UI={
    'es':['Revisión humana pendiente','Saltar al contenido','Idioma','Secciones','Estado'],
    'en':['Human review pending','Skip to content','Language','Sections','State'],
    'pt':['Revisão humana pendente','Ir para o conteúdo','Idioma','Seções','Estado'],
    'fr':['Relecture humaine en attente','Aller au contenu','Langue','Sections','État'],
}
KINDS=('immersive-class','masterclass','workbook','lean-coffee','playbook','playbook-immersive','index','module','dynamic-commercial-decks')
def localized(x,lang='es'):
    return x.get(lang,x.get('es',next(iter(x.values()),''))) if isinstance(x,dict) else str(x or '')
def sample(kind):
    def tr(es,en,pt,fr): return dict(es=es,en=en,pt=pt,fr=fr)
    title=tr('De la idea a la práctica','From idea to practice','Da ideia à prática','De l’idée à la pratique')
    intents={
      'workbook':tr('Construye tu experimento','Build your experiment','Construa seu experimento','Construisez votre expérience'),
      'masterclass':tr('Comprende antes de elegir','Understand before choosing','Entenda antes de escolher','Comprendre avant de choisir'),
      'immersive-class':tr('Observa, discute y practica','Observe, discuss and practice','Observe, discuta e pratique','Observer, discuter et pratiquer'),
      'lean-coffee':tr('¿Qué pregunta merece nuestra atención?','Which question deserves our attention?','Qual pergunta merece nossa atenção?','Quelle question mérite notre attention ?'),
      'playbook':tr('Un procedimiento verificable','A verifiable procedure','Um procedimento verificável','Une procédure vérifiable'),
      'playbook-immersive':tr('Recorre el procedimiento','Walk through the procedure','Percorra o procedimento','Parcourir la procédure'),
      'index':tr('Elige tu siguiente recurso','Choose your next resource','Escolha seu próximo recurso','Choisissez votre prochaine ressource'),
      'module':tr('Un kit para aprender y practicar','A kit to learn and practice','Um kit para aprender e praticar','Un kit pour apprendre et pratiquer'),
      'dynamic-commercial-decks':tr('Una decisión comercial con evidencia','An evidence-based commercial decision','Uma decisão comercial com evidência','Une décision commerciale fondée sur des preuves')}
    body=tr('Describe la situación antes de elegir una solución. [METODOLOGIA]','Describe the situation before choosing a solution. [METODOLOGIA]','Descreva a situação antes de escolher uma solução. [METODOLOGIA]','Décrivez la situation avant de choisir une solution. [METODOLOGIA]')
    return {'schemaVersion':'frames-aula-v1','title':title,'languages':['es','en','pt','fr'],'language':'es','objectives':[tr('Construir una propuesta verificable','Build a verifiable proposal','Construir uma proposta verificável','Construire une proposition vérifiable')],'acceptance':[tr('Incluye objetivo, evidencia y siguiente paso.','Include objective, evidence and next step.','Inclua objetivo, evidência e próximo passo.','Inclure objectif, preuve et prochaine étape.')],'sections':[{'id':'contexto','title':intents[kind],'body':body,'scene':'flow','notes':tr('Invita a una reflexión breve.','Invite a brief reflection.','Convide a uma breve reflexão.','Invitez à une courte réflexion.')},{'id':'practica','title':tr('Prueba una idea pequeña','Test one small idea','Teste uma pequena ideia','Testez une petite idée'),'body':body,'prompt':tr('Propón un experimento para {{contexto}}. Incluye objetivo y evidencia.','Propose an experiment for {{contexto}}. Include objective and evidence.','Proponha um experimento para {{contexto}}. Inclua objetivo e evidência.','Proposez une expérience pour {{contexto}}. Incluez objectif et preuve.'),'fields':[{'key':'contexto','label':tr('Tu contexto','Your context','Seu contexto','Votre contexte'),'default':'un equipo de práctica'}],'scene':'steps','exemplar':tr('Un equipo registra una prueba y revisa el resultado. [SUPUESTO]','A team records a test and reviews the result. [SUPUESTO]','Uma equipe registra um teste e revisa o resultado. [SUPUESTO]','Une équipe consigne un test et examine le résultat. [SUPUESTO]')}],'facts':[],'pieces':[]}
def safe_local_href(href,base=None):
    if not isinstance(href,str) or not href or any(c in href for c in (':','\\','?','%')) or href.startswith('/'):
        return False
    target=href.split('#',1)[0]
    if '..' in pathlib.PurePosixPath(target).parts: return False
    if not target: return href.startswith('#')
    if base is not None:
        path=base/target
        if not path.is_file() or any(x.is_symlink() for x in (path,*path.parents)): return False
        if not path.resolve().is_relative_to(base.resolve()): return False
    return True

def audience_content(data):
    if isinstance(data,dict): return {key:audience_content(value) for key,value in data.items() if key not in ('notes','spoken','migrationSource')}
    if isinstance(data,list): return [audience_content(value) for value in data]
    return data

def effective_colors(brand,edition):
    colors={'night':'#0a122a','gold':'#8a6d00','white':'#ffffff'}
    if edition=='white-label' and 'colors' not in brand: colors.update(night='#152238',gold='#334155')
    return {**colors,**brand.get('colors',{})}

def validate(d,kind,edition,base=None):
    errors=[]
    if not isinstance(d,dict): return ['Brief debe ser objeto JSON']
    if not isinstance(d.get('sections'),list) or any(not isinstance(s,dict) for s in d.get('sections',[])): return ['sections debe ser lista de objetos']
    languages=d.get('languages',['es'])
    if not isinstance(languages,list) or not languages or any(x not in ('es','en','pt','fr') for x in languages) or len(languages)!=len(set(languages)) or d.get('language','es') not in languages: errors.append('Idiomas declarados inválidos')
    def inspect_translations(value):
        if isinstance(value,dict):
            if any(key in ('es','en','pt','fr') for key in value) and any(not value.get(lang) for lang in languages): errors.append('Traducción declarada ausente')
            for child in value.values(): inspect_translations(child)
        elif isinstance(value,list):
            for child in value: inspect_translations(child)
    inspect_translations(d)
    raw=json.dumps(d,ensure_ascii=False)
    if re.search(r'(?i)\b(TODO|TBD|LOREM IPSUM)\b|‹[^›]+›|\[PENDIENTE\]',raw): errors.append('Placeholder sin resolver')
    if edition=='metodologia' and d.get('brand'): errors.append('MetodologIA no admite override de identidad')
    if re.search(r'(?i)amaris',raw): errors.append('Contaminación de marca Amaris')

    if d.get('schemaVersion')!='frames-aula-v1': errors.append('schemaVersion debe ser frames-aula-v1')
    if not d.get('title') or not d.get('sections'): errors.append('title y sections no vacíos son obligatorios')
    for value in [d.get('title'),*d.get('objectives',[]),*d.get('acceptance',[])]+[s.get(k) for s in d['sections'] for k in ('title','body','prompt','notes') if s.get(k)]:
        if isinstance(value,dict) and any(not value.get(lang) for lang in d.get('languages',['es'])): errors.append('Traducción declarada ausente')
    if kind=='dynamic-commercial-decks':
        mode=d.get('mode',d.get('meta',{}).get('mode','comercial'))
        if mode not in ('comercial','commercial','tecnico'): errors.append('mode debe ser comercial o tecnico')
        # Workflow review owns technical thesis/arc approval; direct conceptual builds remain allowed.
    for section in d['sections']:
        if section.get('table') and (not section['table'].get('headers') or any(len(row)!=len(section['table']['headers']) for row in section['table'].get('rows',[]))): errors.append('Table filas deben coincidir con headers')
        for item in section.get('tabs',[])+section.get('accordion',[]):
            if not isinstance(item,dict) or not item.get('title') or not item.get('body'): errors.append('Tab/accordion requiere title y body')
    if d.get('outputs') is not None and (not isinstance(d['outputs'],list) or not d['outputs'] or set(d['outputs'])-{'desktop','mobile','audience','mobile-audience','markdown'}): errors.append('Outputs inválidos')
    ids=[]
    for s in d.get('sections',[]):
        ids.append(s.get('id'))
        if not re.fullmatch(r'[a-z][a-z0-9-]*',s.get('id','')): errors.append('id de sección inválido')
        if not s.get('title'): errors.append('Cada sección requiere title')
        keys=[f.get('key') for f in s.get('fields',[])+s.get('settings',[])]
        if any(not re.fullmatch(r'[a-z][a-z0-9_]*',k or '') for k in keys) or len(keys)!=len(set(keys)): errors.append('field key inválido o duplicado')
        if set(re.findall(r'\{\{(.*?)\}\}',localized(s.get('prompt'))))-set(keys): errors.append('Prompt referencia field inexistente')
    if len(ids)!=len(set(ids)): errors.append('ids duplicados')
    factids={f.get('id') for f in d.get('facts',[]) if f.get('id')}
    for section in d.get('sections',[]):
        if set(section.get('factIds',[]))-factids: errors.append('factIds inexistentes')
        if kind=='dynamic-commercial-decks' and re.search(r'\d+\s*(%|millones|million|milhões|USD|COP)',json.dumps([section.get('body'),section.get('title')],ensure_ascii=False)) and not section.get('factIds'): errors.append('Cifra comercial requiere factIds')
    for f in d.get('facts',[]):
        if not f.get('source') or f.get('confirmed') is not True or not re.fullmatch('[0-9a-f]{64}',f.get('sha256','')): errors.append('Fact requiere source, confirmed=true y sha256')
    if False: pass
    brand=d.get('brand',{})
    if not isinstance(brand,dict): errors.append('Brand inválida'); brand={}
    def luminance(c):
        values=[int(c[i:i+2],16)/255 for i in (1,3,5)]
        return sum(w*(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for w,v in zip((.2126,.7152,.0722),values))
    colors=brand.get('colors',{})
    safe_colors=isinstance(colors,dict) and not set(colors)-{'night','gold','white'} and all(isinstance(v,str) and re.fullmatch('#[0-9a-fA-F]{6}',v) for v in colors.values())
    if not safe_colors: errors.append('Color no seguro')
    if safe_colors:
        effective=effective_colors(brand,edition)
        pairs=[(ink+' sobre '+surface,effective[ink],background,4.5) for ink in ('night','gold') for surface,background in (('canvas',effective['white']),('blanco fijo','#ffffff'))]
        pairs += [('footer/completed sobre canvas','#334155',effective['white'],4.5),('foco sobre canvas','#8a6d00',effective['white'],3)]
        for label,ink,background,minimum in pairs:
            a,b=sorted((luminance(ink),luminance(background)))
            if (b+.05)/(a+.05)<minimum: errors.append('Contraste de brand insuficiente: '+label)

    if edition=='white-label' and brand:
        if not isinstance(brand.get('name'),str) or not brand['name'].strip() or not safe_colors: errors.append('Brand inválida')
    for s in d.get('sections',[]):
        for link in s.get('links',[]):
            href=link.get('href','')
            if not safe_local_href(href,base): errors.append('Link local inseguro o ausente: '+str(href))
    if kind in ('module','index'):
        for p in d.get('pieces',[]):
            href=p.get('href','')
            if p.get('kind') not in KINDS or not safe_local_href(href,base): errors.append('Piece insegura o ausente: '+str(href))
    if kind=='module':
        if not isinstance(d.get('pieceSections',{}),dict): errors.append('pieceSections debe ser objeto')
        else:
            for piece_kind,sections in d.get('pieceSections',{}).items():
                if piece_kind not in KINDS[:6]: errors.append('pieceSections kind inválido'); continue
                piece=dict(d);piece.pop('pieceSections',None);piece['sections']=sections;piece['pieces']=[]
                errors.extend(piece_kind+': '+e for e in validate(piece,piece_kind,edition,base))
    return errors
def default_prompt(section,lang):
    fields=section.get('fields',[])+section.get('settings',[])
    return re.sub(r'\{\{(.*?)\}\}',lambda match:localized(next((field.get('default','') for field in fields if field['key']==match[1]),''),lang),localized(section.get('prompt'),lang))
def markdown(d,lang):
    lines=['# '+localized(d['title'],lang),'',SHELL_UI.get(lang,SHELL_UI['es'])[4]+': RENDERED_DRAFT','']
    for section in d['sections']:
        lines+=['## '+localized(section['title'],lang),'',localized(section.get('body'),lang),'']
        if section.get('prompt'): lines+=['```text',default_prompt(section,lang),'```','']
    return '\n'.join(lines)
def render(d,kind,edition):
    brand={'name':'MetodologIA' if edition=='metodologia' else 'Tu marca','colors':{'night':'#0a122a' if edition=='metodologia' else '#152238','gold':'#8a6d00' if edition=='metodologia' else '#334155','white':'#ffffff'}}
    if edition=='white-label': brand.update(d.get('brand',{}))
    brand['colors']=effective_colors(brand,edition)
    lang=d.get('language','es'); shell=SHELL_UI.get(lang,SHELL_UI['es'])
    payload=json.dumps({'data':d,'kind':kind,'brand':brand,'shellUi':SHELL_UI},ensure_ascii=False).replace('<','\\u003c')
    css=(ROOT/'style.css').read_text()+':root{--ink:'+brand['colors'].get('night','#0a122a')+';--canvas:'+brand['colors'].get('white','#ffffff')+';--accent:'+brand['colors'].get('gold','#8a6d00')+'}'; js=(ROOT/'app.js').read_text()
    return '<!doctype html><html lang="'+html.escape(lang)+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(localized(d['title'],lang))+'</title><style>'+css+'</style><body><a class="skip" href="#main">'+shell[1]+'</a><header><strong id="brand"></strong><select id="language" aria-label="'+shell[2]+'"></select><button id="motion">Pausar animación</button><button id="projection">Proyectar</button><button onclick="window.print()">Imprimir</button></header><main id="main" tabindex="-1"></main><nav aria-label="'+shell[3]+'"><button id="prev">Anterior</button><span id="position" aria-live="polite"></span><button id="next">Siguiente</button></nav><footer>RENDERED_DRAFT · '+shell[0]+'</footer><script type="application/json" id="payload">'+payload+'</script><script>'+js+'</script></body></html>'
def output_plan(d,kind,edition):
    if kind=='module': return [k+'.html' for k in KINDS[:6]]+['index.html','workbook.md','manifest.json','receipt.json']
    mapping={'desktop':'artifact.html','mobile':'artifact-mobile.html','audience':'artifact-audience.html','mobile-audience':'artifact-mobile-audience.html','markdown':'artifact.md'}
    selected=d.get('outputs',list(mapping))
    return list(dict.fromkeys(mapping[x] for x in selected if x in mapping))+['receipt.json']
def main():
    p=argparse.ArgumentParser();p.add_argument('command',choices=['new','build','check','export','plan']);p.add_argument('--kind',choices=KINDS,required=True);p.add_argument('--edition',choices=['metodologia','white-label'],default='metodologia');p.add_argument('--input');p.add_argument('--out',required=True);p.add_argument('--template');a=p.parse_args()
    out=pathlib.Path(a.out)
    if a.command=='new':
        if out.exists() or any(x.is_symlink() for x in (out,*out.parents)): p.error('Destino existente o symlink')
        out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(sample(a.kind),ensure_ascii=False,indent=2));return
    if not a.input: p.error('--input es obligatorio')
    source=pathlib.Path(a.input);d=json.loads(source.read_text());
    if a.command=='plan': print(json.dumps({'outputs':output_plan(d,a.kind,a.edition)}));return
    errors=validate(d,a.kind,a.edition,source.parent)
    if errors: print(json.dumps({'status':'BLOCKED','errors':errors},ensure_ascii=False));sys.exit(2)
    if a.command=='check': print(json.dumps({'status':'PASS','sha256':hashlib.sha256(source.read_bytes()).hexdigest()}));return
    if a.command=='build' and a.kind!='module':
        output_errors=validate(d,a.kind,a.edition,out)
        if output_errors: print(json.dumps({'status':'BLOCKED','errors':output_errors},ensure_ascii=False));sys.exit(2)
    if a.command=='export': print('coverage_gap: exportación Office requiere adaptador y plantilla compatible; no se generó archivo',file=sys.stderr);sys.exit(3)
    if any(p.is_symlink() for p in (out,*out.parents)): p.error('Output symlink rechazado')
    if out.exists() and any((out/name).exists() for name in output_plan(d,a.kind,a.edition)): p.error('Output existente: elija un directorio nuevo')
    out.mkdir(parents=True,exist_ok=True)
    outputs=output_plan(d,a.kind,a.edition)
    if a.kind=='module':
        for k in KINDS[:6]:
            piece=dict(d);piece['sections']=d.get('pieceSections',{}).get(k,d['sections']);(out/(k+'.html')).write_text(render(piece,k,a.edition))
        index=dict(d);index['pieces']=[{'kind':k,'href':k+'.html'} for k in KINDS[:6]]
        (out/'index.html').write_text(render(index,'index',a.edition)); workbook=dict(d);workbook['sections']=d.get('pieceSections',{}).get('workbook',d['sections']);(out/'workbook.md').write_text(markdown(workbook,d.get('language','es')))
        (out/'manifest.json').write_text(json.dumps({'state':'RENDERED_DRAFT','pieces':index['pieces']},indent=2))
    else:
        for name in outputs:
            if name.endswith('.html'):
                audience_data=copy.deepcopy(d)
                if 'audience' in name:
                    audience_data=audience_content(audience_data)
                audience_data['_mobile']='mobile' in name
                content=render(audience_data,a.kind,a.edition)
                if 'audience' in name: content=content.replace("if(s.notes&&!new URLSearchParams(location.search).has('audience'))",'if(false)')
                (out/name).write_text(content)
        if 'artifact.md' in outputs: (out/'artifact.md').write_text(markdown(d,d.get('language','es')))
    receipt={'state':'RENDERED_DRAFT','kind':a.kind,'edition':a.edition,'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'engineSha256':hashlib.sha256((ROOT/'runtime.py').read_bytes()+(ROOT/'app.js').read_bytes()+(ROOT/'style.css').read_bytes()).hexdigest(),'outputs':{name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in outputs if name!='receipt.json'}}
    receipt['advisories']=[{'rule':'deck-title-10-words','section':section['id'],'status':'REVIEW'} for section in d['sections'] if a.kind=='dynamic-commercial-decks' and len(localized(section['title']).split())>10]
    (out/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
if __name__=='__main__': main()
