import importlib.util, json, pathlib, tempfile, unittest, xml.etree.ElementTree as ET, zipfile
SCRIPT=pathlib.Path(__file__).with_name('build-aula-assets.py')
spec=importlib.util.spec_from_file_location('aula_assets',SCRIPT);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AssetLibraryTests(unittest.TestCase):
 def test_semantics_geometry_and_core(self):
  files,catalog=m.library()
  self.assertEqual((len(catalog['icons']),len(catalog['scenes'])),(256,160))
  self.assertEqual((sum(x['core'] for x in catalog['icons']),sum(x['core'] for x in catalog['scenes'])),(32,16))
  self.assertEqual(len({x['sha256'] for x in catalog['icons']}),256)
  geometry=set()
  for row in catalog['icons']+catalog['scenes']:
   self.assertTrue(all(row.get(k) for k in ('meaning','tags','uses','params','limits','license','source','example')))
   path=row.get('svg',row.get('path'));self.assertEqual(m.sha(files[path]),row['sha256'])
   self.assertNotIn('..',path);self.assertNotIn('https:',files[path].decode())
   if path.endswith('.svg'):
    root=ET.fromstring(files[path]);self.assertFalse(any(e.tag.endswith(('script','image','foreignObject')) for e in root.iter()))
   else:
    scene=json.loads(files[path]);self.assertEqual([s['id'] for s in scene['slots']],['title','a','b','c','d']);self.assertEqual(scene['viewBox'],[0,0,960,540])
    self.assertEqual(scene['portrait']['viewBox'],[0,0,420,740]);self.assertEqual(scene['relationships'],scene['portrait']['relationships'])
    self.assertEqual([s['id'] for s in scene['portrait']['slots']],['title','a','b','c','d'])
    self.assertTrue(all(s['attrs']['font-size']>=24 for s in scene['portrait']['shapes'] if s['tag']=='text'))
    geometry.add(m.sha(m.jsonbytes(scene['shapes'])))
  self.assertEqual(len(geometry),160)
 def test_pinned_banks_are_deterministic_and_bounded(self):
  with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
   first=m.generate(pathlib.Path(a));second=m.generate(pathlib.Path(b))
   for x,y in zip(first,second):
    self.assertEqual(x['sha256'],y['sha256']);self.assertEqual(x['galleryArchiveSha256'],y['galleryArchiveSha256'])
    self.assertLessEqual(x['files'],1024);self.assertLessEqual(x['uncompressedBytes'],30_000_000)
    with zipfile.ZipFile(pathlib.Path(a)/'public-repos'/x['repository']/x['archive']) as z:
     manifest=json.loads(z.read('manifest.json'));self.assertEqual(set(z.namelist()),set(manifest['files'])|{'manifest.json'})
     self.assertEqual(manifest['originalOnlyScope'],'icons-and-scenes');self.assertNotIn('gallery/index.html',z.namelist())
     for name,expected in manifest['files'].items():self.assertEqual(m.sha(z.read(name)),expected)
     notices=json.loads(z.read('component-notices.json'));self.assertEqual([c['license'] for c in notices['components']],['MIT','OFL-1.1','OFL-1.1'])
    gallery=pathlib.Path(a)/'public-repos'/x['repository']/'dist'/f'{x["repository"]}-{m.VERSION}-gallery.zip'
    with zipfile.ZipFile(gallery) as z:
     self.assertTrue(all(name.startswith('gallery/') for name in z.namelist()))
     self.assertEqual(len([name for name in z.namelist() if name.endswith('.svg')]),320)
if __name__=='__main__':unittest.main()
