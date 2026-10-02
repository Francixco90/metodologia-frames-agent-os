#!/usr/bin/env python3
"""Original offline Frames Aula renderer. Python standard library only."""
import argparse, base64, copy, hashlib, html, json, pathlib, re, sys, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
import bank
VERSION='1.1.0'
LEGACY_SCENES={'flow','steps','orbit','gate','contrast'}
PRESENTED={'immersive-class','masterclass','dynamic-commercial-decks'}
ROOT_FIELDS={'schemaVersion','title','language','languages','objectives','acceptance','sections','facts','pieces','pieceSections','brand','mode','meta','deckType','thesis','outputs','migrationSource','authoringPolicy','training','references','theme','assetFiles'}
SECTION_FIELDS={'id','title','body','notes','spoken','facilitatorNotes','scene','sceneParams','assetRefs','prompt','fields','settings','links','factIds','exemplar','table','matrix','cols','cards','metrics','badges','tabs','accordion','objectives','acceptance','durationMinutes','demonstration','practice','checkpoints','reflection','transfer','references','layout','reveal'}

def contract_errors(d,kind):
    errors=[]
    def textual(value,path):
        if not (isinstance(value,str) or isinstance(value,dict) and bool(value) and not value.keys()-{'es','en','pt','fr'} and all(isinstance(text,str) for text in value.values())):errors.append(path+' debe ser texto o mapa de idiomas')
    def known(obj,allowed,path):
        if not isinstance(obj,dict): errors.append(path+' debe ser objeto');return False
        errors.extend(path+'.'+key+': campo desconocido; no se descartará' for key in obj.keys()-allowed)
        return True
    def text_list(value,path):
        if not isinstance(value,list):errors.append(path+' debe ser lista');return
        for n,item in enumerate(value):textual(item,path+'['+str(n)+']')
    def references(value,path):
        if not isinstance(value,list):errors.append(path+' debe ser lista');return
        for n,item in enumerate(value):
            itempath=path+'['+str(n)+']'
            if isinstance(item,str):continue
            if known(item,{'title','source','sha256'},itempath):
                if not item.get('title') or not isinstance(item.get('source'),str) or not item['source'].strip():errors.append(itempath+' requiere title y source')
                if 'title' in item:textual(item['title'],itempath+'.title')
                if 'sha256' in item and (not isinstance(item['sha256'],str) or not re.fullmatch('[0-9a-f]{64}',item['sha256'])):errors.append(itempath+'.sha256 inválido')
    known(d,ROOT_FIELDS,'brief')
    if d.get('title') is not None:textual(d['title'],'title')
    if d.get('theme','light') not in ('light','dark'):errors.append('theme debe ser light o dark')
    for key in ('objectives','acceptance','facts','pieces','references'):
        if key in d and not isinstance(d[key],list): errors.append(key+' debe ser lista')
    for key in ('objectives','acceptance'):
        if key in d:text_list(d[key],key)
    if 'references' in d:references(d['references'],'references')
    if 'assetFiles' in d:
        if not isinstance(d['assetFiles'],dict) or len(d['assetFiles'])>20:errors.append('assetFiles debe ser mapa de hasta 20 HTML locales con SHA256')
        else:
            for name,digest in d['assetFiles'].items():
                if not safe_local_href(name) or not name.endswith('.html') or '#' in name or not isinstance(digest,str) or not re.fullmatch('[0-9a-f]{64}',digest):errors.append('assetFiles inválido: '+str(name))
    for key,allowed in [('facts',{'id','text','source','confirmed','sha256'}),('pieces',{'kind','href'})]:
        if isinstance(d.get(key,[]),list):
            for n,item in enumerate(d.get(key,[])):
                path=key+'['+str(n)+']'
                if known(item,allowed,path) and key=='facts':
                    if 'id' in item and not isinstance(item['id'],str):errors.append(path+'.id debe ser texto')
                    if 'text' in item:textual(item['text'],path+'.text')
    if 'meta' in d and not isinstance(d['meta'],dict):errors.append('meta debe ser objeto de metadatos')
    if 'brand' in d:known(d['brand'],{'name','colors'},'brand')
    if 'thesis' in d and known(d['thesis'],{'title','pillars'},'thesis'):
        if 'title' in d['thesis']:textual(d['thesis']['title'],'thesis.title')
        if not isinstance(d['thesis'].get('pillars',[]),list):errors.append('thesis.pillars debe ser lista')
        else:
            for n,pillar in enumerate(d['thesis'].get('pillars',[])):
                if isinstance(pillar,dict):
                    if known(pillar,{'achieves','proof'},'thesis.pillars['+str(n)+']'):
                        for key,value in pillar.items():textual(value,'thesis.pillars['+str(n)+'].'+key)
                else:textual(pillar,'thesis.pillars['+str(n)+']')
    for i,s in enumerate(d.get('sections',[])):
        path='sections['+str(i)+']'
        if not known(s,SECTION_FIELDS,path):continue
        for key in ('fields','settings','tabs','accordion','cols','cards','metrics','badges','checkpoints','links','assetRefs','objectives','acceptance','references','factIds'):
            if key in s and not isinstance(s[key],list): errors.append(path+'.'+key+' debe ser lista')
        for key,allowed,required in (
          ('fields',{'key','label','default','setting'},('key','label')),('settings',{'key','label','default','setting'},('key','label')),
          ('tabs',{'title','body'},('title','body')),('accordion',{'title','body'},('title','body')),
          ('cols',{'title','body','items','icon','tag'},('title',)),('cards',{'title','body','items','icon','tag'},('title',)),
          ('metrics',{'label','value','detail','factIds'},('label','value')),('badges',{'label','detail','icon'},('label',)),
          ('checkpoints',{'question','answer','criterion'},('question',)),('links',{'href','label'},('href',)),
          ('assetRefs',{'id','kind','label'},('id','kind'))):
            if not isinstance(s.get(key,[]),list):continue
            for n,item in enumerate(s.get(key,[])):
                itempath=path+'.'+key+'['+str(n)+']'
                if known(item,allowed,itempath):
                    errors.extend(itempath+'.'+field+' obligatorio' for field in required if not item.get(field))
                    for field in ('title','body','label','value','detail','tag','question','answer','criterion'):
                        if field in item:textual(item[field],itempath+'.'+field)
                    if key in ('cols','cards') and 'items' in item:text_list(item['items'],itempath+'.items')
                    if key=='assetRefs' and item.get('kind') not in ('icon','scene'):errors.append(itempath+'.kind debe ser icon o scene')
                    if key in ('fields','settings') and not isinstance(item.get('key'),str):errors.append(itempath+'.key debe ser texto')
                    if key in ('fields','settings') and 'default' in item and type(item['default']) not in (int,float):textual(item['default'],itempath+'.default')
                    if key=='assetRefs' and not isinstance(item.get('id'),str):errors.append(itempath+'.id debe ser texto')
                    if 'factIds' in item and (not isinstance(item['factIds'],list) or any(not isinstance(v,str) for v in item['factIds'])):errors.append(itempath+'.factIds debe ser lista de IDs')
        for key in ('table','matrix'):
            if key in s and known(s[key],{'headers','rows','caption'},path+'.'+key):
                headers=s[key].get('headers');rows=s[key].get('rows')
                if not isinstance(headers,list) or not headers or not isinstance(rows,list) or any(not isinstance(row,list) or len(row)!=len(headers) for row in rows):errors.append(path+'.'+key+': filas deben coincidir con headers')
                else:
                    text_list(headers,path+'.'+key+'.headers')
                    for n,row in enumerate(rows):text_list(row,path+'.'+key+'.rows['+str(n)+']')
                if 'caption' in s[key]:textual(s[key]['caption'],path+'.'+key+'.caption')
        if 'sceneParams' in s:
            if not isinstance(s['sceneParams'],dict):errors.append(path+'.sceneParams debe ser objeto')
            else:
                for key,value in s['sceneParams'].items():textual(value,path+'.sceneParams.'+key)
        if 'scene' in s and not isinstance(s['scene'],str):errors.append(path+'.scene debe ser ID textual')
        for field in ('title','body','prompt','notes','spoken','facilitatorNotes','exemplar'):
            if field in s:textual(s[field],path+'.'+field)
        for field in ('demonstration','practice','reflection','transfer'):
            if field in s:
                for n,value in enumerate(s[field] if isinstance(s[field],list) else [s[field]]):textual(value,path+'.'+field+'['+str(n)+']')
        if s.get('layout','auto') not in ('auto','center','left'):errors.append(path+'.layout inválido')
        if 'durationMinutes' in s and (type(s['durationMinutes']) not in (int,float) or not 0<s['durationMinutes']<=480):errors.append(path+'.durationMinutes debe ser 0..480')
        if 'reveal' in s and type(s['reveal']) is not bool:errors.append(path+'.reveal debe ser booleano')
        if any(not isinstance(value,str) for value in s.get('factIds',[])):errors.append(path+'.factIds debe ser lista de IDs')
        for key in ('objectives','acceptance'):
            if key in s:text_list(s[key],path+'.'+key)
        if 'references' in s:references(s['references'],path+'.references')
    policy=d.get('authoringPolicy')
    if policy is not None and known(policy,{'origin','maxSlides','explicitBrief'},'authoringPolicy'):
        if policy.get('origin') not in ('new','historical'):errors.append('authoringPolicy.origin debe ser new o historical')
        if 'maxSlides' in policy and (type(policy['maxSlides']) is not int or not 1<=policy['maxSlides']<=100):errors.append('authoringPolicy.maxSlides debe ser entero 1..100')
        if 'maxSlides' in policy and not isinstance(policy.get('explicitBrief'),str):errors.append('maxSlides requiere explicitBrief textual')
        if 'maxSlides' in policy and not str(policy.get('explicitBrief','')).strip():errors.append('maxSlides requiere explicitBrief no vacío')
        if policy.get('origin')=='new' and kind in PRESENTED and not errors:
            limit=policy.get('maxSlides',8 if kind=='dynamic-commercial-decks' else 13)
            if len(d['sections'])>limit:errors.append('authoringPolicy: '+str(len(d['sections']))+' slides exceden '+str(limit)+'; portada y tapa cuentan')
    training=d.get('training')
    if training is not None and known(training,{'durationMinutes','audience','materials','runOfShow'},'training'):
        if 'audience' in training:textual(training['audience'],'training.audience')
        if 'materials' in training:text_list(training['materials'],'training.materials')
        if 'durationMinutes' in training and (type(training['durationMinutes']) not in (int,float) or not 0<training['durationMinutes']<=480):errors.append('training.durationMinutes inválida')
        if not isinstance(training.get('materials',[]),list) or not isinstance(training.get('runOfShow',[]),list):errors.append('training.materials/runOfShow deben ser listas')
        else:
            ids={s.get('id') for s in d.get('sections',[])}
            for n,item in enumerate(training.get('runOfShow',[])):
                if known(item,{'sectionId','minutes','notes'},'training.runOfShow['+str(n)+']') and (item.get('sectionId') not in ids or type(item.get('minutes')) not in (int,float) or not 0<item['minutes']<=480):errors.append('training.runOfShow requiere sectionId actual y minutes 0..480')
                if isinstance(item,dict) and 'notes' in item:textual(item['notes'],'training.runOfShow['+str(n)+'].notes')
            if training.get('runOfShow') and not errors:
                entries=training['runOfShow']
                if len({item['sectionId'] for item in entries})!=len(entries):errors.append('training.runOfShow sectionId duplicado')
                if training.get('durationMinutes') and abs(sum(item['minutes'] for item in entries)-training['durationMinutes'])>.001:errors.append('training.runOfShow no coincide con durationMinutes')
    return errors
SHELL_UI={
    'es':['Revisión humana pendiente','Saltar al contenido','Idioma','Secciones','Estado'],
    'en':['Human review pending','Skip to content','Language','Sections','State'],
    'pt':['Revisão humana pendente','Ir para o conteúdo','Idioma','Seções','Estado'],
    'fr':['Relecture humaine en attente','Aller au contenu','Langue','Sections','État'],
}
KINDS=('immersive-class','masterclass','workbook','lean-coffee','playbook','playbook-immersive','index','module','dynamic-commercial-decks')
def localized(x,lang='es'):
    return x.get(lang,x.get('es',next(iter(x.values()),''))) if isinstance(x,dict) else ('' if x is None else str(x))
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
    if isinstance(data,dict): return {key:audience_content(value) for key,value in data.items() if key not in ('notes','spoken','facilitatorNotes','migrationSource')}
    if isinstance(data,list): return [audience_content(value) for value in data]
    return data

def effective_colors(brand,edition):
    colors={'night':'#0a122a','gold':'#8a6d00','white':'#ffffff'}
    if edition=='white-label' and 'colors' not in brand: colors.update(night='#152238',gold='#334155')
    return {**colors,**brand.get('colors',{})}

def validate(d,kind,edition,base=None,asset_bank=None):
    errors=[]
    if not isinstance(d,dict): return ['Brief debe ser objeto JSON']
    if not isinstance(d.get('sections'),list) or any(not isinstance(s,dict) for s in d.get('sections',[])): return ['sections debe ser lista de objetos']
    errors=contract_errors(d,kind)
    if errors:return errors
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
    if re.search(r'\bTODO\b|(?i:\b(TBD|LOREM IPSUM)\b|\[PENDIENTE\])|‹[^›]+›',raw): errors.append('Placeholder sin resolver')
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
        for lang in languages:
            if set(re.findall(r'\{\{(.*?)\}\}',localized(s.get('prompt'),lang)))-set(keys):errors.append('Prompt referencia field inexistente: '+str(s.get('id'))+'/'+lang)
    if len(ids)!=len(set(ids)): errors.append('ids duplicados')
    factids={f.get('id') for f in d.get('facts',[]) if f.get('id')}
    for section in d.get('sections',[]):
        if set(section.get('factIds',[]))-factids: errors.append('factIds inexistentes')
        claim=[section.get(key) for key in ('body','title','table','matrix','cards','cols','metrics','badges')]
        if kind=='dynamic-commercial-decks' and re.search(r'\d+\s*(%|millones|million|milhões|USD|COP)',json.dumps(claim,ensure_ascii=False)) and not section.get('factIds'): errors.append('Cifra comercial requiere factIds')
        for metric in section.get('metrics',[]):
            if set(metric.get('factIds',[]))-factids:errors.append('metrics.factIds inexistentes')
    for f in d.get('facts',[]):
        if not isinstance(f.get('source'),str) or not f['source'].strip() or f.get('confirmed') is not True or not isinstance(f.get('sha256'),str) or not re.fullmatch('[0-9a-f]{64}',f['sha256']): errors.append('Fact requiere source, confirmed=true y sha256')
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
        theme=d.get('theme','dark' if d.get('authoringPolicy',{}).get('origin')=='new' and kind in ('immersive-class','dynamic-commercial-decks') else 'light')
        if theme=='dark':
            dark_surface='#15213c' if edition=='metodologia' else effective['night']
            for surface,background in [('dark canvas',effective['night']),('dark surface',dark_surface)]:
                pairs.extend([(label+' sobre '+surface,ink,background,4.5) for label,ink in [('texto','#f5f7fa'),('texto secundario','#cbd5e1'),('acento','#f6d365' if edition=='metodologia' else '#e2e8f0')]])
        for label,ink,background,minimum in pairs:
            a,b=sorted((luminance(ink),luminance(background)))
            if (b+.05)/(a+.05)<minimum: errors.append('Contraste de brand insuficiente: '+label)

    if edition=='white-label' and brand:
        if not isinstance(brand.get('name'),str) or not brand['name'].strip() or not safe_colors: errors.append('Brand inválida')
    for s in d.get('sections',[]):
        for link in s.get('links',[]):
            href=link.get('href','')
            if not safe_local_href(href,base): errors.append('Link local inseguro o ausente: '+str(href))
    if base is not None:
        for href,digest in d.get('assetFiles',{}).items():
            if not safe_local_href(href,base) or bank.sha((base/href).read_bytes())!=digest:errors.append('assetFiles ausente o hash alterado: '+href)
    if kind in ('module','index'):
        for p in d.get('pieces',[]):
            href=p.get('href','')
            if p.get('kind') not in KINDS or not safe_local_href(href,base): errors.append('Piece insegura o ausente: '+str(href))
    reserved={'artifact.html','artifact-mobile.html','artifact-audience.html','artifact-mobile-audience.html','artifact.md','receipt.json','manifest.json','index.html'}
    if kind=='module':reserved.update(k+'.html' for k in KINDS[:6]);reserved.add('workbook.md')
    if set(d.get('assetFiles',{}))&reserved or kind=='index' and set(linked_files(d))&reserved:errors.append('Linked piece colisiona con output reservado')
    if kind=='module':
        if not isinstance(d.get('pieceSections',{}),dict): errors.append('pieceSections debe ser objeto')
        else:
            for piece_kind,sections in d.get('pieceSections',{}).items():
                if piece_kind not in KINDS[:6]: errors.append('pieceSections kind inválido'); continue
                piece=dict(d);piece.pop('pieceSections',None);piece['sections']=sections;piece['pieces']=[]
                errors.extend(piece_kind+': '+e for e in validate(piece,piece_kind,edition,base,asset_bank))
    try: resolve_assets(d,edition,asset_bank,render_svg=False)
    except (ValueError,OSError,KeyError,TypeError) as exc:errors.append(str(exc))
    try: profile_context(edition,d.get('brand',{}))
    except (ValueError,OSError,KeyError,TypeError) as exc:errors.append(str(exc))
    return errors

def asset_catalogs(edition,asset_bank=None):
    catalogs=[];dependencies=[]
    core=ROOT/'assets/core'
    if core.exists() and not (core/'catalog.json').is_file():raise ValueError('ASSET_CORE_CATALOG_MISSING')
    if (core/'catalog.json').is_file():
        raw=(core/'catalog.json').read_bytes();catalog=json.loads(raw)
        catalogs.append(('core',core,catalog,bank.sha(raw)))
        dependencies.append({'role':'core-catalog','ref':'assets/core/catalog.json','sha256':bank.sha(raw)})
    if asset_bank:
        directory=pathlib.Path(asset_bank).absolute();manifest=bank.verify_directory(directory)
        if manifest.get('edition')!=edition:raise ValueError('BANK_EDITION_MISMATCH')
        raw=(directory/'catalog.json').read_bytes();catalog=json.loads(raw)
        catalogs.append(('bank',directory,catalog,bank.sha(raw)))
        dependencies.extend({'role':role,'ref':'bank/'+name,'sha256':bank.sha((directory/name).read_bytes())} for role,name in (('bank-manifest','manifest.json'),('bank-catalog','catalog.json')))
    for source,base,catalog,digest in catalogs:
        if catalog.get('schemaVersion')!='frames-aula-asset-catalog-v1':raise ValueError('ASSET_CATALOG_INVALID')
        if catalog.get('edition') not in (None,'both',edition,'shared','shared-geometry'):raise ValueError('ASSET_CATALOG_EDITION_MISMATCH')
    return catalogs,dependencies

def scene_svg(scene,params,lang,colors,portrait=False):
    if scene.get('schemaVersion')!='frames-aula-scene-v1' or scene.get('viewBox')!=[0,0,960,540]:raise ValueError('SCENE_CONTRACT_INVALID')
    geometry=scene.get('portrait',scene) if portrait else scene
    slots={slot['id']:slot for slot in geometry.get('slots',scene.get('slots',[]))}
    if set(params)-set(slots):raise ValueError('SCENE_PARAM_UNKNOWN: '+','.join(sorted(set(params)-set(slots))))
    values={key:localized(params.get(key,slot.get('label','')),lang) for key,slot in slots.items()}
    if any(len(values[key])>slot.get('maxChars',120) for key,slot in slots.items()):raise ValueError('SCENE_TEXT_BUDGET: '+scene.get('id',''))
    viewbox=geometry.get('viewBox',scene['viewBox'])
    if not isinstance(viewbox,list) or len(viewbox)!=4 or viewbox[:2]!=[0,0] or any(type(n) not in (int,float) or not 0<n<=1500 for n in viewbox[2:]):raise ValueError('SCENE_VIEWBOX_INVALID')
    svg=ET.Element('svg',{'xmlns':'http://www.w3.org/2000/svg','viewBox':' '.join(str(n) for n in viewbox),'role':'img','aria-label':values.get('title') or localized(scene.get('meaning',scene.get('id')),lang)})
    allowed={'rect','circle','path','line','ellipse','text'}
    palette={'ink':colors['night'],'accent':colors['gold'],'surface':colors['white'],'muted':'#64748b'}
    for n,shape in enumerate(geometry.get('shapes',[])):
        if not isinstance(shape,dict) or shape.get('tag') not in allowed or not isinstance(shape.get('attrs',{}),dict):raise ValueError('SCENE_UNSAFE_SHAPE')
        attrs={k:str(v) for k,v in shape.get('attrs',{}).items()}
        token=shape.get('token')
        if token:
            if token not in palette:raise ValueError('SCENE_UNKNOWN_TOKEN')
            attrs['stroke' if attrs.get('fill')=='none' or shape['tag']=='line' else 'fill']=palette[token]
        attrs['class']='scene-layer layer-'+str(min(3,n//max(1,len(geometry.get('shapes',[]))//4)))
        element=ET.SubElement(svg,shape['tag'],attrs)
        if shape['tag']=='text':
            slot=slots.get(shape.get('slot'),{});text=values.get(shape.get('slot'),str(shape.get('text','')));font=float(attrs.get('font-size',20));width=slot.get('width',370 if portrait and shape.get('slot')=='title' else 310 if portrait else 800 if shape.get('slot')=='title' else 180)
            # ponytail: conservative glyph widths; browser geometry checks verify actual font metrics.
            measure=lambda word:sum(.3 if c in "ilI.,:;!' " else .86 if c in 'MWmw@' else .68 if c.isupper() else .56 for c in word)*font
            lines=[];line=''
            for word in text.split():
                if measure(word)>width:raise ValueError('SCENE_WORD_OVERFLOW: '+scene['id']+'/'+shape.get('slot','text'))
                candidate=(line+' '+word).strip()
                if line and measure(candidate)>width:lines.append(line);line=word
                else:line=candidate
            if line:lines.append(line)
            if len(lines)>slot.get('maxLines',3 if portrait and shape.get('slot')=='title' else 2):raise ValueError('SCENE_LINES_OVERFLOW: '+scene['id']+'/'+shape.get('slot','text'))
            if len(lines)<=1:element.text=text
            else:
                y=max(font+8,float(attrs.get('y',0))-(len(lines)-1)*font*.6)
                for index,line in enumerate(lines):ET.SubElement(element,'tspan',{'x':attrs.get('x','0'),'y':str(round(y+index*font*1.2,2))}).text=line
    text=ET.tostring(svg,encoding='unicode');bank.safe_svg(text);return text

def resolve_assets(d,edition,asset_bank=None,render_svg=True):
    catalogs,dependencies=asset_catalogs(edition,asset_bank);lookup={}
    for source,base,catalog,digest in catalogs:
        for kind,key,pathkey in (('icon','icons','svg'),('scene','scenes','path')):
            for entry in catalog.get(key,[]):
                identifier=entry.get('id','')
                if not re.fullmatch('[a-z][a-z0-9-]*',identifier) or not isinstance(entry.get(pathkey),str) or not bank.safe_member(entry[pathkey]):raise ValueError('ASSET_CATALOG_ENTRY_INVALID')
                # The bundled core remains authoritative when a bank contains the same IDs.
                lookup.setdefault((kind,identifier),(source,base,entry,digest,pathkey))
    requested=[]
    def sections(data):
        yield from data.get('sections',[])
        for group in data.get('pieceSections',{}).values():yield from group
    for section in sections(d):
        if section.get('scene'):requested.append((section,'scene',section['scene'],section.get('sceneParams',{})))
        for ref in section.get('assetRefs',[]):requested.append((section,ref['kind'],ref['id'],{}))
        for item in section.get('cards',[])+section.get('cols',[])+section.get('badges',[]):
            if item.get('icon'):requested.append((section,'icon',item['icon'],{}))
    assets={};evidence=[];seen=set();lang=d.get('language','es');colors=effective_colors(d.get('brand',{}),edition)
    for section,kind,identifier,params in requested:
        if (kind,identifier) not in lookup:
            if kind=='scene' and identifier in LEGACY_SCENES and not catalogs:continue
            raise ValueError('ASSET_UNKNOWN: '+kind+'/'+str(identifier)+' en '+section['id'])
        source,base,entry,cataloghash,pathkey=lookup[(kind,identifier)];path=base/entry[pathkey]
        if any(p.is_symlink() for p in (path,*path.parents)) or not path.resolve().is_relative_to(base.resolve()):raise ValueError('ASSET_UNSAFE_PATH')
        raw=path.read_bytes();digest=bank.sha(raw)
        if digest!=entry.get('sha256'):raise ValueError('ASSET_HASH_MISMATCH: '+identifier)
        if kind=='icon':
            svg=raw.decode('utf-8');bank.safe_svg(svg)
        else:svg=scene_svg(json.loads(raw),params,lang,colors)
        if render_svg:
            for language in d.get('languages',['es']):
                if kind=='scene':svg=scene_svg(json.loads(raw),params,language,colors)
                assets[section['id']+':'+kind+':'+identifier+':'+language]=svg
                if kind=='scene' and json.loads(raw).get('portrait'):assets[section['id']+':'+kind+':'+identifier+':'+language+':mobile']=scene_svg(json.loads(raw),params,language,colors,portrait=True)
        if (kind,identifier) not in seen:
            seen.add((kind,identifier));ref=('assets/core/' if source=='core' else 'bank/')+entry[pathkey]
            dependencies.append({'role':'asset','ref':ref,'sha256':digest});evidence.append({'id':identifier,'kind':kind,'sha256':digest,'source':source,'catalogSha256':cataloghash})
    return assets,dependencies,evidence

def profile_context(edition,brand=None):
    dependencies=[];profilepath=ROOT/'assets/core/profiles'/(edition+'.json')
    if (ROOT/'assets/core').exists() and not profilepath.is_file():raise ValueError('ASSET_PROFILE_MISSING: '+edition)
    profilehash=bank.sha(profilepath.read_bytes()) if profilepath.is_file() else bank.sha(json.dumps(effective_colors(brand or {},edition),sort_keys=True).encode())
    profiledata=json.loads(profilepath.read_text()) if profilepath.is_file() else {}
    if profilepath.is_file():dependencies.append({'role':'profile','ref':'assets/core/profiles/'+edition+'.json','sha256':profilehash})
    if edition=='metodologia':
        for name in ('Poppins-Bold.ttf','Montserrat-VariableFont_wght.ttf'):
            path=ROOT/'assets/core/fonts'/name
            if profilepath.is_file() and not path.is_file():raise ValueError('ASSET_FONT_MISSING: '+name)
            if path.is_file():
                digest=bank.sha(path.read_bytes());expected=next((font.get('sha256') for font in profiledata.get('typography',{}).values() if font.get('file')=='fonts/'+name),None)
                if expected and expected!=digest:raise ValueError('ASSET_FONT_HASH_MISMATCH: '+name)
                dependencies.append({'role':'font','ref':'assets/core/fonts/'+name,'sha256':digest})
    return profilehash,dependencies

def build_context(d,edition,asset_bank=None,base=None):
    assets,dependencies,evidence=resolve_assets(d,edition,asset_bank)
    profilehash,profiledependencies=profile_context(edition,d.get('brand',{}));dependencies.extend(profiledependencies)
    if base is not None:
        links=[item for section in d.get('sections',[]) for item in section.get('links',[])]+d.get('pieces',[])
        for href in sorted({item['href'].split('#',1)[0] for item in links if item.get('href') and not item['href'].startswith('#')}):
            if safe_local_href(href,base):dependencies.append({'role':'linked-piece','ref':'input/'+href,'sha256':bank.sha((base/href).read_bytes())})
    return assets,{'engineVersion':VERSION,'profile':{'id':edition,'sha256':profilehash},'buildDependencies':dependencies,'assetEvidence':evidence}
def default_prompt(section,lang):
    fields=section.get('fields',[])+section.get('settings',[])
    return re.sub(r'\{\{(.*?)\}\}',lambda match:localized(next((field.get('default','') for field in fields if field['key']==match[1]),''),lang),localized(section.get('prompt'),lang))
def markdown(d,lang):
    lines=['# '+localized(d['title'],lang),'',SHELL_UI.get(lang,SHELL_UI['es'])[4]+': RENDERED_DRAFT','']
    def text(value):
        if isinstance(value,list):return '\n'.join('- '+text(item) for item in value)
        if isinstance(value,dict) and not any(k in value for k in ('es','en','pt','fr')):return ' · '.join(key+': '+text(child) for key,child in value.items())
        return localized(value,lang)
    def content(label,value):
        if value is not None and value!=[] and value!='':lines.extend(['### '+label,'',text(value),''])
    content('Objetivos',d.get('objectives'));content('Criterios de logro',d.get('acceptance'));content('Tesis',d.get('thesis'));content('Plan de facilitación',d.get('training'))
    for section in d['sections']:
        lines+=['## '+localized(section['title'],lang),'',localized(section.get('body'),lang),'']
        for key,label in [('objectives','Objetivos'),('acceptance','Criterios de logro'),('durationMinutes','Minutos'),('demonstration','Demostración'),('practice','Práctica'),('reflection','Reflexión'),('transfer','Transferencia'),('exemplar','Ejemplo'),('notes','Notas'),('spoken','Guion'),('facilitatorNotes','Notas del facilitador')]:content(label,section.get(key))
        for key in ('cols','cards','metrics','badges','tabs','accordion','checkpoints','fields','settings','links','references','assetRefs'):content(key,section.get(key))
        for key in ('table','matrix'):
            if section.get(key):
                table=section[key];escape=lambda value:localized(value,lang).replace('|','\\|').replace('\n','<br>')
                if table.get('caption'):lines.extend([localized(table['caption'],lang),''])
                lines.append('| '+' | '.join(escape(v) for v in table['headers'])+' |');lines.append('| '+' | '.join('---' for _ in table['headers'])+' |')
                lines.extend('| '+' | '.join(escape(v) for v in row)+' |' for row in table['rows']);lines.append('')
        if section.get('scene'):content('Escena',{'id':section['scene'],'params':section.get('sceneParams',{})})
        if section.get('prompt'): lines+=['```text',default_prompt(section,lang),'```','']
    content('Evidencia',d.get('facts'));content('Referencias',d.get('references'));content('Piezas',d.get('pieces'))
    return '\n'.join(lines)
def render(d,kind,edition,assets=None):
    brand={'name':'MetodologIA' if edition=='metodologia' else 'Tu marca','colors':{'night':'#0a122a' if edition=='metodologia' else '#152238','gold':'#8a6d00' if edition=='metodologia' else '#334155','white':'#ffffff'}}
    if edition=='white-label': brand.update(d.get('brand',{}))
    brand['colors']=effective_colors(brand,edition)
    profilepath=ROOT/'assets/core/profiles'/(edition+'.json');profile=json.loads(profilepath.read_text()) if profilepath.is_file() else {}
    brand['tokens']={**profile.get('colors',{}),'inkOnDark':'#f5f7fa','goldOnDark':'#f6d365' if edition=='metodologia' else '#e2e8f0','darkSurface':'#15213c' if edition=='metodologia' else brand['colors']['night'],'softOnDark':'#cbd5e1'}
    lang=d.get('language','es'); shell=SHELL_UI.get(lang,SHELL_UI['es'])
    if assets is None:assets=resolve_assets(d,edition)[0]
    payload=json.dumps({'data':d,'kind':kind,'brand':brand,'shellUi':SHELL_UI,'assets':assets},ensure_ascii=False).replace('<','\\u003c')
    css=(ROOT/'style.css').read_text()+':root{--ink:'+brand['colors']['night']+';--canvas:'+brand['colors']['white']+';--accent:'+brand['colors']['gold']+';--brand-night:'+brand['colors']['night']+';--dark-accent:'+brand['tokens']['goldOnDark']+';--dark-surface:'+brand['tokens']['darkSurface']+'}'; js=(ROOT/'app.js').read_text()
    if edition=='metodologia':
        for name,family,weight in [('Poppins-Bold.ttf','Poppins','700'),('Montserrat-VariableFont_wght.ttf','Montserrat','100 900')]:
            path=ROOT/'assets/core/fonts'/name
            if path.is_file():css+='@font-face{font-family:'+family+';font-style:normal;font-weight:'+weight+';font-display:swap;src:url(data:font/ttf;base64,'+base64.b64encode(path.read_bytes()).decode()+') format("truetype")}'
        css+='body{font-family:Montserrat,system-ui,sans-serif}h1,h2,h3,header strong{font-family:Poppins,system-ui,sans-serif}'
    return '<!doctype html><html lang="'+html.escape(lang)+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(localized(d['title'],lang))+'</title><style>'+css+'</style><body><a class="skip" href="#main">'+shell[1]+'</a><header><strong id="brand"></strong><select id="language" aria-label="'+shell[2]+'"></select><button id="motion">Pausar animación</button><button id="projection">Proyectar</button><button onclick="window.print()">Imprimir</button></header><main id="main" tabindex="-1"></main><nav aria-label="'+shell[3]+'"><button id="prev">Anterior</button><span id="position" aria-live="polite"></span><button id="next">Siguiente</button></nav><footer>RENDERED_DRAFT · '+shell[0]+'</footer><script type="application/json" id="payload">'+payload+'</script><script>'+js+'</script></body></html>'
def output_plan(d,kind,edition):
    if kind=='module': return [k+'.html' for k in KINDS[:6]]+['index.html','workbook.md','manifest.json','receipt.json']
    mapping={'desktop':'artifact.html','mobile':'artifact-mobile.html','audience':'artifact-audience.html','mobile-audience':'artifact-mobile-audience.html','markdown':'artifact.md'}
    selected=d.get('outputs',list(mapping))
    files=list(dict.fromkeys(mapping[x] for x in selected if x in mapping))
    if kind=='index':files.extend(name for name in linked_files(d) if name not in files)
    return files+['receipt.json']
def linked_files(d):
    links=[item for section in d.get('sections',[]) for item in section.get('links',[])]+d.get('pieces',[])
    return sorted({item['href'].split('#',1)[0] for item in links if isinstance(item.get('href'),str) and not item['href'].startswith('#')})
def main():
    p=argparse.ArgumentParser();p.add_argument('command',choices=['new','build','check','export','plan']);p.add_argument('--kind',choices=KINDS,required=True);p.add_argument('--edition',choices=['metodologia','white-label'],default='metodologia');p.add_argument('--input');p.add_argument('--out',required=True);p.add_argument('--template');p.add_argument('--bank');a=p.parse_args()
    out=pathlib.Path(a.out)
    if a.command=='new':
        if out.exists() or any(x.is_symlink() for x in (out,*out.parents)): p.error('Destino existente o symlink')
        brief=sample(a.kind);brief['authoringPolicy']={'origin':'new'}
        out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(brief,ensure_ascii=False,indent=2));return
    if not a.input: p.error('--input es obligatorio')
    source=pathlib.Path(a.input);d=json.loads(source.read_text());
    errors=validate(d,a.kind,a.edition,source.parent,a.bank)
    if errors: print(json.dumps({'status':'BLOCKED','errors':errors},ensure_ascii=False));sys.exit(2)
    try:assets,context=build_context(d,a.edition,a.bank,source.parent)
    except (ValueError,OSError,KeyError,TypeError) as exc:print(json.dumps({'status':'BLOCKED','errors':[str(exc)]}));sys.exit(2)
    if a.command=='plan': print(json.dumps({'outputs':output_plan(d,a.kind,a.edition),**context}));return
    if a.command=='check': print(json.dumps({'status':'PASS','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),**context}));return
    if a.command=='build' and a.kind not in ('module','index'):
        output_errors=validate(d,a.kind,a.edition,out,a.bank)
        if output_errors: print(json.dumps({'status':'BLOCKED','errors':output_errors},ensure_ascii=False));sys.exit(2)
    if a.command=='export': print('coverage_gap: exportación Office requiere adaptador y plantilla compatible; no se generó archivo',file=sys.stderr);sys.exit(3)
    if any(p.is_symlink() for p in (out,*out.parents)): p.error('Output symlink rechazado')
    if any(path.is_symlink() for name in output_plan(d,a.kind,a.edition) for path in (out/name,*(out/name).parents)):p.error('Output symlink rechazado')
    if out.exists() and any((out/name).exists() for name in output_plan(d,a.kind,a.edition)): p.error('Output existente: elija un directorio nuevo')
    out.mkdir(parents=True,exist_ok=True)
    outputs=output_plan(d,a.kind,a.edition)
    if a.kind=='index':
        for name in linked_files(d):
            target=out/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((source.parent/name).read_bytes())
    if a.kind=='module':
        for k in KINDS[:6]:
            piece=dict(d);piece.pop('pieceSections',None);piece['sections']=d.get('pieceSections',{}).get(k,d['sections']);(out/(k+'.html')).write_text(render(piece,k,a.edition,resolve_assets(piece,a.edition,a.bank)[0]))
        index=dict(d);index['pieces']=[{'kind':k,'href':k+'.html'} for k in KINDS[:6]]
        (out/'index.html').write_text(render(index,'index',a.edition,assets)); workbook=dict(d);workbook['sections']=d.get('pieceSections',{}).get('workbook',d['sections']);(out/'workbook.md').write_text(markdown(workbook,d.get('language','es')))
        (out/'manifest.json').write_text(json.dumps({'state':'RENDERED_DRAFT','pieces':index['pieces']},indent=2))
    else:
        for name in outputs:
            if name.endswith('.html') and not (a.kind=='index' and name in linked_files(d)):
                audience_data=copy.deepcopy(d)
                if 'audience' in name:
                    audience_data=audience_content(audience_data)
                audience_data['_mobile']='mobile' in name
                content=render(audience_data,a.kind,a.edition,assets)
                if 'audience' in name: content=content.replace("if(s.notes&&!new URLSearchParams(location.search).has('audience'))",'if(false)')
                (out/name).write_text(content)
        if 'artifact.md' in outputs: (out/'artifact.md').write_text(markdown(d,d.get('language','es')))
    receipt={'state':'RENDERED_DRAFT','kind':a.kind,'edition':a.edition,'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'engineSha256':hashlib.sha256((ROOT/'runtime.py').read_bytes()+(ROOT/'app.js').read_bytes()+(ROOT/'style.css').read_bytes()).hexdigest(),'outputs':{name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in outputs if name!='receipt.json'}}
    receipt.update(context)
    receipt['advisories']=[{'rule':'deck-title-10-words','section':section['id'],'status':'REVIEW'} for section in d['sections'] if a.kind=='dynamic-commercial-decks' and len(localized(section['title']).split())>10]
    (out/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
if __name__=='__main__': main()
