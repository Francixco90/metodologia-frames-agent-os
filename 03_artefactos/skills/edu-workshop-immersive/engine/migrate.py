#!/usr/bin/env python3
"""Original loss-aware source adapter. Never edits upstream files."""
import argparse,copy,hashlib,json,pathlib,re,sys
sys.dont_write_bytecode=True
import runtime
LOCALES={'es','en','pt','fr'}
def stringify(value):
 if isinstance(value,str):return value
 if isinstance(value,list):return '\n'.join(stringify(v) for v in value)
 if isinstance(value,dict):return '\n'.join(k+': '+stringify(v) for k,v in value.items())
 return str(value) if value is not None else ''
def convert(source,kind):
 report={'unhandled':[],'losses':[],'unresolved':[],'preserved':'Complete source object retained in migrationSource; literal structured prompt values retained in sections.'}
 if source.get('schemaVersion')=='frames-aula-v1':return source,report
 rows=source.get('livePrompts') or source.get('slides') or source.get('closureSlides')
 if rows is None:
  sections=source.get('sections')
  if isinstance(sections,dict):rows=[dict(v,id=k,title=v.get('title',k)) for k,v in sections.items()]
  elif isinstance(sections,list):rows=sections
  else:rows=[{'id':'overview','title':source.get('title','Overview'),'body':stringify(source)}]
 result={'schemaVersion':'frames-aula-v1','title':source.get('title') or source.get('meta',{}).get('title','Migrated resource'),'language':source.get('language','es'),'languages':source.get('languages',['es']),'sections':[],'facts':source.get('facts',[]),'migrationSource':source,'authoringPolicy':{'origin':'historical'}}
 for key in ('objectives','acceptance','training','references','theme','mode','deckType','thesis'):
  if key in source:result[key]=copy.deepcopy(source[key])
 for n,row in enumerate(rows):
  if not isinstance(row,dict):report['unresolved'].append('row '+str(n)+' no es objeto');continue
  identifier=re.sub('[^a-z0-9-]','-',str(row.get('id',f'section-{n+1}')).lower()).strip('-')
  if not identifier or not identifier[0].isalpha():identifier='section-'+identifier
  s={'id':identifier,'title':row.get('title',f'Section {n+1}'),'body':row.get('body',row.get('subtitle',row.get('sub',row.get('thesis',''))))}
  if row.get('notes') or row.get('spoken'):s['notes']=row.get('notes',row.get('spoken'))
  if row.get('spoken'):s['spoken']=copy.deepcopy(row['spoken'])
  scene=row.get('scene') or row.get('visual',{}).get('kind')
  if scene:
   mapping={'cycle':'orbit','loop':'orbit','chips':'steps','gate':'gate','contrast':'contrast','flow':'flow','steps':'steps','orbit':'orbit'}
   s['scene']=mapping.get(scene,'flow')
   if scene not in mapping:report['losses'].append({'section':identifier,'field':'scene','original':scene,'replacement':'original flow SVG'})
  fields=[];mapping={}
  for f in row.get('inputs',row.get('fields',[])):
   key=re.sub('[^a-z0-9_]','_',str(f.get('key','')).lower())
   if not key or not key[0].isalpha():report['unresolved'].append('field key inválido en '+identifier);continue
   mapping[f['key']]=key;fields.append({'key':key,'label':f.get('label',f['key']),'default':f.get('default',''),'setting':bool(f.get('setting',False))})
  if fields:s['fields']=fields
  promptkeys=[k for k in ('system','r','a','c','e','s','p','spec','race','prompt') if k in row]
  if promptkeys:
   prompt='\n\n'.join(k.upper()+':\n'+stringify(row[k]) for k in promptkeys)
   for old,new in mapping.items():prompt=prompt.replace('['+old+']','{{'+new+'}}')
   unresolved=[key for key in re.findall(r'\[([A-Z][A-Z0-9_]*)\]',prompt) if key not in ('METODOLOGIA','SUPUESTO','INFERENCIA','PEDAGOGIA','NEUROCIENCIA')]
   if unresolved:report['unresolved'].append({'section':identifier,'placeholders':unresolved})
   s['prompt']=prompt
  semantic=runtime.SECTION_FIELDS-{'id','title','body','notes','scene','prompt','fields','settings','spoken'}
  for key in semantic:
   if key in row:s[key]=copy.deepcopy(row[key])
  if 'settings' in row:s['settings']=copy.deepcopy(row['settings'])
  handled={'id','title','body','subtitle','sub','thesis','notes','spoken','scene','visual','inputs','fields','settings',*promptkeys,*semantic}
  residual={k:v for k,v in row.items() if k not in handled}
  if residual:s['body']=stringify(s['body'])+'\n\n'+stringify(residual);report['unhandled'].append({'section':identifier,'fields':list(residual),'action':'preserved as labelled text and full migrationSource'})
  result['sections'].append(s)
 # Preserve non-row top-level material visibly, apart from metadata/styles.
 extra={k:v for k,v in source.items() if k not in {'title','meta','language','languages','sections','slides','livePrompts','closureSlides','facts','objectives','acceptance','training','references','theme','mode','deckType','thesis'}}
 if extra:result['sections'].append({'id':'source-reference','title':'Referencia preservada / Preserved reference','body':stringify(extra)})
 if re.search(r'(?i)amaris',json.dumps(result,ensure_ascii=False)):report['unresolved'].append('Identidad Amaris presente: realizar reautoría de marca explícita; no se elimina automáticamente.')
 return result,report
def main():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--kind',choices=runtime.KINDS,required=True);p.add_argument('--out',required=True);p.add_argument('--edition',choices=['metodologia','white-label'],default='metodologia');p.add_argument('--accept-scene-replacement',action='store_true');a=p.parse_args();src=pathlib.Path(a.input);out=pathlib.Path(a.out)
 if out.exists() or out.with_suffix('.migration.json').exists():p.error('Destino existente')
 if any(x.is_symlink() for x in (out,*out.parents)):p.error('Symlink rechazado')
 data,report=convert(json.loads(src.read_text()),a.kind);report['sourceSha256']=hashlib.sha256(src.read_bytes()).hexdigest();report['errors']=runtime.validate(data,a.kind,a.edition,src.parent);report['status']='BLOCKED' if report['unresolved'] or report['errors'] or (report['losses'] and not a.accept_scene_replacement) else 'MIGRATED_DRAFT'
 out.parent.mkdir(parents=True,exist_ok=True);out.with_suffix('.migration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 if report['status']=='BLOCKED':print(json.dumps(report,ensure_ascii=False));sys.exit(2)
 out.write_text(json.dumps(data,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()
