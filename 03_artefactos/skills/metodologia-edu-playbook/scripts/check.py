import hashlib,json,pathlib,subprocess,sys,tempfile
p=pathlib.Path(__file__).resolve().parents[1]
lock=json.loads((p/'engine/ENGINE.lock.json').read_text())
for name,digest in lock['files'].items():
 assert hashlib.sha256((p/'engine'/name).read_bytes()).hexdigest()==digest, name
meta=json.loads((p/'package.json').read_text())
with tempfile.TemporaryDirectory() as out:
 subprocess.run([sys.executable,str(p/'engine/runtime.py'),'check','--kind',meta['kind'],'--edition',meta['edition'],'--input',str(p/'examples/input.json'),'--out',out],check=True)
print('package: PASS')
