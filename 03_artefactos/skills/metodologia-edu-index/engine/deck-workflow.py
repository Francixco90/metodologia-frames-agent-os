#!/usr/bin/env python3
"""Original two-gate deck workflow. Approval records a decision; it does not infer it."""
import argparse, hashlib, json, pathlib, subprocess, sys

TYPES=('simple','prospeccion','comercial','tecnico','arquitectura','defensa-tecnica','defensa-funcional','defensa-negocio','defensa-hibrida','cierre-training','formacion','webinar-panel')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def main():
 p=argparse.ArgumentParser();p.add_argument('command',choices=['intake','spec','approve','build','next']);p.add_argument('work');p.add_argument('--input');p.add_argument('--type',choices=TYPES);p.add_argument('--mode',choices=['comercial','tecnico']);p.add_argument('--by');p.add_argument('--gate',choices=['intake','spec']);p.add_argument('--edition',choices=['metodologia','white-label'],default='metodologia');p.add_argument('--out');a=p.parse_args()
 work=pathlib.Path(a.work).absolute()
 if any(part.is_symlink() for part in (work,*work.parents)): p.error('Worktree symlink no autorizado')
 if a.command=='intake':
  if not a.input: p.error('--input con audiencia, problema y decision es obligatorio')
  data=json.loads(pathlib.Path(a.input).read_text())
  missing=[key for key in ('audience','problem','decision') if not data.get(key)]
  if missing: print(json.dumps({'state':'NEEDS_INPUT','questions':missing}));sys.exit(2)
  work.mkdir(parents=True,exist_ok=True)
  if (work/'intake.json').exists():p.error('Preserve intake existente; cree un successor')
  kind=a.type or data.get('type') or 'simple';mode=a.mode or data.get('mode') or ('tecnico' if kind in ('tecnico','arquitectura','defensa-tecnica','defensa-funcional','defensa-hibrida') else 'comercial')
  if kind not in TYPES or mode not in ('comercial','tecnico'):p.error('type/mode inválidos')
  if kind!='simple' and (len(data.get('pillars',[]))!=3 or any(not x.get('achieves') or not x.get('proof') for x in data['pillars'])):p.error('Tres pilares achieves/proof obligatorios fuera de simple')
  save(work/'intake.json',{**data,'type':kind,'mode':mode,'edition':a.edition,'state':'INTAKE_DRAFT'})
  print('intake: DRAFT · revisar intake.json; aprobación humana pendiente');return
 if a.command=='approve':
  if not a.by or not a.gate:p.error('--by y --gate requeridos; usar solo tras una decisión humana explícita')
  target=work/(a.gate+'.json')
  if not target.is_file():p.error('Documento de gate ausente')
  approval=work/(a.gate+'-approval.json')
  if approval.exists():p.error('Aprobación existente: preservar historial')
  save(approval,{'gate':a.gate,'decision':'APPROVED','actor':a.by,'documentSha256':digest(target),'basis':'explicit_human_decision_recorded_by_operator'})
  print(a.gate+': APPROVAL_RECORDED');return
 def approved(name):
  target=work/(name+'.json');receipt=work/(name+'-approval.json')
  if not target.is_file() or not receipt.is_file():p.error(name+' aprobación ausente')
  decision=json.loads(receipt.read_text())
  if decision.get('gate')!=name or decision.get('decision')!='APPROVED' or decision.get('documentSha256')!=digest(target):p.error(name+' aprobación stale o inválida')
 if a.command=='spec':
  approved('intake')
  if not a.input:p.error('--input con contenido frames-aula-v1 requerido')
  source=pathlib.Path(a.input);content=json.loads(source.read_text());intake=json.loads((work/'intake.json').read_text())
  content['mode']=intake['mode'];content['deckType']=intake['type'];content['thesis']={'title':intake.get('thesis',content.get('title','')),'pillars':intake.get('pillars',[])}
  if (work/'spec.json').exists():p.error('Spec existente: preserve y cree successor')
  save(work/'spec.json',content)
  titles=[section['title'] for section in content.get('sections',[])]
  save(work/'story-review.json',{'titles':titles,'facts':content.get('facts',[]),'mode':intake['mode'],'arcRecommendation':['AS-IS','TO-BE','Estrategia','Migración','Evolución','Decisiones'] if intake['mode']=='tecnico' else ['Problema','Promesa','Prueba','Propuesta','Decisión'],'state':'SPEC_DRAFT'})
  print('spec: DRAFT · revisar títulos, hechos y escenas; aprobación humana pendiente');return
 if a.command=='next':
  gate=next((x for x in ('intake','spec') if not (work/(x+'-approval.json')).exists()),'build')
  print(json.dumps({'next':gate,'publicationAuthorized':False}));return
 approved('intake');approved('spec')
 if not a.out:p.error('--out directorio nuevo requerido')
 intake=json.loads((work/'intake.json').read_text())
 result=subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name('runtime.py')),'build','--kind','dynamic-commercial-decks','--edition',intake['edition'],'--input',str(work/'spec.json'),'--out',a.out])
 sys.exit(result.returncode)
if __name__=='__main__':main()
