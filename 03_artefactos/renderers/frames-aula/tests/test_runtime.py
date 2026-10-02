import copy,hashlib,importlib.util,json,pathlib,shutil,subprocess,tempfile,unittest,zipfile
P=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('runtime',P/'runtime.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class RuntimeTests(unittest.TestCase):
 def test_positive(self):
  for kind in r.KINDS:
   d=r.sample(kind)
   if kind=='dynamic-commercial-decks':d['facts']=[{'id':'f1','text':'Fixture','source':'Fixture original','confirmed':True,'sha256':'a'*64}]
   self.assertEqual(r.validate(d,kind,'metodologia'),[])
   rendered=r.render(d,kind,'metodologia');self.assertIn('RENDERED_DRAFT',rendered);self.assertNotIn('https://',rendered)
 def test_unconfirmed_fact(self):
  d=r.sample('workbook');d['facts']=[{'source':'fixture','confirmed':False,'sha256':'a'*64}];self.assertTrue(r.validate(d,'workbook','metodologia'))
 def test_unsafe_links(self):
  d=r.sample('index');d['sections'][0]['links']=[{'href':'../private'}];self.assertTrue(r.validate(d,'index','metodologia'))
 def test_brand_contrast(self):
  d=r.sample('workbook');d['brand']={'name':'Neutral','colors':{'night':'#ffffff','gold':'#eeeeee','white':'#ffffff'}};self.assertTrue(r.validate(d,'workbook','white-label'))
 def test_dark_brand_contrast_uses_rendered_surfaces(self):
  d=r.sample('workbook');d['brand']={'name':'Neutral','colors':{'night':'#767676','gold':'#334155','white':'#ffffff'}}
  self.assertEqual(r.validate(d,'workbook','white-label'),[])
  d['theme']='dark';self.assertIn('dark canvas',repr(r.validate(d,'workbook','white-label')))
  d['brand']['colors']['night']='#152238';self.assertEqual(r.validate(d,'workbook','white-label'),[])
 def test_script_escape(self):
  d=r.sample('workbook');d['title']='</script><script>alert(1)</script>';self.assertNotIn('</script><script>alert(1)',r.render(d,'workbook','metodologia'))
 def test_prompt_missing_field(self):
  d=r.sample('workbook');d['sections'][0]['prompt']='{{missing}}';self.assertTrue(r.validate(d,'workbook','metodologia'))
  d=r.sample('workbook');d['sections'][1]['prompt']['en']='Preserve {{missing_en}} exactly';self.assertIn('/en',repr(r.validate(d,'workbook','metodologia')))
 def test_missing_translation(self):
  d=r.sample('workbook');del d['title']['pt'];self.assertTrue(r.validate(d,'workbook','metodologia'))
 def test_color_injection(self):
  d=r.sample('workbook');d['brand']={'name':'Test','colors':{'night':'red;}</style><script>1</script>'}};self.assertTrue(r.validate(d,'workbook','white-label'))
 def test_quantity_in_title(self):
  d=r.sample('dynamic-commercial-decks');d['sections'][0]['title']['en']='Grow by 50%';self.assertTrue(r.validate(d,'dynamic-commercial-decks','metodologia'))
 def test_resolved_markdown(self):
  self.assertNotIn('{{contexto}}',r.markdown(r.sample('workbook'),'es'))
  d=r.sample('workbook');d['sections'][1]['fields'][0]['default']=0;self.assertIn('para 0.',r.default_prompt(d['sections'][1],'es'));self.assertIn('para 0.',r.markdown(d,'es'))
 def test_placeholder(self):
  d=r.sample('workbook');d['sections'][0]['body']='TODO';self.assertTrue(r.validate(d,'workbook','metodologia'))
  d['sections'][0]['body']='Todo cambio empieza con un objetivo.';self.assertEqual(r.validate(d,'workbook','metodologia'),[])
 def test_output_limit(self):
  for kind in r.KINDS:self.assertLessEqual(len(r.output_plan({},kind,'metodologia')),12);self.assertEqual(len(r.output_plan({},kind,'metodologia')),len(set(r.output_plan({},kind,'metodologia'))))
 def test_semantic_components_survive_markdown(self):
  d=r.sample('workbook');s=d['sections'][0]
  s.update(table={'headers':['Dominio','Resultado'],'rows':[['Compras','Revisión exacta']]},matrix={'headers':['Riesgo','Control'],'rows':[['Dato','Confirmar fuente']]},cols=[{'title':'Columna conservada','items':['Doce dominios']}],cards=[{'title':'Tarjeta conservada','body':'Práctica concreta'}],metrics=[{'label':'Estado','value':'Verificado','detail':'Sin cifras inventadas'}],badges=[{'label':'Control visible'}],tabs=[{'title':'Opciones','body':'Comparar evidencia'}],accordion=[{'title':'Referencia','body':'Sin pérdida'}],checkpoints=[{'question':'Pregunta literal','answer':'Respuesta literal','criterion':'Evidencia concreta'}],references=[{'title':'Fuente concreta','source':'registro original','sha256':'c'*64}],demonstration='Demostración conservada',practice='Práctica conservada',reflection='Reflexión conservada',transfer='Transferencia conservada')
  self.assertEqual(r.validate(d,'workbook','metodologia'),[])
  md=r.markdown(d,'es')
  for content in ('Dominio','Compras','Confirmar fuente','Doce dominios','Práctica concreta','Sin cifras inventadas','Comparar evidencia','Sin pérdida','Respuesta literal','registro original','Demostración conservada','Transferencia conservada'):
   self.assertIn(content,md)
 def test_unknown_fields_and_scenes_block_without_loss(self):
  for key,value in [('tabl',{}),('scene','unknown-semantic-scene')]:
   d=r.sample('workbook');d['sections'][0][key]=value;errors=r.validate(d,'workbook','metodologia');self.assertTrue(errors);self.assertIn(key,repr(errors))
  d=r.sample('workbook');d['sections'][0]['table']={'headers':['Uno'],'rows':[['Uno','Dos']]};self.assertTrue(r.validate(d,'workbook','metodologia'))
  d=r.sample('workbook');d['sections'][0]['table']={'headers':['Uno'],'rows':[[{'customA':'A survives','customB':'B lost'}]]};self.assertIn('rows[0][0]',repr(r.validate(d,'workbook','metodologia')))
  d=r.sample('workbook');d['objectives']=[{'customA':'A','customB':'B'}];self.assertIn('objectives[0]',repr(r.validate(d,'workbook','metodologia')))
  d=r.sample('workbook');d['facts']=[{'text':{'customA':'A','customB':'B'},'source':'Fuente','confirmed':True,'sha256':'a'*64}];self.assertIn('facts[0].text',repr(r.validate(d,'workbook','metodologia')))
  d=r.sample('immersive-class');d['training']={'runOfShow':[{'sectionId':'contexto','minutes':5,'notes':{'customA':'A','customB':'B'}}]};self.assertIn('runOfShow[0].notes',repr(r.validate(d,'immersive-class','metodologia')))
 def test_authoring_budget_preserves_historical_documents(self):
  d=r.sample('dynamic-commercial-decks');d['sections']=[dict(d['sections'][0],id='slide-'+str(i)) for i in range(20)]
  self.assertEqual(r.validate(d,'dynamic-commercial-decks','metodologia'),[])
  d['authoringPolicy']={'origin':'historical'};self.assertEqual(r.validate(d,'dynamic-commercial-decks','metodologia'),[])
  d['authoringPolicy']={'origin':'new'};self.assertIn('exceden 8',repr(r.validate(d,'dynamic-commercial-decks','metodologia')))
  self.assertEqual(r.validate(d,'workbook','metodologia'),[])
  d['authoringPolicy'].update(maxSlides=20,explicitBrief='Reproducir veinte láminas aprobadas en el brief');self.assertEqual(r.validate(d,'dynamic-commercial-decks','metodologia'),[])
  del d['authoringPolicy']['explicitBrief'];self.assertTrue(r.validate(d,'dynamic-commercial-decks','metodologia'))
 def test_training_schedule_and_audience_contract(self):
  d=r.sample('immersive-class');d['training']={'durationMinutes':10,'runOfShow':[{'sectionId':'contexto','minutes':5,'notes':'Solo facilitador'},{'sectionId':'practica','minutes':5}]};d['sections'][0].update(facilitatorNotes='Solo facilitador',checkpoints=[{'question':'Pregunta','answer':'Respuesta revelable'}])
  self.assertEqual(r.validate(d,'immersive-class','metodologia'),[])
  audience=r.audience_content(d);self.assertNotIn('Solo facilitador',json.dumps(audience));self.assertIn('Respuesta revelable',json.dumps(audience))
  d['training']['durationMinutes']=9;self.assertTrue(r.validate(d,'immersive-class','metodologia'))
 def test_asset_evidence_and_only_selected_assets(self):
  d=r.sample('immersive-class');assets,context=r.build_context(d,'metodologia')
  if not (P/'assets/core/catalog.json').exists():self.skipTest('Optional core not projected')
  self.assertEqual({item['id'] for item in context['assetEvidence']},{'flow','steps'})
  self.assertEqual(context['engineVersion'],'1.1.0');self.assertTrue(all(len(item['sha256'])==64 for item in context['buildDependencies']))
  self.assertTrue(any(key.endswith(':mobile') for key in assets));self.assertFalse(any('decision-options' in key for key in assets))
 def test_asset_tampering_is_rejected(self):
  if not (P/'assets/core/catalog.json').exists():self.skipTest('Optional core not projected')
  with tempfile.TemporaryDirectory() as temporary:
   root=pathlib.Path(temporary).resolve();shutil.copytree(P/'assets/core',root/'assets/core');path=root/'assets/core/scenes/flow.json';path.write_bytes(path.read_bytes()+b' ')
   previous=r.ROOT
   try:r.ROOT=root;self.assertIn('ASSET_HASH_MISMATCH',repr(r.validate(r.sample('workbook'),'workbook','metodologia')))
   finally:r.ROOT=previous
 def test_scene_wrap_and_invalid_slot(self):
  if not (P/'assets/core/scenes/flow.json').exists():self.skipTest('Optional core not projected')
  scene=json.loads((P/'assets/core/scenes/flow.json').read_text());palette=r.effective_colors({},'metodologia')
  svg=r.scene_svg(scene,{'a':'Una decisión con evidencia'},'es',palette);self.assertIn('<tspan',svg);self.assertIn('decisión',svg)
  with self.assertRaisesRegex(ValueError,'SCENE_PARAM_UNKNOWN'):r.scene_svg(scene,{'missing':'No perdido'},'es',palette)
  with self.assertRaisesRegex(ValueError,'SCENE_TEXT_BUDGET'):r.scene_svg(scene,{'a':'X'*33},'es',palette)
 def test_asset_archive_large_catalog_and_unsafe_svg(self):
  with tempfile.TemporaryDirectory() as temporary:
   root=pathlib.Path(temporary).resolve();files={f'icons/i-{i}.svg':b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>' for i in range(300)}
   manifest={'schemaVersion':'frames-aula-asset-bank-v1','version':'1.1.0','edition':'metodologia','originalOnly':True,'files':{name:hashlib.sha256(value).hexdigest() for name,value in files.items()}}
   archive=root/'bank.zip'
   with zipfile.ZipFile(archive,'w') as zipped:
    for name,value in files.items():zipped.writestr(name,value)
    zipped.writestr('manifest.json',json.dumps(manifest))
   verified,_=r.bank.verify_archive(archive,hashlib.sha256(archive.read_bytes()).hexdigest());self.assertEqual(verified['version'],'1.1.0')
   for svg in ('<svg><script>alert(1)</script></svg>','<svg><path onclick="alert(1)"/></svg>','<svg><path fill="url(https://example.org/a)"/></svg>','<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>'):
    with self.assertRaisesRegex(ValueError,'BANK_UNSAFE_SVG'):r.bank.safe_svg(svg)
 def test_migration_preserves_components_and_original(self):
  spec=importlib.util.spec_from_file_location('migration',P/'migrate.py');migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
  original={'title':'Fuente completa','slides':[{'id':'original','title':'Título','cols':[{'title':'Columna','body':'No se descarta'}],'table':{'headers':['H'],'rows':[['Valor']]} }]}
  data,report=migration.convert(original,'immersive-class');self.assertEqual(data['migrationSource'],original);self.assertEqual(data['sections'][0]['cols'],original['slides'][0]['cols']);self.assertEqual(data['sections'][0]['table'],original['slides'][0]['table']);self.assertEqual(report['losses'],[]);self.assertEqual(data['authoringPolicy']['origin'],'historical')
 def test_new_cli_is_new_authoring_and_index_links_are_material(self):
  with tempfile.TemporaryDirectory() as temporary:
   root=pathlib.Path(temporary).resolve();brief=root/'new.json';subprocess.run(['python3',str(P/'runtime.py'),'new','--kind','immersive-class','--out',str(brief)],check=True,capture_output=True);self.assertEqual(json.loads(brief.read_text())['authoringPolicy']['origin'],'new')
   companion=b'<!doctype html><title>Linked original draft</title>';(root/'workbook.html').write_bytes(companion);d=r.sample('index');d['pieces']=[{'kind':'workbook','href':'workbook.html'}];d['assetFiles']={'workbook.html':hashlib.sha256(companion).hexdigest()};brief.write_text(json.dumps(d));out=root/'output'
   result=subprocess.run(['python3',str(P/'runtime.py'),'build','--kind','index','--input',str(brief),'--out',str(out)],check=True,capture_output=True,text=True);receipt=json.loads(result.stdout);self.assertEqual((out/'workbook.html').read_bytes(),companion);self.assertEqual(receipt['outputs']['workbook.html'],d['assetFiles']['workbook.html']);self.assertIn('workbook.html',r.output_plan(d,'index','metodologia'))
   d['assetFiles']['workbook.html']='a'*64;self.assertIn('hash alterado',repr(r.validate(d,'index','metodologia',root)))
   d['assetFiles']={};d['pieces']=[{'kind':'workbook','href':'artifact.html'}];self.assertIn('reservado',repr(r.validate(d,'index','metodologia')))
if __name__=='__main__':unittest.main()
