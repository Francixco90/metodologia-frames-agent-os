import importlib.util,json,pathlib,tempfile,unittest
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
 def test_script_escape(self):
  d=r.sample('workbook');d['title']='</script><script>alert(1)</script>';self.assertNotIn('</script><script>alert(1)',r.render(d,'workbook','metodologia'))
 def test_prompt_missing_field(self):
  d=r.sample('workbook');d['sections'][0]['prompt']='{{missing}}';self.assertTrue(r.validate(d,'workbook','metodologia'))
 def test_missing_translation(self):
  d=r.sample('workbook');del d['title']['pt'];self.assertTrue(r.validate(d,'workbook','metodologia'))
 def test_color_injection(self):
  d=r.sample('workbook');d['brand']={'name':'Test','colors':{'night':'red;}</style><script>1</script>'}};self.assertTrue(r.validate(d,'workbook','white-label'))
 def test_quantity_in_title(self):
  d=r.sample('dynamic-commercial-decks');d['sections'][0]['title']['en']='Grow by 50%';self.assertTrue(r.validate(d,'dynamic-commercial-decks','metodologia'))
 def test_resolved_markdown(self):
  self.assertNotIn('{{contexto}}',r.markdown(r.sample('workbook'),'es'))
 def test_placeholder(self):
  d=r.sample('workbook');d['sections'][0]['body']='TODO';self.assertTrue(r.validate(d,'workbook','metodologia'))
 def test_output_limit(self):
  for kind in r.KINDS:self.assertLessEqual(len(r.output_plan({},kind,'metodologia')),12);self.assertEqual(len(r.output_plan({},kind,'metodologia')),len(set(r.output_plan({},kind,'metodologia'))))
if __name__=='__main__':unittest.main()
