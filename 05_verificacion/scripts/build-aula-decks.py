#!/usr/bin/env python3
"""Reproducible atomic skills from one original engine; never edits upstreams."""
import argparse, hashlib, json, pathlib, shutil, subprocess, tempfile, zipfile, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENGINE = ROOT / '03_artefactos/renderers/frames-aula'
VERSION = '1.0.3'
KINDS = ['immersive-class', 'masterclass', 'workbook', 'lean-coffee', 'playbook',
         'playbook-immersive', 'index', 'module', 'dynamic-commercial-decks']
PURPOSE = {
 'immersive-class': ('clase inmersiva o sesión presentada', 'Una idea por escena, notas del facilitador y ritmo de exposición. Diseña apertura, explicación, práctica y cierre.'),
 'masterclass': ('masterclass o fundamentos para lectura autónoma', 'La explicación debe entenderse sin presentador. Articula problema, modelo, ejemplo, comprobación y siguiente paso.'),
 'workbook': ('workbook, laboratorio o práctica guiada', 'Organiza rutas en clase y profundización. Cada prompt incluye contexto editable, instrucciones, resultado, evidencia y punto de parada; nunca promete comandos no comprobados.'),
 'lean-coffee': ('Lean Coffee o conversación de cierre', 'Define preguntas, duración y revelado para facilitar discusión. El temporizador controla la conversación y no evalúa al participante.'),
 'playbook': ('playbook o referencia de adopción', 'Convierte el método en prácticas: cuándo, prerrequisitos, pasos, evidencia, responsable y decisión. Diferencia fuente y recomendación.'),
 'playbook-immersive': ('playbook inmersivo', 'Usa el mismo contenido que el playbook legible. El movimiento acompaña la lectura; conserva la versión imprimible y los prompts exactos.'),
 'index': ('índice o landing de un módulo', 'Ordena solo piezas existentes por propósito y secuencia. Ningún enlace puede apuntar a un archivo ausente.'),
 'module': ('kit completo, taller completo o módulo formativo', 'Coordina fundamentos, sesión presentada, práctica, conversación y referencia. Construye las piezas y su índice desde el brief canónico, con objetivos y criterios coherentes.'),
 'dynamic-commercial-decks': ('deck dinámico, prospección, defensa, keynote o webinar', 'Confirma audiencia, problema, decisión buscada y hechos. Redacta títulos que narren el argumento al leerse seguidos; una escena explica cada idea, cifras estáticas con fuente y límites. Diferencia presentador y audiencia.'),
}

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, text):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(text, encoding='utf-8')
def jsonwrite(path, value): write(path, json.dumps(value, ensure_ascii=False, indent=2)+'\n')
def archive(directory, dest):
 dest.parent.mkdir(parents=True, exist_ok=True)
 with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as z:
  for path in sorted(directory.rglob('*')):
   if path.is_file():
    info=zipfile.ZipInfo(directory.name+'/'+path.relative_to(directory).as_posix(),(2026,10,1,0,0,0))
    info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o100644 << 16
    z.writestr(info,path.read_bytes())

def main():
 parser=argparse.ArgumentParser(); parser.add_argument('--dest', required=True); parser.add_argument('--check', action='store_true'); parser.add_argument('--no-canonical', action='store_true'); args=parser.parse_args()
 if args.check:
  with tempfile.TemporaryDirectory() as temporary:
   expected=pathlib.Path(temporary)/'package'
   subprocess.run([sys.executable,__file__,'--dest',str(expected),'--no-canonical'],check=True,stdout=subprocess.DEVNULL)
   differences=[]
   for path in sorted((expected/'skills').rglob('*')):
    if path.is_file():
     actual=pathlib.Path(args.dest).resolve()/path.relative_to(expected)
     if not actual.is_file() or actual.read_bytes()!=path.read_bytes(): differences.append(str(path.relative_to(expected)))
   if differences: raise SystemExit('Package drift: '+', '.join(differences[:30]))
   print('PASS package regeneration check; sources unchanged'); return
 dest=pathlib.Path(args.dest).resolve(); dest.mkdir(parents=True, exist_ok=True)
 entries=[]
 for edition in ('metodologia','white-label'):
  for kind in KINDS:
   slug=(edition+'-dynamic-commercial-decks' if kind==KINDS[-1] else ('metodologia-' if edition=='metodologia' else '')+'edu-'+kind)
   canonical=ROOT/'03_artefactos/skills'/slug
   if canonical.exists() and not (canonical/'package.json').exists(): raise SystemExit('Refusing to overwrite existing skill '+slug)
   existing=(canonical/'SKILL.md').read_text() if (canonical/'SKILL.md').exists() else ''
   state_match=re.search(r'  lifecycle_state: (\S+)',existing)
   scope_match=re.search(r'  execution_scope: (\S+)',existing)
   state=state_match.group(1) if state_match else 'candidate'
   scope=scope_match.group(1) if scope_match else 'local-evaluation'
   skill=dest/'skills'/slug
   skill.mkdir(parents=True,exist_ok=True)
   purpose,method=PURPOSE[kind]
   text=f'''---
name: {slug}
description: This skill should be used when el usuario solicita {purpose}. Genera HTML dinámico offline con evidencia y revisión humana.
version: {VERSION}
license: MIT
metadata:
  owner: MetodologIA
  lifecycle_state: {state}
  execution_scope: {scope}
  model_agnostic: true
---

# {purpose.capitalize()}

{method} [METODOLOGIA]

## Procedimiento

1. Recibe lenguaje normal, esquema o anexos. Conserva un brief Markdown canónico con audiencia, objetivo, fuentes, restricciones y aceptación; máximo tres preguntas bloqueantes.
2. Separa hechos, hipótesis y recomendaciones. Usa [METODOLOGIA], [PEDAGOGIA], [NEUROCIENCIA], [INFERENCIA] o [SUPUESTO] cuando corresponda; una etiqueta no sustituye evidencia. No inventes cifras ni afirmaciones científicas.
3. Prepara `input.json` con el contrato de [schema.md](references/schema.md). Idiomas explícitos y contenido completo; no traduzcas silenciosamente con fallback. Conserva el contenido al cambiar idioma.
4. Muestra el argumento y los títulos para revisión cuando el brief no los haya autorizado. La edición es `{edition}`; sus fuentes y claims no se mezclan con otras marcas.
5. Ejecuta desde la carpeta de la skill, escribiendo en un directorio nuevo fuera del paquete:

```sh
python3 engine/runtime.py check --kind {kind} --edition {edition} --input input.json --out salida
python3 engine/runtime.py plan --kind {kind} --edition {edition} --input input.json --out salida
python3 engine/runtime.py build --kind {kind} --edition {edition} --input input.json --out salida
```

6. Valida resultados materiales y hashes. Ejecuta `python3 scripts/check.py` para la integridad del paquete; los checks estáticos no acreditan UI, clipboard o movimiento. La revisión de navegador debe comprobar las acciones de [acceptance.md](references/acceptance.md).
7. Entrega HTML, Markdown, receipt y gaps. Estado máximo `RENDERED_DRAFT`; aprobación humana y publicación son decisiones separadas.

## Marca y autonomía

{'Usa exclusivamente los tokens locales autorizados de MetodologIA. No admite override de identidad.' if edition=='metodologia' else 'Usa el perfil neutral o una configuración explícita de marca con colores que pasen contraste. No incorpora logos ficticios ni identidad de MetodologIA en la pieza.'}
Cada paquete contiene su propio motor generado desde la fuente canónica. Python stdlib; sin servicios externos, assets remotos ni otros skills obligatorios. El banco público de assets es opcional y solo admite releases verificadas por checksum. [METODOLOGIA]

## Compatibilidad y límites

El motor es una implementación original, inspirada en capacidades observadas, sin reutilizar código ni assets restringidos. `frames-aula-v1` no es compatible directamente con `aula/module.json` o DCD `storyboard.json`: migra explícitamente mediante [migration.md](references/migration.md), revisa la pérdida reportada y no sobrescribas el original. Office es opcional; cualquier adaptador o plantilla ausente se declara `coverage_gap`, nunca se entrega un archivo ficticio. [METODOLOGIA]

En Frames ContentOS, `frames:assist` continúa desde el brief y la especificación aprobados mediante WorkOrder hash-bound, renderer y receipt; `frames:aula` admite ejecución contratada. En Frames OS, usa `frames start aula --request "PEDIDO"` (o `deck.immersive` para un deck comercial) y `frames next RUN`: el motor resuelve formato/edición y exige sus gates nativos de dirección, fuentes/especificación y aceptación. Cada comando pertenece a su host; las aprobaciones reales las emite la persona. Trainer mantiene su evaluación separada en cada host y nunca es fallback automático. Ver [runtime.md](references/runtime.md). [METODOLOGIA]

El CLI Python es portable y autónomo; su salida RENDERED_DRAFT no acredita gates de un run de Frames ni autoriza publicación.
'''
   if kind=='dynamic-commercial-decks':
    text+='\n## Flujo de deck: dos decisiones\n\nUsa `python3 engine/deck-workflow.py intake WORK --input intake.json --type TIPO --mode comercial|tecnico --edition '+edition+'`. Revisa audiencia, problema, decisión y tres pilares achieves/proof fuera del modo simple. Registra `approve WORK --gate intake --by ACTOR` solo después del sí humano. Prepara `spec WORK --input input.json`, muestra títulos, hechos, escenas y salidas; registra `approve WORK --gate spec --by ACTOR` después de la segunda decisión. `build WORK --out NUEVO` rechaza aprobaciones ausentes o stale. No pregunta por el modelo; el tipo explícito prevalece. [METODOLOGIA]\n\nLa arcada técnica recorre AS-IS, TO-BE, estrategia, migración, evolución y decisiones. Tablas, tabs, acordeones y detalles ayudan a profundizar sin saturar. El catálogo incluye cinco escenas originales, no las 137 de Amaris. `outputs` permite seleccionar desktop/mobile/audience/mobile-audience/markdown; si se omite, conserva las cinco salidas del contrato inicial. Office: `python3 engine/export_office.py --help`, con plantilla explícita y dependencias opcionales. [METODOLOGIA]\n'
   write(skill/'SKILL.md',text)
   (skill/'engine').mkdir(exist_ok=True)
   engine_files=('runtime.py','app.js','style.css','LICENSE','migrate.py','export_office.py','deck-workflow.py','guidelines.json','bank.py')
   for name in engine_files: shutil.copy2(ENGINE/name,skill/'engine'/name)
   shutil.copy2(ENGINE/'LICENSE',skill/'LICENSE')
   write(skill/'references/runtime.md',(ENGINE/'README.md').read_text())
   write(skill/'references/schema.md','''# Contrato de contenido\n\n`schemaVersion: frames-aula-v1`; `title`, `language`, `languages`, `objectives`, `acceptance`, `sections`. Cada sección: `id` único, `title`, `body`, `scene`, `notes` opcional, `prompt`, `fields`, `settings`, `links`, `factIds`. Strings pueden tener valores por idioma.\n\n`facts`: id, texto, source, sha256 y confirmed. La procedencia requiere evidencia externa al HTML; un hash declarado no prueba verdad. `brand` solo en marca blanca. `pieces` en índice y módulo. Ver ejemplos y runtime.md para claves ejecutables y límites. [METODOLOGIA]\n''')
   write(skill/'references/acceptance.md','''# Aceptación observable\n\n- HTML sin solicitudes de red, scripts, fuentes o imágenes externas.\n- Escritorio y móvil sin contenido truncado; teclado, foco y controles accesibles.\n- Pausa y movimiento reducido detienen las escenas.\n- Prompts copian exactamente inputs y ajustes; progreso e idioma conservan datos.\n- Proyección devuelve el foco; Markdown conserva los prompts con defaults.\n- Temporizador se inicia, pausa y reinicia; preguntas se revelan bajo control.\n- Índice enlaza archivos existentes; módulo contiene piezas completas.\n- Versión audiencia no contiene notas, incluso en el payload.\n- Hechos insuficientes, placeholders y marca inválida bloquean; no publicar sin autorización. [METODOLOGIA]\n''')
   write(skill/'references/migration.md','''# Migración explícita\n\nPreserva la entrada Aula/DCD original. Usa `python3 engine/migrate.py --input original.json --out input.json --kind KIND` si está disponible. El adaptador conserva únicamente campos reconocidos y genera un informe de pérdidas: una escena o extensión no compatible exige composición manual. No declares paridad del motor anterior, traducción ni exportación Office sin prueba material. [METODOLOGIA]\n''')
   example=json.loads((ENGINE/'examples'/f'{kind}.json').read_text())
   jsonwrite(skill/'examples/input.json',example)
   write(skill/'examples/brief.md',f'# {purpose.capitalize()}\n\nEjemplo original neutral para evaluación local. [SUPUESTO]\n\nObjetivo: practicar una decisión verificable. Audiencia: participantes de una sesión. Estado: RENDERED_DRAFT.\n')
   rendered=skill/'examples/rendered'
   if rendered.exists(): shutil.rmtree(rendered)
   with tempfile.TemporaryDirectory() as temporary:
    output=pathlib.Path(temporary).resolve()/'site'
    subprocess.run(['python3',str(skill/'engine/runtime.py'),'build','--kind',kind,'--edition',edition,'--input',str(skill/'examples/input.json'),'--out',str(output)],check=True,stdout=subprocess.DEVNULL,env={**__import__('os').environ,'PYTHONDONTWRITEBYTECODE':'1'})
    shutil.copytree(output,rendered)
   lock={name:sha(skill/'engine'/name) for name in engine_files}
   jsonwrite(skill/'engine/ENGINE.lock.json',{'version':VERSION,'source':'03_artefactos/renderers/frames-aula','files':lock,'externalFragmentsReused':False})
   write(skill/'scripts/check.py','''import hashlib,json,pathlib,subprocess,sys,tempfile\np=pathlib.Path(__file__).resolve().parents[1]\nlock=json.loads((p/'engine/ENGINE.lock.json').read_text())\nfor name,digest in lock['files'].items():\n assert hashlib.sha256((p/'engine'/name).read_bytes()).hexdigest()==digest, name\nmeta=json.loads((p/'package.json').read_text())\nwith tempfile.TemporaryDirectory() as out:\n subprocess.run([sys.executable,str(p/'engine/runtime.py'),'check','--kind',meta['kind'],'--edition',meta['edition'],'--input',str(p/'examples/input.json'),'--out',out],check=True)\nprint('package: PASS')\n''')
   write(skill/'scripts/README.md','Ejecutar `python3 scripts/check.py` desde cualquier directorio. No muta fuentes ni paquetes; verifica lock y contrato de ejemplo. [METODOLOGIA]\n')
   bank_name='metodologia-aula-assets' if edition=='metodologia' else 'white-label-aula-assets'
   bank_owner='JaviMetodologIA' if edition=='metodologia' else 'JaviMontano'
   bank_repo=dest/'public-repos'/bank_name
   if True:
    bank_sha={'metodologia':'c856eff508bcfa4bd46d28e4282358f9f2a12d4cc4b588f579869903c71eeefa','white-label':'55d6f10c4d4e35d8b4a6744426909e23b0858dd3dd6f07d0675b0cbf6bf40dc3'}[edition]
    jsonwrite(skill/'assets/bank.json',{'repository':f'https://github.com/{bank_owner}/{bank_name}','tag':'v1.0.0','archive':f'https://github.com/{bank_owner}/{bank_name}/releases/download/v1.0.0/{bank_name}-1.0.0.zip','sha256':bank_sha,'optional':True,'networkRuntimeRequired':False})
    write(skill/'references/asset-bank.md',f'# Banco opcional\n\nEl renderer funciona sin banco. Descarga la release v1.0.0 indicada en assets/bank.json; verifica el SHA256 fijado con `python3 engine/bank.py verify ARCHIVO.zip --sha256 HASH`. `install` exige --dest nuevo y jamás escribe en el paquete. El banco aporta SVG, estilos y briefs originales; no acredita la verdad de contenido ni publica piezas. [METODOLOGIA]\n')
   jsonwrite(skill/'package.json',{'name':slug,'version':VERSION,'kind':kind,'edition':edition,'license':'MIT','sourceEngineSha256':sha(ENGINE/'runtime.py')})
   write(skill/'LINEAGE.yml',f'skill_id: {slug}\nversion: {VERSION}\nlifecycle_state: {state}\nexecution_scope: {scope}\nauthority_refs: [03_artefactos/renderers/frames-aula/README.md]\nexternal_fragments_reused: false\npublication_authority: false\n')
   jsonwrite(skill/'receipts/content-license.json',{'license':'MIT','basis':'original_implementation','externalFragmentsReused':False,'restrictedReferences':'not_copied','status':'ORIGINAL_IMPLEMENTATION'})
   if (canonical/'context.md').is_file(): shutil.copy2(canonical/'context.md',skill/'context.md')
   if not args.no_canonical:
    shutil.copytree(skill,canonical,dirs_exist_ok=True)
   examples=dest/'examples'/slug
   if examples.exists(): shutil.rmtree(examples)
   shutil.copytree(rendered,examples)
   archive(skill,dest/'dist'/f'{slug}.zip')
   entries.append({'name':slug,'kind':kind,'edition':edition,'version':VERSION,'zip':f'dist/{slug}.zip','sha256':sha(dest/'dist'/f'{slug}.zip'),'bytes':(dest/'dist'/f'{slug}.zip').stat().st_size})
 jsonwrite(dest/'manifest.json',{'schemaVersion':'frames-aula-package-v1','state':'RENDERED_DRAFT','skills':entries})
 if not args.no_canonical: jsonwrite(ROOT/'04_estado/registries/skills/aula-decks-package.json',{'schemaVersion':'frames-aula-package-v1','skills':entries,'source':'05_verificacion/scripts/build-aula-decks.py'})
 for edition in ('metodologia','white-label'):
  with zipfile.ZipFile(dest/'dist'/f'{edition}-skills.zip','w',zipfile.ZIP_DEFLATED) as z:
   for e in entries:
    if e['edition']==edition:
     for path in sorted((dest/'skills'/e['name']).rglob('*')):
      if path.is_file():
       info=zipfile.ZipInfo(path.relative_to(dest/'skills').as_posix(),(2026,10,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644 << 16
       z.writestr(info,path.read_bytes())
 links=''.join(f'<li><a href="{e["zip"]}">{e["name"]}</a> · {e["bytes"]} bytes</li>' for e in entries)
 write(dest/'index.html',f'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Frames Aula · MetodologIA</title><style>body{{font:18px system-ui;max-width:1000px;margin:3rem auto;padding:1rem;line-height:1.7}}a{{color:#0a122a}}li{{padding:.6rem}}</style><h1>Frames Aula · por MetodologIA</h1><p>18 skills autónomas · piezas RENDERED_DRAFT · revisión humana pendiente.</p><ul>{links}</ul><p>Consulta manifest.json, diagnóstico y QA antes de utilizar.</p></html>')
 print(json.dumps({'skills':len(entries),'destination':str(dest),'status':'PACKAGED_RENDERED_DRAFT'}))
if __name__=='__main__': main()
